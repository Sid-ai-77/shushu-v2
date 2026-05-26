// Export 도메인 — 바이브코딩 프롬프트 생성 (4 형식)

import type { Finding, InspectionResult } from "@/types";

export type PromptTool = "cursor" | "v0" | "lovable" | "claude-code";

export function buildVibePrompt(result: InspectionResult, tool: PromptTool): string {
  switch (tool) {
    case "cursor":
      return buildCursorPrompt(result);
    case "v0":
      return buildV0Prompt(result);
    case "lovable":
      return buildLovablePrompt(result);
    case "claude-code":
      return buildClaudeCodePrompt(result);
  }
}

function buildCursorPrompt(result: InspectionResult): string {
  const lines: string[] = [];
  lines.push(`# Shushu 검수 결과 → Cursor 작업 지시`);
  lines.push(``);
  lines.push(`검수 대상 = ${result.url}`);
  lines.push(`발견 = ${result.findings.length}건`);
  lines.push(``);
  lines.push(`## 자동 수정 (AUTO·즉시 적용 가능)`);
  const autoItems = result.findings.filter((f) => f.label === "AUTO");
  if (autoItems.length === 0) lines.push(`(해당 없음)`);
  autoItems.forEach((f, i) => {
    lines.push(``);
    lines.push(`### ${i + 1}. ${f.title}`);
    lines.push(`**문제** = ${f.description}`);
    lines.push(`**수정** = ${f.fix}`);
  });
  lines.push(``);
  lines.push(`## 제안 (PROPOSE·검토 후 적용)`);
  const proposeItems = result.findings.filter((f) => f.label === "PROPOSE");
  if (proposeItems.length === 0) lines.push(`(해당 없음)`);
  proposeItems.forEach((f, i) => {
    lines.push(``);
    lines.push(`### ${i + 1}. ${f.title}`);
    lines.push(`**문제** = ${f.description}`);
    lines.push(`**제안** = ${f.fix}`);
  });
  lines.push(``);
  lines.push(`## 사람이 결정 (HUMAN ONLY·자동 X)`);
  const humanItems = result.findings.filter((f) => f.label === "HUMAN_ONLY");
  if (humanItems.length === 0) lines.push(`(해당 없음)`);
  humanItems.forEach((f, i) => {
    lines.push(``);
    lines.push(`### ${i + 1}. ${f.title}`);
    lines.push(`**고려 사항** = ${f.description}`);
    lines.push(`**참고 옵션** = ${f.fix}`);
  });
  lines.push(``);
  lines.push(`---`);
  lines.push(`Cursor에서 적용 = 위 AUTO 항목부터 차례로 적용·PROPOSE는 diff 검토 후 적용·HUMAN ONLY는 직접 결정.`);
  return lines.join("\n");
}

function buildV0Prompt(result: InspectionResult): string {
  const lines: string[] = [];
  lines.push(`Improve this Next.js + Tailwind component based on Shushu inspection:`);
  lines.push(``);
  lines.push(`URL inspected: ${result.url}`);
  lines.push(``);
  lines.push(`Issues to fix:`);
  result.findings.forEach((f, i) => {
    const label = f.label === "AUTO" ? "[AUTO]" : f.label === "PROPOSE" ? "[REVIEW]" : "[MANUAL]";
    lines.push(`${i + 1}. ${label} ${f.title} — ${f.fix}`);
  });
  lines.push(``);
  lines.push(`Priority: AUTO first, REVIEW after design check, MANUAL with user input.`);
  return lines.join("\n");
}

function buildLovablePrompt(result: InspectionResult): string {
  const lines: string[] = [];
  lines.push(`Hi Lovable, please update the project based on Shushu's website inspection:`);
  lines.push(``);
  lines.push(`Site: ${result.url}`);
  lines.push(``);
  lines.push(`Critical fixes (apply directly):`);
  result.findings
    .filter((f) => f.label === "AUTO")
    .forEach((f, i) => lines.push(`${i + 1}. ${f.title} — ${f.fix}`));
  lines.push(``);
  lines.push(`Suggestions (ask user before applying):`);
  result.findings
    .filter((f) => f.label === "PROPOSE")
    .forEach((f, i) => lines.push(`${i + 1}. ${f.title} — ${f.fix}`));
  lines.push(``);
  lines.push(`Manual decisions (do not apply automatically):`);
  result.findings
    .filter((f) => f.label === "HUMAN_ONLY")
    .forEach((f, i) => lines.push(`${i + 1}. ${f.title}`));
  return lines.join("\n");
}

