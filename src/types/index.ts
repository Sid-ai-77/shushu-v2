// Shushu v2 — 공용 타입

export type GovernanceLabel = "AUTO" | "PROPOSE" | "HUMAN_ONLY";

export type FindingSeverity = "good" | "warn" | "bad";

export type FindingCategory =
  | "vibe-antipattern"
  | "performance"
  | "seo"
  | "accessibility"
  | "ux"
  | "design-consistency"
  | "mobile"
  | "form"
  | "brand-copy"
  | "security";

export interface Finding {
  id: string;
  label: GovernanceLabel;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
  fix: string;
  autoFixable: boolean;
  selectors?: string[];
}

export interface InspectionRequest {
  url: string;
  githubUrl?: string;
  scenarios?: string[];
}

export interface InspectionMeta {
  htmlSize?: number;
  htmlBytes?: number;
  domNodes?: number;
  domDepth?: number;
  assets?: { images: number; scripts: number; styles: number; fonts: number };
  inlineStyles?: number;
  consoleLogs?: number;
  altMissing?: number;
  github?: {
    repo: string;
    files: number;
    tsFiles: number;
    componentFiles: number;
  };
  screenshots?: {
    desktopUrl: string;
    mobileUrl: string;
    capturedAt: string;
  };
  scenarios?: ScenarioResult[];
}

export interface ScenarioResult {
  id: string;
  scenario: string;
  url: string;
  source: string;
  priority: number;
  desktopUrl: string | null;
  mobileUrl: string | null;
  httpStatus: number | null;
  consoleErrors: string[];
  networkErrors: { url: string; status: number }[];
}

export interface InspectionResult {
  id: string;
  url: string;
  githubUrl?: string;
  startedAt: string;
  finishedAt?: string;
  status: "pending" | "ingesting" | "querying" | "linting" | "done" | "error";
  findings: Finding[];
  meta: InspectionMeta;
  error?: string;
}

export interface ExportOptions {
  format: "pdf" | "prompt";
  promptTool?: "cursor" | "v0" | "lovable" | "claude-code";
}

// Cloudflare Pages Functions 바인딩 (env)
export interface ShushuEnv {
  SHUSHU_KV: KVNamespace;
  SHUSHU_R2: R2Bucket;
  GEMINI_API_KEY: string;
  // Browser Rendering REST API (옵션·있으면 캡처 활성)
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
}

// Cloudflare 타입 (minimal·@cloudflare/workers-types 없이 사용 가능)
export interface KVNamespace {
  get(key: string, type?: "text" | "json"): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number }): Promise<{ keys: { name: string }[] }>;
}

export interface R2Bucket {
  put(key: string, value: string | ArrayBuffer | Uint8Array): Promise<R2Object>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number }): Promise<{ objects: { key: string }[] }>;
}

export interface R2Object {
  key: string;
  size: number;
}

export interface R2ObjectBody extends R2Object {
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface PagesContext {
  request: Request;
  env: ShushuEnv;
  params: Record<string, string>;
  waitUntil(promise: Promise<unknown>): void;
}
