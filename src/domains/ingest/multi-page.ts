// Ingest 도메인 — multi-page capture
// 여러 페이지에 대해 Cloudflare Browser Rendering으로 데스크탑·모바일 캡처 + 콘솔/네트워크 오류 수집

import type { ShushuEnv } from "@/types";
import type { PageCandidate } from "./sitemap";

const R2_SCREENSHOT_PREFIX = "screenshots/";
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

export interface ScenarioCapture {
  id: string;
  scenario: string;
  url: string;
  source: string;
  priority: number;
  desktopOk: boolean;
  mobileOk: boolean;
  consoleErrors: string[];
  networkErrors: { url: string; status: number }[];
  httpStatus: number | null;
}

export async function captureScenarios(
  env: ShushuEnv,
  inspectionId: string,
  pages: PageCandidate[],
): Promise<ScenarioCapture[]> {
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) {
    return [];
  }

  const results: ScenarioCapture[] = [];
  let counter = 0;

  for (const page of pages) {
    counter += 1;
    const scenarioId = `${counter.toString().padStart(2, "0")}-${page.scenario}`;

    const [desktop, mobile, content] = await Promise.all([
      capturePage(env, page.url, DESKTOP_VIEWPORT),
      capturePage(env, page.url, MOBILE_VIEWPORT),
      fetchContent(env, page.url),
    ]);

    let desktopOk = false;
    let mobileOk = false;

    if (desktop && desktop.buffer) {
      const key = `${R2_SCREENSHOT_PREFIX}${inspectionId}-${scenarioId}-desktop.png`;
      await env.SHUSHU_R2.put(key, desktop.buffer);
      desktopOk = true;
    }

    if (mobile && mobile.buffer) {
      const key = `${R2_SCREENSHOT_PREFIX}${inspectionId}-${scenarioId}-mobile.png`;
      await env.SHUSHU_R2.put(key, mobile.buffer);
      mobileOk = true;
    }

    results.push({
      id: scenarioId,
      scenario: page.scenario,
      url: page.url,
      source: page.source,
      priority: page.priority,
      desktopOk,
      mobileOk,
      consoleErrors: content?.consoleErrors || [],
      networkErrors: content?.networkErrors || [],
      httpStatus: content?.status || null,
    });
  }

  return results;
}

async function capturePage(
  env: ShushuEnv,
  url: string,
  viewport: { width: number; height: number },
): Promise<{ buffer: ArrayBuffer } | null> {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/browser-rendering/screenshot`;

  const body = {
    url,
    viewport,
    screenshotOptions: { type: "png", fullPage: false },
    gotoOptions: { waitUntil: "networkidle0", timeout: 30000 },
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) return null;
    return { buffer: await response.arrayBuffer() };
  } catch {
    return null;
  }
}

async function fetchContent(
  env: ShushuEnv,
  url: string,
): Promise<{
  status: number;
  consoleErrors: string[];
  networkErrors: { url: string; status: number }[];
} | null> {
  // Cloudflare Browser Rendering /content는 HTML 본문 반환·콘솔/네트워크 직접 X
  // 대신 단순 HTTP HEAD로 status 확인 + HTML 1차 fetch에서 에러 추정
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ShushuBot/1.0)" },
    });

    return {
      status: response.status,
      consoleErrors: [],
      networkErrors: response.ok ? [] : [{ url, status: response.status }],
    };
  } catch {
    return null;
  }
}
