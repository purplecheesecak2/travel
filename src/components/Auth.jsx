// src/components/Auth.jsx
// 로그인 / 회원가입 화면. 앱 분위기에 맞춘 차분한 톤.
import React, { useState } from "react";
import { authApi } from "../lib/cloudStore";

const C = {
  bg: "#F6F3EE", surface: "#FFFFFF", ink: "#1D2A2A", inkSoft: "#5C6A69",
  inkFaint: "#94A09E", line: "#E5DDD1", accent: "#2C6E60", accentDeep: "#1F5046", clay: "#C2734F",
};
const DISPLAY = "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif";
const input = {
  width: "100%", padding: "12px 14px", borderRadius: 11, border: `1px solid ${C.line}`,
  background: C.surface, color: C.ink, fontSize: 14.5, marginBottom: 10,
};

export default function Auth() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async () => {
    if (!email.trim() || !password) { setMsg("이메일과 비밀번호를 입력해 주세요."); return; }
    setBusy(true); setMsg("");
    try {
      const fn = mode === "signup" ? authApi.signUp : authApi.signIn;
      const { error } = await fn(email.trim(), password);
      if (error) throw error;
      if (mode === "signup") setMsg("가입 완료! 이메일 확인이 필요할 수 있어요. (Supabase 설정에 따라 다름)");
    } catch (e) {
      setMsg(e.message || "문제가 생겼어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "grid", placeItems: "center", padding: 22, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Inter:wght@400;500;600&display=swap');`}</style>
      <div style={{ width: "min(400px, 100%)" }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 15, color: C.accent, marginBottom: 14 }}>여정 · Yeojeong</div>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", margin: "0 0 6px", color: C.ink }}>
          {mode === "signup" ? "함께 떠날 준비" : "다시 오셨네요"}
        </h1>
        <p style={{ color: C.inkSoft, fontSize: 14, margin: "0 0 22px" }}>
          로그인하면 여행이 클라우드에 저장되고, 동행자와 함께 편집할 수 있어요.
        </p>

        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: 20 }}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" style={input} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="비밀번호" style={input} />

          {msg && <div style={{ color: msg.includes("완료") ? C.accent : C.clay, fontSize: 13, margin: "2px 0 12px" }}>{msg}</div>}

          <button onClick={submit} disabled={busy} style={{
            width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
            background: C.accent, color: "#fff", fontWeight: 600, fontSize: 15,
            cursor: busy ? "default" : "pointer", opacity: busy ? 0.8 : 1,
          }}>
            {busy ? "잠시만요…" : mode === "signup" ? "가입하기" : "로그인"}
          </button>

          <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMsg(""); }}
            style={{ width: "100%", marginTop: 10, background: "none", border: "none", color: C.inkSoft, fontSize: 13.5, cursor: "pointer" }}>
            {mode === "signup" ? "이미 계정이 있어요 — 로그인" : "처음이신가요? — 가입하기"}
          </button>
        </div>
      </div>
    </div>
  );
}