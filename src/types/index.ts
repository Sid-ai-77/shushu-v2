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

export interface InspectionResult {
  id: string;
  url: string;
  githubUrl?: string;
  startedAt: string;
  finishedAt?: string;
  status: "pending" | "ingesting" | "querying" | "linting" | "done" | "error";
  findings: Finding[];
  meta: {
    htmlSize?: number;
    domNodes?: number;
    domDepth?: number;
    assets?: number;
  };
  error?: string;
}

export interface ExportOptions {
  format: "pdf" | "prompt";
  promptTool?: "cursor" | "v0" | "lovable" | "claude-code";
}
