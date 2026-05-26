// Lint 도메인 — 진입점
// 중복 제거 + 우선순위 정렬 + 품질 검증

import type { Finding } from "@/types";
import { dedupe } from "./deduper";
import { rankFindings } from "./ranker";

export interface LintInput {
  findings: Finding[];
}

export interface LintResult {
  findings: Finding[];
  removed: number;
  total: number;
}

export function runLint(input: LintInput): LintResult {
  const before = input.findings.length;

  // 1. 품질 검증 = 빈 fix·너무 짧은 description 제거
  const valid = input.findings.filter((f) => {
    if (!f.title || f.title.length < 3) return false;
    if (!f.description || f.description.length < 10) return false;
    if (!f.fix || f.fix.length < 3) return false;
    return true;
  });

  // 2. 중복 제거
  const deduped = dedupe(valid);

  // 3. 우선순위 정렬
  const ranked = rankFindings(deduped);

  return {
    findings: ranked,
    removed: before - ranked.length,
    total: ranked.length,
  };
}
