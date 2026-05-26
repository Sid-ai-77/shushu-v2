// Ingest 도메인 — fetcher
// 사이트 URL fetch + GitHub 저장소 fetch (옵션)

export interface FetchedSite {
  url: string;
  status: number;
  html: string;
  contentType: string | null;
  htmlBytes: number;
  fetchedAt: string;
  finalUrl: string;
}

export interface FetchedGithub {
  repo: string;
  owner: string;
  name: string;
  defaultBranch: string;
  fileCount: number;
  files: GithubFile[];
}

export interface GithubFile {
  path: string;
  size: number;
  language: string;
}

const USER_AGENT = "Mozilla/5.0 (compatible; ShushuBot/1.0; +https://shushu-v2.pages.dev)";
const MAX_HTML_BYTES = 5_000_000; // 5MB

export async function fetchSite(url: string): Promise<FetchedSite> {
  validateUrl(url);

  const httpsUrl = url.startsWith("http://") ? url.replace("http://", "https://") : url;

  const response = await fetch(httpsUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  });

  const contentType = response.headers.get("content-type");

  if (!contentType || !contentType.includes("text/html")) {
    throw new Error(`Expected HTML response, got: ${contentType || "unknown"}`);
  }

  const html = await response.text();

  if (html.length > MAX_HTML_BYTES) {
    throw new Error(`HTML too large: ${html.length} bytes (max ${MAX_HTML_BYTES})`);
  }

  return {
    url,
    status: response.status,
    html,
    contentType,
    htmlBytes: html.length,
    fetchedAt: new Date().toISOString(),
    finalUrl: response.url,
  };
}

export async function fetchGithubRepo(githubUrl: string): Promise<FetchedGithub | null> {
  const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    throw new Error("Invalid GitHub URL. Expected https://github.com/owner/repo");
  }

  const [, owner, name] = match;
  const repoFullName = `${owner}/${name.replace(/\.git$/, "")}`;

  const repoInfoResponse = await fetch(`https://api.github.com/repos/${repoFullName}`, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "application/vnd.github.v3+json",
    },
  });

  if (!repoInfoResponse.ok) {
    if (repoInfoResponse.status === 404) {
      throw new Error("GitHub repository not found or private");
    }
    if (repoInfoResponse.status === 403) {
      throw new Error("GitHub API rate limit exceeded. Try again later.");
    }
    throw new Error(`GitHub API error: ${repoInfoResponse.status}`);
  }

  const repoInfo = (await repoInfoResponse.json()) as { default_branch: string };
  const defaultBranch = repoInfo.default_branch || "main";

  const treeResponse = await fetch(
    `https://api.github.com/repos/${repoFullName}/git/trees/${defaultBranch}?recursive=1`,
    {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/vnd.github.v3+json",
      },
    },
  );

  if (!treeResponse.ok) {
    throw new Error(`GitHub tree API error: ${treeResponse.status}`);
  }

  const tree = (await treeResponse.json()) as {
    tree: { path: string; type: string; size?: number }[];
    truncated: boolean;
  };

  const interestingExtensions = [".tsx", ".jsx", ".vue", ".svelte", ".ts", ".js", ".css", ".scss"];
  const files: GithubFile[] = tree.tree
    .filter((node) => node.type === "blob")
    .filter((node) => interestingExtensions.some((ext) => node.path.endsWith(ext)))
    .slice(0, 500)
    .map((node) => ({
      path: node.path,
      size: node.size || 0,
      language: detectLanguage(node.path),
    }));

  return {
    repo: repoFullName,
    owner,
    name: name.replace(/\.git$/, ""),
    defaultBranch,
    fileCount: tree.tree.length,
    files,
  };
}

function validateUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("URL must use http or https");
  }

  // SSRF 방지
  const hostname = parsed.hostname.toLowerCase();
  const blocked = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
  ];

  if (blocked.includes(hostname)) {
    throw new Error("Local URLs are not allowed");
  }

  if (hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname.match(/^172\.(1[6-9]|2\d|3[0-1])\./)) {
    throw new Error("Private network URLs are not allowed");
  }

  if (url.length > 2048) {
    throw new Error("URL too long (max 2048)");
  }
}

function detectLanguage(path: string): string {
  if (path.endsWith(".tsx") || path.endsWith(".jsx")) return "react";
  if (path.endsWith(".vue")) return "vue";
  if (path.endsWith(".svelte")) return "svelte";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".css") || path.endsWith(".scss")) return "css";
  return "unknown";
}
