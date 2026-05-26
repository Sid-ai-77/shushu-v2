// GET /api/screenshot/:id?type=desktop|mobile
// R2에 저장된 스크린샷 PNG 반환

import type { ShushuEnv } from "../../../src/types";

interface OnRequestContext {
  request: Request;
  env: ShushuEnv;
  params: { id: string };
}

export const onRequestGet = async (ctx: OnRequestContext): Promise<Response> => {
  const url = new URL(ctx.request.url);
  const type = url.searchParams.get("type") || "desktop";

  if (type !== "desktop" && type !== "mobile") {
    return new Response("Invalid type. Use 'desktop' or 'mobile'", { status: 400 });
  }

  const key = `screenshots/${ctx.params.id}-${type}.png`;
  const obj = await ctx.env.SHUSHU_R2.get(key);

  if (!obj) {
    return new Response("Screenshot not found", { status: 404 });
  }

  const buffer = await obj.arrayBuffer();
  return new Response(buffer, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=86400",
    },
  });
};
