// POST /api/inspect — 검수 시작 엔드포인트
// Ingest 도메인 호출 + 결과 반환

import { nanoid } from "nanoid";
import { fetchSite, fetchGithubRepo } from "../../src/domains/ingest/fetcher";
import { parseHtml } from "../../src/domains/ingest/parser";
import {
  saveInspectionMeta,
  saveHtmlSnapshot,
  checkRateLimit,
} from "../../src/domains/ingest/storage";
import { runQuery } from "../../src/domains/query";
import { runLint } from "../../src/domains/lint";
import { captureSite } from "../../src/domains/ingest/screenshot";
import type {
  ShushuEnv,
  InspectionResult,
  InspectionRequest,
  PagesContext,
} from "../../src/types";

interface OnRequestContext {
  request: Request;
  env: ShushuEnv;
  waitUntil(promise: Promise<unknown>): void;
}

export const onRequestPost = async (ctx: OnRequestContext): Promise<Response> => {
  const { request, env } = ctx;

  try {
    const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "anonymous";

    const rateLimit = await checkRateLimit(env, ip, 10);
    if (!rateLimit.allowed) {
      return json(
        {
          error: "Rate limit exceeded. Try again in 1 hour.",
          retryAfter: 3600,
        },
        429,
        { "Retry-After": "3600" },
      );
    }

    const body = (await request.json()) as InspectionRequest;
    if (!body.url) {
      return json({ error: "url is required" }, 400);
    }

    const id = nanoid(12);
    const startedAt = new Date().toISOString();

    const result: InspectionResult = {
      id,
      url: body.url,
      githubUrl: body.githubUrl,
      startedAt,
      status: "ingesting",
      findings: [],
      meta: {},
    };

    await saveInspectionMeta(env, result);

    // Ingest 시작
    const site = await fetchSite(body.url);
    result.meta.htmlBytes = site.htmlBytes;
    result.meta.htmlSize = site.htmlBytes;

    // HTML snapshot R2 저장 (waitUntil로 비동기 처리)
    ctx.waitUntil(saveHtmlSnapshot(env, id, site.html));

    // Cloudflare Browser Rendering으로 데스크탑·모바일 캡처 (옵션 = BROWSER binding 있을 때만)
    try {
      const shots = await captureSite(env, id, body.url);
      if (shots) {
        result.meta.screenshots = {
          desktopUrl: `/api/screenshot?id=${id}&type=desktop`,
          mobileUrl: `/api/screenshot?id=${id}&type=mobile`,
          capturedAt: shots.capturedAt,
        };
      }
    } catch (err) {
      // 캡처 실패해도 검수는 계속 진행
      console.error("Screenshot capture failed:", err);
    }

    // HTML 파싱 + 자체 휴리스틱
    const parsed = parseHtml(site.html, body.url);
    result.meta.domNodes = parsed.domNodes;
    result.meta.domDepth = parsed.domDepth;
    result.meta.assets = parsed.assets;
    result.meta.inlineStyles = parsed.inlineStyles;
    result.meta.consoleLogs = parsed.consoleLogs;
    result.meta.altMissing = parsed.altMissing;
    result.findings = parsed.findings;

    // GitHub 분석 (옵션)
    if (body.githubUrl) {
      try {
        const repo = await fetchGithubRepo(body.githubUrl);
        if (repo) {
          result.meta.github = {
            repo: repo.repo,
            files: repo.fileCount,
            tsFiles: repo.files.filter((f) => f.language === "typescript" || f.language === "react").length,
            componentFiles: repo.files.filter((f) => f.path.includes("/components/") || f.path.endsWith(".tsx") || f.path.endsWith(".vue")).length,
          };
        }
      } catch (err) {
        // GitHub 실패해도 사이트 분석은 정상 반환
        result.meta.github = undefined;
      }
    }

    // Day 4~5 Query 도메인 (Gemini AI 분석)
    result.status = "querying";
    await saveInspectionMeta(env, result);

    const queryResult = await runQuery({
      env,
      url: body.url,
      html: site.html,
      heuristicSummary: {
        htmlBytes: site.htmlBytes,
        domNodes: parsed.domNodes,
        domDepth: parsed.domDepth,
        inlineStyles: parsed.inlineStyles,
        consoleLogs: parsed.consoleLogs,
        altMissing: parsed.altMissing,
        metaTags: parsed.metaTags,
      },
      githubMeta: result.meta.github,
    });

    if (queryResult.aiOk) {
      result.findings = [...result.findings, ...queryResult.findings];
    }

    // Day 6 Lint = 중복 제거 + 우선순위 정렬
    result.status = "linting";
    const lintResult = runLint({ findings: result.findings });
    result.findings = lintResult.findings;

    result.status = "done";
    result.finishedAt = new Date().toISOString();

    await saveInspectionMeta(env, result);

    return json(
      {
        ok: true,
        id,
        result,
        ai: {
          ok: queryResult.aiOk,
          error: queryResult.aiError,
          rawText: queryResult.aiRawText,
          tokensUsed: queryResult.tokensUsed,
        },
        rateLimit: { remaining: rateLimit.remaining },
      },
      200,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json(
      {
        ok: false,
        error: message,
      },
      500,
    );
  }
};

export const onRequestGet = async (): Promise<Response> => {
  return json(
    {
      ok: true,
      message: "Shushu v2 inspect API. Use POST with { url, githubUrl? }",
    },
    200,
  );
};

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      ...headers,
    },
  });
}
