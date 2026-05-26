// Query 도메인 — 12 시나리오 평가 로직 + Gemini 프롬프트 템플릿

import type { Finding, FindingCategory, GovernanceLabel, FindingSeverity } from "@/types";

export const SCENARIOS = [
  { id: "vibe-antipattern", label: "바이브코딩 안티패턴", priority: 1 },
  { id: "ux", label: "UX/UI 일관성", priority: 2 },
  { id: "performance", label: "성능 (Core Web Vitals)", priority: 3 },
  { id: "seo", label: "SEO·메타", priority: 4 },
  { id: "accessibility", label: "접근성 (WCAG)", priority: 5 },
  { id: "design-consistency", label: "디자인 일관성", priority: 6 },
  { id: "mobile", label: "모바일 반응형", priority: 7 },
  { id: "form", label: "폼·결제 흐름", priority: 8 },
  { id: "brand-copy", label: "브랜드 톤·카피", priority: 9 },
  { id: "security", label: "보안 (HTTPS·CSP)", priority: 10 },
] as const;

export const GEMINI_SYSTEM_INSTRUCTION = `당신은 Shushu라는 자동 웹사이트 검수 AI입니다.

역할
- 바이브코딩 도구 (Cursor·v0·Lovable·Claude Code·Bolt 등)로 만들어진 사이트를 검수합니다
- 코드 엉킴·지저분·베스트 프랙티스 위배·UX 문제를 찾아냅니다
- 각 발견 항목에 거버넌스 라벨을 부여합니다

거버넌스 라벨 3종
- AUTO = 기술적으로 명확·되돌리기 안전·디자인 톤 영향 없음·자동 수정 가능
- PROPOSE = 베스트 프랙티스 영향·디자인 톤 변경 가능성·사용자 승인 필요
- HUMAN_ONLY = 브랜드·카피·법적·재무·디자인 방향·사람만 결정

검수 톤
- 한국어·존댓말 X·간결한 보고체 (예: "DOM 깊이 12단·컴포넌트 미추출")
- 추측·미사여구 금지
- 발견된 사실만 기술
- fix 항목은 구체적·복사 가능한 코드 또는 명확한 액션

응답 형식 = JSON 배열 (각 항목 = Finding 객체)`;

export interface GeminiFindingItem {
  label: GovernanceLabel;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
  fix: string;
  autoFixable: boolean;
}

export const GEMINI_RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      label: { type: "STRING", enum: ["AUTO", "PROPOSE", "HUMAN_ONLY"] },
      category: {
        type: "STRING",
        enum: [
          "vibe-antipattern",
          "performance",
          "seo",
          "accessibility",
          "ux",
          "design-consistency",
          "mobile",
          "form",
          "brand-copy",
          "security",
        ],
      },
      severity: { type: "STRING", enum: ["good", "warn", "bad"] },
      title: { type: "STRING" },
      description: { type: "STRING" },
      fix: { type: "STRING" },
      autoFixable: { type: "BOOLEAN" },
    },
    required: ["label", "category", "severity", "title", "description", "fix", "autoFixable"],
  },
};

export interface BuildPromptInput {
  url: string;
  trimmedHtml: string;
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

export function buildGeminiPrompt(input: BuildPromptInput): string {
  const lines: string[] = [];

  lines.push(`# 검수 대상 사이트`);
  lines.push(`URL = ${input.url}`);
  lines.push("");

  lines.push(`# 자체 휴리스틱 1차 결과`);
  lines.push(`- HTML 크기 = ${input.heuristicSummary.htmlBytes} bytes`);
  lines.push(`- DOM 노드 = ${input.heuristicSummary.domNodes}`);
  lines.push(`- DOM 깊이 = ${input.heuristicSummary.domDepth}단`);
  lines.push(`- 인라인 스타일 = ${input.heuristicSummary.inlineStyles}건`);
  lines.push(`- console.log = ${input.heuristicSummary.consoleLogs}건`);
  lines.push(`- 이미지 alt 누락 = ${input.heuristicSummary.altMissing}건`);
  lines.push(`- title = ${input.heuristicSummary.metaTags.title || "(누락)"}`);
  lines.push(`- description = ${input.heuristicSummary.metaTags.description?.slice(0, 100) || "(누락)"}`);
  lines.push(`- canonical = ${input.heuristicSummary.metaTags.canonical || "(누락)"}`);
  lines.push(`- viewport = ${input.heuristicSummary.metaTags.viewport || "(누락)"}`);
  lines.push(`- og:image = ${input.heuristicSummary.metaTags.ogImage || "(누락)"}`);
  lines.push("");

  if (input.githubMeta) {
    lines.push(`# GitHub 저장소 메타`);
    lines.push(`- 저장소 = ${input.githubMeta.repo}`);
    lines.push(`- 전체 파일 = ${input.githubMeta.files}`);
    lines.push(`- TS/React 파일 = ${input.githubMeta.tsFiles}`);
    lines.push(`- 컴포넌트 파일 = ${input.githubMeta.componentFiles}`);
    lines.push("");
  }

  lines.push(`# HTML 본문 (trim·5000 토큰 이내)`);
  lines.push("```html");
  lines.push(input.trimmedHtml);
  lines.push("```");
  lines.push("");

  lines.push(`# 평가 시나리오 (10종)`);
  for (const s of SCENARIOS) {
    lines.push(`- ${s.id} = ${s.label}`);
  }
  lines.push("");

  lines.push(`# 출력 룰`);
  lines.push("- 위 HTML과 메타를 분석해서 최대 12건 Finding 출력");
  lines.push("- 자체 휴리스틱에서 이미 검출한 항목과 중복 X");
  lines.push("- 가장 가치 있고 구체적인 발견만");
  lines.push("- label = AUTO·PROPOSE·HUMAN_ONLY 중 정확히 1개");
  lines.push("- category = 위 10종 중 정확히 1개");
  lines.push("- fix = 복사 가능한 코드 또는 명확한 액션 (추상적 X)");
  lines.push("- autoFixable = label이 AUTO면 true·아니면 false");
  lines.push("- 응답은 JSON 배열만 (다른 텍스트 X)");

  return lines.join("\n");
}

export function convertGeminiItemsToFindings(
  items: GeminiFindingItem[],
  idGen: () => string,
): Finding[] {
  return items.map((item) => ({
    id: idGen(),
    label: item.label,
    category: item.category,
    severity: item.severity,
    title: item.title,
    description: item.description,
    fix: item.fix,
    autoFixable: item.autoFixable,
  }));
}
