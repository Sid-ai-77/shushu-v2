// Query 도메인 — 진입점
// 자체 휴리스틱 + Gemini AI 통합

import type { Finding, ShushuEnv } from "@/types";
import { nanoid } from "nanoid";
import { callGemini, trimHtmlForGemini } from "./gemini";
import {
  buildGeminiPrompt,
  convertGeminiItemsToFindings,
  GEMINI_RESPONSE_SCHEMA,
  GEMINI_SYSTEM_INSTRUCTION,
  type GeminiFindingItem,
} from "./scenarios";

export interface RunQueryInput {
  env: ShushuEnv;
  url: string;
  html: string;
  heuristicSummary: {
    htmlBytes: number;
    domNodes: number;
    domDepth: number;
    inlineStyles: number;
    consoleLogs: number;
    altMissing: number;
    metaTags: {
      title: string | null;
      description: string | null;
      canonical: string | null;
      viewport: string | null;
      ogImage: string | null;
    };
  };
  githubMeta?: {
    repo: string;
    files: number;
    tsFiles: number;
    componentFiles: number;
  };
}

export interface RunQueryResult {
  findings: Finding[];
  aiOk: boolean;
  aiError?: string;
  aiRawText?: string;
  tokensUsed?: number;
}

export async function runQuery(input: RunQueryInput): Promise<RunQueryResult> {
  if (!input.env.GEMINI_API_KEY) {
    return {
      findings: [],
      aiOk: false,
      aiError: "GEMINI_API_KEY not configured",
    };
  }

  const trimmedHtml = trimHtmlForGemini(input.html);
  const prompt = buildGeminiPrompt({
    url: input.url,
    trimmedHtml,
    heuristicSummary: input.heuristicSummary,
    githubMeta: input.githubMeta,
  });

  const result = await callGemini<GeminiFindingItem[]>(prompt, {
    apiKey: input.env.GEMINI_API_KEY,
    systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
    responseSchema: GEMINI_RESPONSE_SCHEMA,
    temperature: 0.3,
    maxOutputTokens: 8192,
  });

  if (!result.ok || !result.data) {
    return {
      findings: [],
      aiOk: false,
      aiError: result.error,
      aiRawText: result.rawText?.slice(0, 800),
      tokensUsed: result.tokensUsed,
    };
  }

  const findings = convertGeminiItemsToFindings(result.data, () => nanoid(8));

  return {
    findings,
    aiOk: true,
    tokensUsed: result.tokensUsed,
  };
}
