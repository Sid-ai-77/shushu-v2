// Lint 도메인 — 우선순위 정렬
// 라벨 + 심각도 + 카테고리 가중치 종합 점수

import type { Finding, FindingCategory, GovernanceLabel, FindingSeverity } from "@/types";

const LABEL_WEIGHT: Record<GovernanceLabel, number> = {
  AUTO: 100,
  PROPOSE: 60,
  HUMAN_ONLY: 30,
};

const SEVERITY_WEIGHT: Record<FindingSeverity, number> = {
  bad: 30,
  warn: 15,
  good: 0,
};

const CATEGORY_WEIGHT: Record<FindingCategory, number> = {
  "vibe-antipattern": 25, // 핵심 가치
  performance: 20,
  accessibility: 18,
  seo: 15,
  ux: 14,
  mobile: 12,
  form: 12,
  security: 22,
  "design-consistency": 10,
  "brand-copy": 8,
};

export function rankFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const scoreA = computeScore(a);
    const scoreB = computeScore(b);
    if (scoreB !== scoreA) return scoreB - scoreA;
    // 동점 시 카테고리·제목 알파벳 순
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.title.localeCompare(b.title);
  });
}

function computeScore(f: Finding): number {
  const labelScore = LABEL_WEIGHT[f.label] ?? 0;
  const sevScore = SEVERITY_WEIGHT[f.severity] ?? 0;
  const catScore = CATEGORY_WEIGHT[f.category] ?? 0;
  const autoBonus = f.autoFixable ? 10 : 0;
  return labelScore + sevScore + catScore + autoBonus;
}
