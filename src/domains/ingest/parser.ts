// Ingest 도메인 — parser
// HTML 파싱 + 자체 휴리스틱 검출 (바이브코딩 안티패턴·SEO·접근성)

import { parse, HTMLElement } from "node-html-parser";
import type { Finding, GovernanceLabel } from "@/types";
import { nanoid } from "nanoid";

export interface ParsedHtml {
  domNodes: number;
  domDepth: number;
  assets: {
    images: number;
    scripts: number;
    styles: number;
    fonts: number;
  };
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
  findings: Finding[];
}

export function parseHtml(html: string, sourceUrl: string): ParsedHtml {
  const root = parse(html, {
    lowerCaseTagName: true,
    comment: false,
    voidTag: { tags: ["br", "hr", "img", "input", "meta", "link"], closingSlash: false },
  });

  const allElements = root.querySelectorAll("*");
  const domNodes = allElements.length;
  const domDepth = computeMaxDepth(root, 0);
  const images = root.querySelectorAll("img");
  const scripts = root.querySelectorAll("script");
  const styles = root.querySelectorAll("style, link[rel='stylesheet']");
  const fonts = root.querySelectorAll("link[rel='preconnect'][href*='font'], link[href*='font']");

  const inlineStyleNodes = allElements.filter((el) => el.getAttribute("style"));
  const altMissingNodes = images.filter((img) => {
    const alt = img.getAttribute("alt");
    return alt === undefined || alt === null;
  });

  const scriptsContent = scripts.map((s) => s.text || "").join("\n");
  const consoleLogMatches = scriptsContent.match(/console\.(log|debug|info|warn|error)\s*\(/g) || [];

  const titleEl = root.querySelector("head title");
  const descEl = root.querySelector('head meta[name="description"]');
  const canonicalEl = root.querySelector('head link[rel="canonical"]');
  const viewportEl = root.querySelector('head meta[name="viewport"]');
  const ogImageEl = root.querySelector('head meta[property="og:image"]');

  const findings: Finding[] = [];

  // AUTO — 인라인 스타일 과다
  if (inlineStyleNodes.length >= 5) {
    findings.push({
      id: nanoid(8),
      label: "AUTO" as GovernanceLabel,
      category: "vibe-antipattern",
      severity: "warn",
      title: `인라인 스타일 ${inlineStyleNodes.length}건 검출`,
      description: `style="..." 인라인 ${inlineStyleNodes.length}건. 디자인 시스템 미준수·컴포넌트 재사용성 저하.`,
      fix: "동일 패턴 → CSS 클래스 또는 디자인 토큰 변환. 바이브코딩 프롬프트 자동 포함.",
      autoFixable: true,
    });
  }

  // AUTO — DOM 깊이 비정상
  if (domDepth >= 10) {
    findings.push({
      id: nanoid(8),
      label: "AUTO",
      category: "vibe-antipattern",
      severity: "warn",
      title: `DOM 깊이 비정상 (${domDepth}단 중첩)`,
      description: `최대 중첩 깊이 ${domDepth}단. 컴포넌트 미추출 흔적·렌더링 성능 영향.`,
      fix: "5단 이상 중첩 구조를 별도 컴포넌트로 분리 권장. 바이브코딩 프롬프트에 「컴포넌트 분리」 자동 포함.",
      autoFixable: true,
    });
  }

  // AUTO — console.log 잔존
  if (consoleLogMatches.length > 0) {
    findings.push({
      id: nanoid(8),
      label: "AUTO",
      category: "vibe-antipattern",
      severity: "bad",
      title: `console.log ${consoleLogMatches.length}건 잔존`,
      description: `프로덕션 코드에 console.log·debug·warn·error 호출 ${consoleLogMatches.length}건 잔존. 디버그 코드 미정리.`,
      fix: "모든 console 호출 제거 또는 production 환경에서 비활성화 (예: babel-plugin-transform-remove-console).",
      autoFixable: true,
    });
  }

  // AUTO — 이미지 alt 누락
  if (altMissingNodes.length > 0) {
    findings.push({
      id: nanoid(8),
      label: "AUTO",
      category: "accessibility",
      severity: "warn",
      title: `이미지 alt 속성 누락 ${altMissingNodes.length}건`,
      description: `WCAG A 기준 위배. 스크린 리더 사용자 접근 불가.`,
      fix: "모든 <img>에 alt 속성 추가. 장식 이미지는 alt=\"\" 빈 값. AI가 이미지 분석해서 자동 생성 가능.",
      autoFixable: true,
    });
  }

  // PROPOSE — viewport 누락
  if (!viewportEl) {
    findings.push({
      id: nanoid(8),
      label: "PROPOSE",
      category: "mobile",
      severity: "warn",
      title: "viewport 메타 태그 누락",
      description: "모바일 반응형 동작 안 함. <head>에 viewport 메타 추가 필요.",
      fix: `<meta name="viewport" content="width=device-width, initial-scale=1">`,
      autoFixable: true,
    });
  }

  // PROPOSE — canonical 누락
  if (!canonicalEl) {
    findings.push({
      id: nanoid(8),
      label: "PROPOSE",
      category: "seo",
      severity: "warn",
      title: "canonical URL 누락",
      description: "중복 콘텐츠 페널티 위험·검색 노출 저하 가능성.",
      fix: `<link rel="canonical" href="${sourceUrl}"> 추가. URL 정확성 사람 검증 필요.`,
      autoFixable: false,
    });
  }

  // PROPOSE — title 누락 또는 약함
  if (!titleEl || !titleEl.text || titleEl.text.length < 10) {
    findings.push({
      id: nanoid(8),
      label: "PROPOSE",
      category: "seo",
      severity: "warn",
      title: titleEl ? `title 태그 너무 짧음 (${titleEl.text?.length || 0}자)` : "title 태그 누락",
      description: "검색 결과 노출·소셜 미디어 공유 시 제목 사용 불가.",
      fix: "10~60자 사이 의미있는 title 작성. 키워드 + 브랜드 패턴 권장.",
      autoFixable: false,
    });
  }

  // PROPOSE — description 누락
  if (!descEl || !descEl.getAttribute("content")) {
    findings.push({
      id: nanoid(8),
      label: "PROPOSE",
      category: "seo",
      severity: "warn",
      title: "meta description 누락",
      description: "검색 결과 스니펫 자동 생성 = 의도 전달 약함.",
      fix: '<meta name="description" content="..."> 150~160자 내외로 추가.',
      autoFixable: false,
    });
  }

  // HUMAN_ONLY — OG 이미지 누락 (브랜드 결정)
  if (!ogImageEl) {
    findings.push({
      id: nanoid(8),
      label: "HUMAN_ONLY",
      category: "brand-copy",
      severity: "warn",
      title: "Open Graph 이미지 누락",
      description: "SNS·메신저 공유 시 미리보기 이미지 없음. 브랜드 이미지 시각 노출 약함.",
      fix: "1200x630 OG 이미지 제작 후 <meta property=\"og:image\" content=\"...\"> 추가. 디자인 방향성 = 사람 결정.",
      autoFixable: false,
    });
  }

  return {
    domNodes,
    domDepth,
    assets: {
      images: images.length,
      scripts: scripts.length,
      styles: styles.length,
      fonts: fonts.length,
    },
    inlineStyles: inlineStyleNodes.length,
    consoleLogs: consoleLogMatches.length,
    altMissing: altMissingNodes.length,
    metaTags: {
      title: titleEl?.text || null,
      description: descEl?.getAttribute("content") || null,
      canonical: canonicalEl?.getAttribute("href") || null,
      viewport: viewportEl?.getAttribute("content") || null,
      ogImage: ogImageEl?.getAttribute("content") || null,
    },
    findings,
  };
}

function computeMaxDepth(node: HTMLElement, currentDepth: number): number {
  if (!node.childNodes || node.childNodes.length === 0) {
    return currentDepth;
  }
  let max = currentDepth;
  for (const child of node.childNodes) {
    if ((child as HTMLElement).tagName) {
      const depth = computeMaxDepth(child as HTMLElement, currentDepth + 1);
      if (depth > max) max = depth;
    }
  }
  return max;
}