function buildClaudeCodePrompt(result: InspectionResult): string {
  const lines: string[] = [];
  lines.push(`Claude Code task: refactor based on Shushu inspection of ${result.url}`);
  lines.push(``);
  lines.push(`## AUTO findings (apply with minimal review)`);
  result.findings
    .filter((f) => f.label === "AUTO")
    .forEach((f, i) => {
      lines.push(`${i + 1}. **${f.title}**`);
      lines.push(`   - Issue: ${f.description}`);
      lines.push(`   - Fix: ${f.fix}`);
    });
  lines.push(``);
  lines.push(`## PROPOSE findings (review diff before commit)`);
  result.findings
    .filter((f) => f.label === "PROPOSE")
    .forEach((f, i) => {
      lines.push(`${i + 1}. **${f.title}**`);
      lines.push(`   - Issue: ${f.description}`);
      lines.push(`   - Suggested: ${f.fix}`);
    });
  lines.push(``);
  lines.push(`## HUMAN_ONLY findings (ask user, do not auto-apply)`);
  result.findings
    .filter((f) => f.label === "HUMAN_ONLY")
    .forEach((f, i) => {
      lines.push(`${i + 1}. **${f.title}** — ${f.description}`);
    });
  lines.push(``);
  lines.push(`Constraints:`);
  lines.push(`- Follow project's existing code style and tsconfig paths`);
  lines.push(`- Run tests after each AUTO fix if test suite exists`);
  lines.push(`- Commit each finding separately for easy revert`);
  return lines.join("\n");
}

export function buildMarkdownReport(result: InspectionResult): string {
  const lines: string[] = [];
  lines.push(`# Shushu 검수 리포트`);
  lines.push(``);
  lines.push(`**검수 대상** = ${result.url}`);
  lines.push(`**검수 ID** = ${result.id}`);
  lines.push(`**시작** = ${result.startedAt}`);
  lines.push(`**완료** = ${result.finishedAt || "(진행 중)"}`);
  lines.push(`**상태** = ${result.status}`);
  lines.push(``);
  if (result.githubUrl) {
    lines.push(`**GitHub** = ${result.githubUrl}`);
    lines.push(``);
  }
  lines.push(`## 검수 메타`);
  lines.push(`- HTML = ${result.meta.htmlBytes || 0} bytes`);
  lines.push(`- DOM 노드 = ${result.meta.domNodes || 0}`);
  lines.push(`- DOM 깊이 = ${result.meta.domDepth || 0}단`);
  lines.push(`- 인라인 스타일 = ${result.meta.inlineStyles || 0}건`);
  lines.push(`- console.log = ${result.meta.consoleLogs || 0}건`);
  lines.push(`- 이미지 alt 누락 = ${result.meta.altMissing || 0}건`);
  lines.push(``);

  const byLabel = {
    AUTO: result.findings.filter((f) => f.label === "AUTO"),
    PROPOSE: result.findings.filter((f) => f.label === "PROPOSE"),
    HUMAN_ONLY: result.findings.filter((f) => f.label === "HUMAN_ONLY"),
  };

  lines.push(`## 발견 요약`);
  lines.push(`- AUTO (자동 수정) = ${byLabel.AUTO.length}건`);
  lines.push(`- PROPOSE (검토 후 적용) = ${byLabel.PROPOSE.length}건`);
  lines.push(`- HUMAN ONLY (사람 결정) = ${byLabel.HUMAN_ONLY.length}건`);
  lines.push(`- 합계 = ${result.findings.length}건`);
  lines.push(``);

  for (const [label, items] of Object.entries(byLabel)) {
    if (items.length === 0) continue;
    lines.push(`---`);
    lines.push(`## ${label} (${items.length}건)`);
    lines.push(``);
    items.forEach((f, i) => {
      lines.push(`### ${i + 1}. ${f.title}`);
      lines.push(`- **카테고리** = ${f.category}`);
      lines.push(`- **심각도** = ${f.severity}`);
      lines.push(`- **설명** = ${f.description}`);
      lines.push(`- **수정** = ${f.fix}`);
      lines.push(`- **자동 수정 가능** = ${f.autoFixable ? "예" : "아니오"}`);
      lines.push(``);
    });
  }

  lines.push(`---`);
  lines.push(`Generated by Shushu v2 · https://shushu-v2.pages.dev`);
  return lines.join("\n");
}
