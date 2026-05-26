"use client";

import { useState } from "react";
import type { Finding, GovernanceLabel, InspectionResult } from "@/types";

type Step = "input" | "running" | "result";
type Filter = "all" | GovernanceLabel;

interface InspectResponse {
  ok: boolean;
  id?: string;
  result?: InspectionResult;
  ai?: { ok: boolean; error?: string; tokensUsed?: number };
  error?: string;
}

export default function Home() {
  const [step, setStep] = useState<Step>("input");
  const [url, setUrl] = useState("https://bigglz-lle-network.pages.dev");
  const [githubUrl, setGithubUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<InspectResponse | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const handleSubmit = async () => {
    setError(null);
    setStep("running");
    try {
      const res = await fetch("/api/inspect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, githubUrl: githubUrl || undefined }),
      });
      const json = (await res.json()) as InspectResponse;
      if (!res.ok || !json.ok) {
        setError(json.error || `검수 실패 (${res.status})`);
        setStep("input");
        return;
      }
      setResponse(json);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("input");
    }
  };

  const handleReset = () => {
    setStep("input");
    setResponse(null);
    setError(null);
    setFilter("all");
  };

  return (
    <>
      <Header />
      <main className="wrap">
        <Hero />
        <Steps current={step} />
        {step === "input" && (
          <InputCard
            url={url}
            setUrl={setUrl}
            githubUrl={githubUrl}
            setGithubUrl={setGithubUrl}
            error={error}
            onSubmit={handleSubmit}
          />
        )}
        {step === "running" && <RunningCard url={url} />}
        {step === "result" && response && response.result && (
          <ResultCard
            result={response.result}
            ai={response.ai}
            filter={filter}
            setFilter={setFilter}
            onReset={handleReset}
          />
        )}
      </main>
      <Footer />
      <style>{globalStyles}</style>
    </>
  );
}

function Header() {
  return (
    <header className="bar">
      <div className="bar-in">
        <div className="brand">
          <div className="mark">S</div>
          <div className="wmk">Shushu</div>
          <div className="ver">v2 · 실 검수</div>
        </div>
        <nav className="nav">
          <button className="on">검수</button>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <div className="hero">
      <div className="kicker">v2 · Ingest → Query → Lint 거버넌스</div>
      <h1>
        <em>바이브코딩</em>한 사이트
        <br />
        AI가 직접 검수하고 의견드립니다
      </h1>
      <p>
        URL 하나 또는 GitHub 저장소 주소만 주시면 AI가 분석하고 결과를 AUTO·PROPOSE·HUMAN ONLY 3단계로 라벨링해드립니다.
      </p>
    </div>
  );
}

function Steps({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "input", label: "입력" },
    { id: "running", label: "분석" },
    { id: "result", label: "결과" },
  ];
  const currentIdx = steps.findIndex((s) => s.id === current);
  return (
    <div className="steps">
      {steps.map((s, i) => {
        const state = i < currentIdx ? "done" : i === currentIdx ? "on" : "";
        return (
          <div key={s.id} className={`step-pill ${state}`}>
            <div className="n">{i + 1}</div>
            {s.label}
          </div>
        );
      })}
    </div>
  );
}

