// Ingest 도메인 — sitemap & page discovery
// HTML 파싱 결과에서 주요 페이지 후보 추정·우선순위 선정

import { parse } from "node-html-parser";

export interface PageCandidate {
  url: string;
  scenario: string;
  priority: number;
  source: "nav" | "hero-cta" | "footer" | "anchor";
}

const SCENARIO_PATTERNS: { id: string; patterns: RegExp[]; priority: number }[] = [
  { id: "signup", patterns: [/sign[\s_-]?up/i, /register/i, /가입/, /등록/, /create.*account/i], priority: 10 },
  { id: "login", patterns: [/log[\s_-]?in/i, /sign[\s_-]?in/i, /로그인/, /sign-in/i], priority: 9 },
  { id: "pricing", patterns: [/pric/i, /plan/i, /가격/, /요금/, /구독/], priority: 8 },
  { id: "search", patterns: [/search/i, /검색/, /find/i], priority: 7 },
  { id: "contact", patterns: [/contact/i, /문의/, /support/i, /고객/], priority: 7 },
  { id: "checkout", patterns: [/checkout/i, /cart/i, /결제/, /주문/, /pay/i], priority: 9 },
  { id: "about", patterns: [/about/i, /소개/, /회사/], priority: 4 },
  { id: "blog", patterns: [/blog/i, /news/i, /article/i, /소식/], priority: 3 },
  { id: "product", patterns: [/product/i, /service/i, /제품/, /서비스/], priority: 6 },
  { id: "docs", patterns: [/docs?/i, /guide/i, /help/i, /가이드/, /도움말/], priority: 4 },
];

export function discoverPages(html: string, baseUrl: string): PageCandidate[] {
  const root = parse(html, { lowerCaseTagName: true, comment: false });
  const base = new URL(baseUrl);
  const candidates = new Map<string, PageCandidate>();

  const anchors = root.querySelectorAll("a[href]");

  for (const a of anchors) {
    const href = a.getAttribute("href");
    if (!href) continue;

    let absoluteUrl: URL;
    try {
      absoluteUrl = new URL(href, baseUrl);
    } catch {
      continue;
    }

    // 같은 도메인만
    if (absoluteUrl.hostname !== base.hostname) continue;

    // 앵커 링크 skip
    if (absoluteUrl.pathname === base.pathname && !absoluteUrl.search) continue;

    // mailto·tel·javascript skip
    if (!["http:", "https:"].includes(absoluteUrl.protocol)) continue;

    const cleanUrl = absoluteUrl.toString().replace(/#.*$/, "");
    if (candidates.has(cleanUrl)) continue;

    const text = (a.text || "").trim().toLowerCase();
    const pathname = absoluteUrl.pathname.toLowerCase();
    const combined = `${text} ${pathname}`;

    let bestScenario = "other";
    let bestPriority = 1;

    for (const pattern of SCENARIO_PATTERNS) {
      if (pattern.patterns.some((p) => p.test(combined))) {
        if (pattern.priority > bestPriority) {
          bestPriority = pattern.priority;
          bestScenario = pattern.id;
        }
      }
    }

    if (bestScenario === "other" && pathname === "/") continue;
    if (bestScenario === "other" && pathname.length < 2) continue;

    // 컨텍스트 (nav·hero·footer 등) 추정
    let source: PageCandidate["source"] = "anchor";
    let parent = a.parentNode;
    let depth = 0;
    while (parent && depth < 8) {
      const tag = (parent as { tagName?: string }).tagName?.toLowerCase();
      const cls = ((parent as { classList?: { contains: (c: string) => boolean } }).classList);
      if (tag === "nav" || tag === "header") {
        source = "nav";
        break;
      }
      if (tag === "footer") {
        source = "footer";
        break;
      }
      if (cls && (cls.contains?.("hero") || cls.contains?.("cta"))) {
        source = "hero-cta";
        break;
      }
      parent = (parent as { parentNode?: unknown }).parentNode as typeof parent;
      depth += 1;
    }

    candidates.set(cleanUrl, {
      url: cleanUrl,
      scenario: bestScenario,
      priority: bestPriority + (source === "nav" || source === "hero-cta" ? 2 : 0),
      source,
    });
  }

  return Array.from(candidates.values())
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 8);
}
