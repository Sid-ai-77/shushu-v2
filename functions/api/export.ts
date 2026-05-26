// GET /api/export?id=...&format=prompt&tool=cursor
// 또는 ?format=markdown

import { loadInspectionMeta } from "../../src/domains/ingest/storage";
import { buildVibePrompt, buildMarkdownReport, type PromptTool } from "../../src/domains/export/prompt";
import type { ShushuEnv } from "../../src/types";

interface OnRequestContext {
  request: Request;
  env: ShushuEnv;
}

export const onRequestGet = async (ctx: OnRequestContext): Promise<Response> => {
  const url = new URL(ctx.request.url);
  const id = url.searchParams.get("id");
  const format = url.searchParams.get("format") || "markdown";
  const tool = (url.searchParams.get("tool") || "cursor") as PromptTool;

  if (!id) {
    return new Response(JSON.stringify({ error: "id is required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const result = await loadInspectionMeta(ctx.env, id);
  if (!result) {
    return new Response(JSON.stringify({ error: "Inspection not found or expired" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  if (format === "prompt") {
    const text = buildVibePrompt(result, tool);
    return new Response(text, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": `attachment; filename="shushu-${id}-${tool}.md"`,
      },
    });
  }

  if (format === "markdown") {
    const text = buildMarkdownReport(result);
    return new Response(text, {
      status: 200,
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="shushu-${id}-report.md"`,
      },
    });
  }

  return new Response(JSON.stringify({ error: "Unknown format. Use 'markdown' or 'prompt'" }), {
    status: 400,
    headers: { "content-type": "application/json" },
  });
};
