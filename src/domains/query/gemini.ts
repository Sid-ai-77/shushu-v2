// Query 도메인 — Gemini API wrapper
// 직접 fetch (Cloudflare Workers 호환·SDK 미사용·가벼움)

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";

export interface GeminiCallOptions {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  responseSchema?: object;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface GeminiCallResult<T = unknown> {
  ok: boolean;
  data?: T;
  rawText?: string;
  error?: string;
  tokensUsed?: number;
}

export async function callGemini<T = unknown>(
  prompt: string,
  opts: GeminiCallOptions,
): Promise<GeminiCallResult<T>> {
  const model = opts.model || DEFAULT_MODEL;
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${opts.apiKey}`;

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxOutputTokens ?? 4096,
      ...(opts.responseSchema && {
        responseMimeType: "application/json",
        responseSchema: opts.responseSchema,
      }),
    },
  };

  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        ok: false,
        error: `Gemini API ${response.status}: ${errText.slice(0, 300)}`,
      };
    }

    const json = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { totalTokenCount?: number };
    };

    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!rawText) {
      return { ok: false, error: "Empty response from Gemini" };
    }

    // JSON 응답 파싱 시도
    if (opts.responseSchema) {
      try {
        const data = JSON.parse(rawText) as T;
        return {
          ok: true,
          data,
          rawText,
          tokensUsed: json.usageMetadata?.totalTokenCount,
        };
      } catch {
        return {
          ok: false,
          error: "Failed to parse JSON response",
          rawText,
        };
      }
    }

    return {
      ok: true,
      rawText,
      tokensUsed: json.usageMetadata?.totalTokenCount,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Gemini fetch failed: ${message}` };
  }
}

// HTML을 토큰 효율적으로 트림 (5000 토큰 ~ 20000자 이내)
export function trimHtmlForGemini(html: string, maxChars = 18000): string {
  if (html.length <= maxChars) return html;

  const headMatch = html.match(/<head[\s\S]*?<\/head>/i);
  const bodyMatch = html.match(/<body[\s\S]*<\/body>/i);

  const head = headMatch ? headMatch[0].slice(0, 3000) : "";
  const bodyContent = bodyMatch ? bodyMatch[0] : html;

  const remainingBudget = maxChars - head.length - 200;
  const bodyTrimmed = bodyContent.length > remainingBudget
    ? bodyContent.slice(0, remainingBudget) + "\n<!-- ...truncated... -->"
    : bodyContent;

  return `<!-- Shushu trimmed -->\n${head}\n${bodyTrimmed}`;
}
