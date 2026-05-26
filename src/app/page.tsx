"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("https://bigglz-lle-network.pages.dev");
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    // TODO Day 2 = POST /api/inspect 호출
    setTimeout(() => {
      alert(`(Day 2 미구현) 검수 시작 요청:\nURL = ${url}\nGitHub = ${githubUrl || "(미입력)"}`);
      setLoading(false);
    }, 600);
  };

  return (
    <>
      <header style={{ position: "sticky", top: 0, zIndex: 60, background: "rgba(250,250,249,0.85)", backdropFilter: "saturate(180%) blur(14px)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15 }}>S</div>
            <div style={{ fontWeight: 700, letterSpacing: "-0.03em", fontSize: 18 }}>Shushu</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--mute)", background: "var(--line2)", padding: "2px 7px", borderRadius: 5, letterSpacing: "0.04em" }}>v2 · 실 검수</div>
          </div>
          <nav style={{ display: "flex", gap: 4 }}>
            <button style={{ padding: "7px 14px", borderRadius: 8, fontWeight: 600, color: "#fff", background: "var(--ink)", fontSize: 13 }}>검수</button>
            <button style={{ padding: "7px 14px", borderRadius: 8, fontWeight: 600, color: "var(--mute)", fontSize: 13 }}>히스토리</button>
            <button style={{ padding: "7px 14px", borderRadius: 8, fontWeight: 600, color: "var(--mute)", fontSize: 13 }}>설정</button>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 28px 96px" }}>
        <div style={{ marginBottom: 42 }}>
          <div style={{ display: "inline-block", padding: "5px 12px", background: "var(--accent-soft)", color: "var(--accent-dark)", fontSize: 11, fontWeight: 700, borderRadius: 999, marginBottom: 16 }}>v2 · Ingest → Query → Lint 거버넌스 도입</div>
          <h1 style={{ margin: "0 0 14px", fontSize: 38, lineHeight: 1.5, letterSpacing: "-0.035em", fontWeight: 700 }}>
            <em style={{ fontStyle: "normal", color: "var(--accent)" }}>바이브코딩</em>한 사이트<br />
            AI가 직접 검수하고 의견드립니다
          </h1>
          <p style={{ margin: 0, color: "var(--ink2)", fontSize: 15, lineHeight: 1.7, maxWidth: 680, fontWeight: 500 }}>
            URL 하나 또는 GitHub 저장소 주소만 주시면 AI가 분석하고 결과를 AUTO·PROPOSE·HUMAN ONLY 3단계로 라벨링해드립니다.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 36, fontSize: 11, fontWeight: 600 }}>
          <div style={{ padding: "6px 12px", borderRadius: 999, background: "var(--ink)", color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 9 }}>1</div>
            입력
          </div>
          <div style={{ padding: "6px 12px", borderRadius: 999, background: "var(--line2)", color: "var(--mute)", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--mute)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 9 }}>2</div>
            분석
          </div>
          <div style={{ padding: "6px 12px", borderRadius: 999, background: "var(--line2)", color: "var(--mute)", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--mute)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 9 }}>3</div>
            결과
          </div>
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 28, marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>검수 대상 입력</h3>
          <p style={{ fontSize: 13, color: "var(--mute)", margin: "0 0 22px", fontWeight: 500 }}>사이트 URL은 필수. GitHub 저장소 주소는 옵션 (원본 코드 분석까지 가능).</p>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink2)", marginBottom: 8, letterSpacing: "-0.01em" }}>
              사이트 URL <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "var(--accent)", padding: "2px 7px", borderRadius: 5 }}>필수</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              style={{ width: "100%", padding: "13px 16px", borderRadius: 10, border: "1px solid var(--line)", background: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit", color: "var(--ink)" }}
            />
            <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 6, lineHeight: 1.5 }}>공개 접근 가능한 URL. 슈슈가 직접 접속해서 HTML·CSS·렌더링 분석합니다.</div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink2)", marginBottom: 8, letterSpacing: "-0.01em" }}>
              GitHub 저장소 URL <span style={{ fontSize: 10, fontWeight: 600, color: "var(--mute)", background: "var(--line2)", padding: "2px 7px", borderRadius: 5 }}>옵션</span>
            </label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              style={{ width: "100%", padding: "13px 16px", borderRadius: 10, border: "1px solid var(--line)", background: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit", color: "var(--ink)" }}
            />
            <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 6, lineHeight: 1.5 }}>입력 시 원본 코드 (.tsx·.vue·.svelte 등)까지 분석 = DDD 도메인 분리·기술 스택·코드 엉킴 정밀 검출.</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
            <div style={{ fontSize: 12, color: "var(--mute)", fontWeight: 500 }}>예상 시간 = 약 30~90초 · 무료 (Gemini 무료 티어)</div>
            <button
              onClick={handleSubmit}
              disabled={loading || !url}
              style={{ padding: "15px 28px", borderRadius: 12, background: loading ? "var(--mute)" : "var(--accent)", color: "#fff", fontWeight: 600, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8, cursor: loading || !url ? "not-allowed" : "pointer", opacity: loading || !url ? 0.5 : 1 }}
            >
              {loading ? "검수 시작 중…" : "검수 시작 →"}
            </button>
          </div>
        </div>
      </main>

      <footer style={{ textAlign: "center", color: "var(--mute)", fontSize: 11, padding: "30px 22px 14px", fontWeight: 500 }}>
        <div style={{ color: "var(--ink2)", fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em" }}>Shushu v2</div>
        <div>Day 1 셋업 완료 · 2026-05-26 · 백엔드 API Day 2~3 진입 예정</div>
      </footer>
    </>
  );
}