function InputCard(props: {
  url: string;
  setUrl: (v: string) => void;
  githubUrl: string;
  setGithubUrl: (v: string) => void;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <div className="card">
      <h3>검수 대상 입력</h3>
      <p className="card-sub">사이트 URL은 필수. GitHub 저장소는 옵션 (원본 코드 분석까지).</p>

      {props.error && (
        <div className="error-box">⚠ {props.error}</div>
      )}

      <div className="fld">
        <label>
          사이트 URL <span className="req">필수</span>
        </label>
        <input
          type="url"
          value={props.url}
          onChange={(e) => props.setUrl(e.target.value)}
          placeholder="https://example.com"
        />
      </div>

      <div className="fld">
        <label>
          GitHub 저장소 URL <span className="opt">옵션</span>
        </label>
        <input
          type="url"
          value={props.githubUrl}
          onChange={(e) => props.setGithubUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
        />
        <div className="hint">입력 시 원본 코드까지 분석 = DDD·코드 엉킴 정밀 검출</div>
      </div>

      <div className="action-row">
        <div className="meta-text">예상 = 약 30~90초 · 무료 (Gemini 무료 티어)</div>
        <button className="btn pink big" disabled={!props.url} onClick={props.onSubmit}>
          검수 시작 →
        </button>
      </div>
    </div>
  );
}

function RunningCard({ url }: { url: string }) {
  return (
    <div className="card">
      <h3>슈슈가 분석 중</h3>
      <p className="card-sub">{url}</p>
      <div className="run-vis">
        <div className="spinner-large" />
        <div className="run-text">
          <div className="run-step">Ingest → Query → Lint 파이프라인 진행 중</div>
          <div className="run-sub">사이트 fetch · 스크린샷 캡처 · HTML 파싱 · Gemini AI 분석 · 라벨링</div>
        </div>
      </div>
    </div>
  );
}

function ResultCard(props: {
  result: InspectionResult;
  ai?: { ok: boolean; error?: string; tokensUsed?: number };
  filter: Filter;
  setFilter: (f: Filter) => void;
  onReset: () => void;
}) {
  const { result, filter, setFilter, onReset } = props;
  const counts = {
    all: result.findings.length,
    AUTO: result.findings.filter((f) => f.label === "AUTO").length,
    PROPOSE: result.findings.filter((f) => f.label === "PROPOSE").length,
    HUMAN_ONLY: result.findings.filter((f) => f.label === "HUMAN_ONLY").length,
  };
  const filtered = filter === "all" ? result.findings : result.findings.filter((f) => f.label === filter);

  return (
    <>
      <div className="results-head">
        <h2>검수 결과 · {result.findings.length}건 발견</h2>
        <div className="total">
          {result.meta.htmlBytes ? `HTML ${(result.meta.htmlBytes / 1024).toFixed(1)}KB · ` : ""}
          DOM {result.meta.domNodes || 0}노드·{result.meta.domDepth || 0}단
          {props.ai?.ok && ` · Gemini ${props.ai.tokensUsed || 0}토큰`}
        </div>
      </div>

      {props.ai?.error && (
        <div className="warn-box">AI 분석 일부 제한 = {props.ai.error}. 자체 휴리스틱 결과만 표시.</div>
      )}

      {result.meta.screenshots && (
        <div className="screenshots-section">
          <div className="screenshots-head">
            <h3>슈슈가 본 화면</h3>
            <p>Cloudflare Browser Rendering으로 실제 사이트를 로드하고 데스크탑·모바일 양쪽 캡처했습니다.</p>
          </div>
          <div className="screenshots-grid">
            <div className="shot-card">
              <div className="shot-label">데스크탑 · 1440×900</div>
              <a href={result.meta.screenshots.desktopUrl} target="_blank" rel="noopener noreferrer">
                <img src={result.meta.screenshots.desktopUrl} alt="데스크탑 캡처" />
              </a>
            </div>
            <div className="shot-card">
              <div className="shot-label">모바일 · 390×844</div>
              <a href={result.meta.screenshots.mobileUrl} target="_blank" rel="noopener noreferrer">
                <img src={result.meta.screenshots.mobileUrl} alt="모바일 캡처" />
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="filters">
        <FilterChip on={filter === "all"} onClick={() => setFilter("all")} dot="" label="전체" cnt={counts.all} />
        <FilterChip on={filter === "AUTO"} onClick={() => setFilter("AUTO")} dot="auto" label="AUTO" cnt={counts.AUTO} />
        <FilterChip on={filter === "PROPOSE"} onClick={() => setFilter("PROPOSE")} dot="propose" label="PROPOSE" cnt={counts.PROPOSE} />
        <FilterChip on={filter === "HUMAN_ONLY"} onClick={() => setFilter("HUMAN_ONLY")} dot="human" label="HUMAN ONLY" cnt={counts.HUMAN_ONLY} />
      </div>

      {filtered.length === 0 && <div className="empty">해당 라벨에 발견된 항목이 없습니다.</div>}

      {filtered.map((f) => (
        <FindingCard key={f.id} finding={f} />
      ))}

      <ExportBar id={result.id} />

      <div className="reset-row">
        <button className="btn outline" onClick={onReset}>
          ← 새 검수
        </button>
      </div>
    </>
  );
}

function FilterChip(props: { on: boolean; onClick: () => void; dot: string; label: string; cnt: number }) {
  return (
    <div className={`filter-chip ${props.on ? "on" : ""}`} onClick={props.onClick}>
      {props.dot && <div className={`dot ${props.dot}`} />}
      {props.label}
      <span className="cnt">{props.cnt}</span>
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const badgeClass =
    finding.label === "AUTO" ? "auto" : finding.label === "PROPOSE" ? "propose" : "human";
  const labelText = finding.label === "HUMAN_ONLY" ? "HUMAN ONLY" : finding.label;
  return (
    <div className="finding">
      <div className="head">
        <div className="meta">
          <div className={`badge ${badgeClass}`}>{labelText}</div>
          <div className="cat">{finding.category}</div>
        </div>
      </div>
      <div className="ttl">{finding.title}</div>
      <div className="desc">{finding.description}</div>
      <div className="fix">
        <strong>{finding.label === "AUTO" ? "자동 수정 가능" : finding.label === "PROPOSE" ? "수정안" : "사람 결정"}</strong> · {finding.fix}
      </div>
    </div>
  );
}

function ExportBar({ id }: { id: string }) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const [promptText, setPromptText] = useState<string>("");
  const [activeTool, setActiveTool] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const tools: { tool: string; label: string }[] = [
    { tool: "cursor", label: "Cursor 프롬프트" },
    { tool: "v0", label: "v0 프롬프트" },
    { tool: "lovable", label: "Lovable 프롬프트" },
    { tool: "claude-code", label: "Claude Code 프롬프트" },
  ];

  const loadPrompt = async (tool: string) => {
    setLoading(true);
    setActiveTool(tool);
    setCopied(false);
    try {
      const res = await fetch(`${baseUrl}/api/export?id=${id}&format=prompt&tool=${tool}`);
      const text = await res.text();
      setPromptText(text);
    } catch (err) {
      setPromptText(`(불러오기 실패) ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <div className="export-bar">
        <div className="lh">
          <h3>결과 내보내기</h3>
          <p>마크다운 리포트는 다운로드·바이브코딩 프롬프트는 클릭 시 아래에 표시 (복사 편리).</p>
        </div>
        <div className="rh">
          <a className="btn" href={`${baseUrl}/api/export?id=${id}&format=markdown`} download>
            리포트 다운 ↓
          </a>
          {tools.map((t) => (
            <button
              key={t.tool}
              className={`btn ghost ${activeTool === t.tool ? "active" : ""}`}
              onClick={() => loadPrompt(t.tool)}
              disabled={loading}
            >
              {loading && activeTool === t.tool ? "불러오는 중…" : t.label}
            </button>
          ))}
        </div>
      </div>

      {promptText && (
        <div className="prompt-box">
          <div className="prompt-head">
            <div className="prompt-label">
              {tools.find((t) => t.tool === activeTool)?.label || "프롬프트"} · 복사해서 바로 붙여넣으세요
            </div>
            <button className="btn pink small" onClick={handleCopy}>
              {copied ? "복사됨 ✓" : "복사"}
            </button>
          </div>
          <pre className="prompt-pre">{promptText}</pre>
        </div>
      )}
    </>
  );
}

function Footer() {
  return (
    <footer className="foot">
      <div className="sig">Shushu v2</div>
      <div>실 검수 · 2026-05-26 · Day 7~8 UI + Export 완료</div>
    </footer>
  );
}

const globalStyles = `
.bar { position: sticky; top: 0; z-index: 60; background: rgba(250,250,249,0.85); backdrop-filter: saturate(180%) blur(14px); border-bottom: 1px solid var(--line); }
.bar-in { max-width: 1280px; margin: 0 auto; padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.brand { display: flex; align-items: center; gap: 10px; }
.brand .mark { width: 32px; height: 32px; border-radius: 8px; background: var(--accent); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 15px; }
.brand .wmk { font-weight: 700; letter-spacing: -0.03em; font-size: 18px; }
.brand .ver { font-size: 10px; font-weight: 600; color: var(--mute); background: var(--line2); padding: 2px 7px; border-radius: 5px; letter-spacing: 0.04em; }
.nav button { padding: 7px 14px; border-radius: 8px; font-weight: 600; color: #fff; background: var(--ink); font-size: 13px; }

.wrap { max-width: 1100px; margin: 0 auto; padding: 36px 28px 96px; }

.hero { margin-bottom: 42px; }
.kicker { display: inline-block; padding: 5px 12px; background: var(--accent-soft); color: var(--accent-dark); font-size: 11px; font-weight: 700; border-radius: 999px; margin-bottom: 16px; }
.hero h1 { margin: 0 0 14px; font-size: 38px; line-height: 1.5; letter-spacing: -0.035em; font-weight: 700; }
.hero h1 em { font-style: normal; color: var(--accent); }
.hero p { margin: 0; color: var(--ink2); font-size: 15px; line-height: 1.7; max-width: 680px; font-weight: 500; }

.steps { display: flex; gap: 8px; margin: 24px 0 36px; font-size: 11px; font-weight: 600; }
.step-pill { padding: 6px 12px; border-radius: 999px; background: var(--line2); color: var(--mute); display: flex; align-items: center; gap: 6px; }
.step-pill.on { background: var(--ink); color: #fff; }
.step-pill.done { background: var(--auto); color: #fff; }
.step-pill .n { width: 16px; height: 16px; border-radius: 50%; background: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 9px; }
.step-pill:not(.on):not(.done) .n { background: var(--mute); color: #fff; }

.card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 28px; margin-bottom: 14px; }
.card h3 { font-size: 16px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.02em; }
.card-sub { font-size: 13px; color: var(--mute); margin: 0 0 22px; font-weight: 500; }

.error-box { padding: 12px 16px; background: #FEE2E2; color: #991B1B; border-radius: 10px; font-size: 13px; margin-bottom: 18px; font-weight: 600; }
.warn-box { padding: 12px 16px; background: var(--propose-soft); color: #92400E; border-radius: 10px; font-size: 13px; margin-bottom: 14px; font-weight: 500; }

.fld { margin-bottom: 18px; }
.fld label { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--ink2); margin-bottom: 8px; letter-spacing: -0.01em; }
.fld .opt { font-size: 10px; font-weight: 600; color: var(--mute); background: var(--line2); padding: 2px 7px; border-radius: 5px; }
.fld .req { font-size: 10px; font-weight: 700; color: #fff; background: var(--accent); padding: 2px 7px; border-radius: 5px; }
.fld input { width: 100%; padding: 13px 16px; border-radius: 10px; border: 1px solid var(--line); background: #fff; font-size: 14px; outline: none; font-family: inherit; color: var(--ink); }
.fld input::placeholder { color: var(--mute); }
.fld input:focus { border-color: var(--ink); }
.fld .hint { font-size: 11px; color: var(--mute); margin-top: 6px; line-height: 1.5; }

.btn { padding: 13px 22px; border-radius: 10px; background: var(--ink); color: #fff; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; gap: 8px; border: none; cursor: pointer; text-decoration: none; }
.btn.pink { background: var(--accent); }
.btn.pink:hover { background: var(--accent-dark); }
.btn.ghost { background: var(--line2); color: var(--ink2); }
.btn.outline { background: #fff; border: 1px solid var(--line); color: var(--ink2); }
.btn.big { padding: 15px 28px; font-size: 14px; border-radius: 12px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.action-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
.meta-text { font-size: 12px; color: var(--mute); font-weight: 500; }

.run-vis { display: flex; align-items: center; gap: 22px; padding: 22px 0; }
.spinner-large { width: 48px; height: 48px; border-radius: 50%; border: 4px solid var(--accent-soft); border-top-color: var(--accent); animation: spin 0.8s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
.run-text .run-step { font-size: 14px; font-weight: 700; letter-spacing: -0.015em; margin-bottom: 4px; }
.run-text .run-sub { font-size: 12px; color: var(--mute); font-weight: 500; }

.screenshots-section { margin-bottom: 24px; background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 22px 24px; }
.screenshots-head { margin-bottom: 14px; }
.screenshots-head h3 { margin: 0 0 4px; font-size: 15px; font-weight: 700; letter-spacing: -0.02em; }
.screenshots-head p { margin: 0; font-size: 12px; color: var(--mute); font-weight: 500; }
.screenshots-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; align-items: start; }
@media (max-width: 760px) { .screenshots-grid { grid-template-columns: 1fr; } }
.shot-card { background: #FAFAF9; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.shot-label { padding: 10px 14px; font-size: 11px; font-weight: 700; color: var(--ink2); background: var(--line2); letter-spacing: 0.02em; }
.shot-card img { display: block; width: 100%; height: auto; }
.shot-card a { display: block; }

.results-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
.results-head h2 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.025em; }
.results-head .total { font-size: 12px; color: var(--mute); font-weight: 600; }

.filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
.filter-chip { padding: 8px 14px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #fff; border: 1px solid var(--line); color: var(--ink2); display: inline-flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; }
.filter-chip.on { background: var(--ink); color: #fff; border-color: var(--ink); }
.filter-chip .dot { width: 8px; height: 8px; border-radius: 50%; }
.filter-chip .dot.auto { background: var(--auto); }
.filter-chip .dot.propose { background: var(--propose); }
.filter-chip .dot.human { background: var(--human); }
.filter-chip .cnt { font-size: 11px; color: var(--mute); font-weight: 700; }
.filter-chip.on .cnt { color: rgba(255,255,255,0.7); }

.empty { padding: 22px; text-align: center; color: var(--mute); font-size: 13px; font-weight: 500; background: var(--card); border: 1px dashed var(--line); border-radius: 12px; }

.finding { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 18px 22px; margin-bottom: 10px; }
.finding .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.finding .meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.finding .badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 5px; font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.finding .badge.auto { background: var(--auto-soft); color: #065F46; }
.finding .badge.propose { background: var(--propose-soft); color: #92400E; }
.finding .badge.human { background: var(--human-soft); color: #3730A3; }
.finding .cat { font-size: 11px; color: var(--mute); font-weight: 600; }
.finding .ttl { font-size: 14px; font-weight: 700; letter-spacing: -0.015em; margin: 8px 0 6px; }
.finding .desc { font-size: 13px; color: var(--ink2); line-height: 1.6; font-weight: 500; margin: 0 0 12px; }
.finding .fix { font-size: 12px; background: var(--line2); padding: 10px 14px; border-radius: 8px; color: var(--ink2); line-height: 1.6; font-weight: 500; border-left: 3px solid var(--accent); }

.export-bar { margin-top: 24px; background: var(--ink); border-radius: 14px; padding: 22px 26px; display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap; color: #fff; }
.export-bar .lh { flex: 1; min-width: 200px; }
.export-bar .lh h3 { margin: 0 0 4px; font-size: 15px; font-weight: 700; letter-spacing: -0.02em; color: #fff; }
.export-bar .lh p { margin: 0; font-size: 12px; color: rgba(255,255,255,0.7); font-weight: 500; }
.export-bar .rh { display: flex; gap: 8px; flex-wrap: wrap; }
.export-bar .btn { background: #fff; color: var(--ink); }
.export-bar .btn.ghost { background: rgba(255,255,255,0.12); color: #fff; }
.export-bar .btn.ghost.active { background: var(--accent); color: #fff; }
.export-bar .btn.ghost:disabled { opacity: 0.5; cursor: not-allowed; }

.btn.small { padding: 7px 14px; font-size: 12px; border-radius: 8px; }

.prompt-box { margin-top: 14px; background: #0F0F0F; color: #E5E7EB; border-radius: 14px; overflow: hidden; }
.prompt-head { padding: 16px 22px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; border-bottom: 1px solid #1F1F1F; }
.prompt-label { font-size: 13px; font-weight: 600; color: #E5E7EB; letter-spacing: -0.015em; }
.prompt-pre { margin: 0; padding: 22px; font-family: 'SF Mono', 'Consolas', ui-monospace, monospace; font-size: 12px; line-height: 1.7; color: #A8E6CF; white-space: pre-wrap; word-break: break-word; max-height: 480px; overflow-y: auto; }

.reset-row { margin-top: 18px; text-align: center; }

.foot { text-align: center; color: var(--mute); font-size: 11px; padding: 30px 22px 14px; font-weight: 500; }
.foot .sig { color: var(--ink2); font-weight: 700; margin-bottom: 4px; letter-spacing: -0.02em; }

@media (max-width: 760px) {
  .bar-in { padding: 12px 18px; }
  .wrap { padding: 24px 18px 80px; }
  .hero h1 { font-size: 26px; }
  .card { padding: 22px; }
  .results-head h2 { font-size: 18px; }
}
`;
