// Lint 도메인 — 중복 제거
// 자체 휴리스틱 + Gemini AI 결과를 통합·중복 항목 제거

import type { Finding } from "@/types";

const SIMILARITY_THRESHOLD = 0.7;

export function dedupe(findings: Finding[]): Finding[] {
  const result: Finding[] = [];
  for (const finding of findings) {
    const dupIndex = result.findIndex((existing) => isSimilar(existing, finding));
    if (dupIndex < 0) {
      result.push(finding);
      continue;
    }
    // 중복 발견 = 더 구체적인 fix를 가진 항목 유지
    const existing = result[dupIndex];
    if (finding.fix.length > existing.fix.length) {
      result[dupIndex] = finding;
    }
  }
  return result;
}

function isSimilar(a: Finding, b: Finding): boolean {
  // 카테고리 다르면 중복 아님
  if (a.category !== b.category) return false;

  // 제목 normalized similarity
  const aTitle = normalize(a.title);
  const bTitle = normalize(b.title);

  if (aTitle === bTitle) return true;

  // 키워드 기반 매칭
  const aKeywords = extractKeywords(aTitle);
  const bKeywords = extractKeywords(bTitle);

  const intersection = aKeywords.filter((k) => bKeywords.includes(k));
  const union = new Set([...aKeywords, ...bKeywords]);

  if (union.size === 0) return false;
  const jaccard = intersection.length / union.size;
  return jaccard >= SIMILARITY_THRESHOLD;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[·.,()\[\]"'/\\:;!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "의", "이", "가", "을", "를", "에", "는", "은", "와", "과", "도", "의", "로",
    "the", "a", "an", "and", "or", "for", "of", "in", "on", "to",
    "있음", "없음", "필요", "있", "함", "됨",
  ]);
  return text
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w));
}
