// Ingest 도메인 — storage
// KV·R2 저장 헬퍼

import type { ShushuEnv, InspectionResult } from "@/types";

const KV_PREFIX = "insp:";
const R2_PREFIX = "snapshots/";
const TTL_SECONDS = 30 * 24 * 60 * 60; // 30일

export async function saveInspectionMeta(
  env: ShushuEnv,
  result: InspectionResult,
): Promise<void> {
  const key = `${KV_PREFIX}${result.id}`;
  await env.SHUSHU_KV.put(key, JSON.stringify(result), {
    expirationTtl: TTL_SECONDS,
  });
}

export async function loadInspectionMeta(
  env: ShushuEnv,
  id: string,
): Promise<InspectionResult | null> {
  const key = `${KV_PREFIX}${id}`;
  const raw = await env.SHUSHU_KV.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as InspectionResult;
  } catch {
    return null;
  }
}

export async function saveHtmlSnapshot(
  env: ShushuEnv,
  id: string,
  html: string,
): Promise<string> {
  const key = `${R2_PREFIX}${id}.html`;
  await env.SHUSHU_R2.put(key, html);
  return key;
}

export async function listInspections(
  env: ShushuEnv,
  limit = 50,
): Promise<string[]> {
  const result = await env.SHUSHU_KV.list({ prefix: KV_PREFIX, limit });
  return result.keys.map((k) => k.name.replace(KV_PREFIX, ""));
}

// Rate Limit (IP당 시간당 N건)
export async function checkRateLimit(
  env: ShushuEnv,
  ip: string,
  maxPerHour = 10,
): Promise<{ allowed: boolean; remaining: number }> {
  const hourBucket = Math.floor(Date.now() / (1000 * 60 * 60));
  const key = `rl:${ip}:${hourBucket}`;
  const current = await env.SHUSHU_KV.get(key);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= maxPerHour) {
    return { allowed: false, remaining: 0 };
  }

  await env.SHUSHU_KV.put(key, String(count + 1), {
    expirationTtl: 60 * 60 * 2, // 2시간 보관
  });

  return { allowed: true, remaining: maxPerHour - count - 1 };
}
