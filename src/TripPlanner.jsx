import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  MapPin, Hotel, Home, UtensilsCrossed, Wallet, Users, Share2,
  Sparkles, Plus, Trash2, ChevronUp, ChevronDown, Clock, Star,
  Sun, CloudRain, Cloud, CloudSun, Calendar, Coffee, Camera,
  Bus, Bed, Pencil, Check, X, Copy, Download, Map as MapIcon,
  Compass, ArrowRight, Loader2, Heart, Plane, Clock3, CloudDownload
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import { useCloudTrips } from "./hooks/useCloudTrips";
import Auth from "./components/Auth";

/* ---------------------------------- tokens --------------------------------- */
const C = {
  bg: "#F6F3EE",
  surface: "#FFFFFF",
  surfaceAlt: "#F0EBE2",
  ink: "#1D2A2A",
  inkSoft: "#5C6A69",
  inkFaint: "#94A09E",
  line: "#E5DDD1",
  lineSoft: "#EFE9DF",
  accent: "#2C6E60",
  accentDeep: "#1F5046",
  accentSoft: "#E2EEEA",
  clay: "#C2734F",
  claySoft: "#F4E6DD",
  amber: "#CC9A3F",
};

const DISPLAY = "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif";
const BODY = "'Inter', ui-sans-serif, system-ui, sans-serif";

const CURRENCIES = [
  { sym: "₩", code: "KRW" },
  { sym: "$", code: "USD" },
  { sym: "€", code: "EUR" },
  { sym: "¥", code: "JPY" },
];

const INTERESTS = ["맛집", "자연", "역사·문화", "쇼핑", "예술", "나이트라이프", "휴양", "액티비티"];

const TYPE_META = {
  sight: { label: "명소", icon: Camera, color: C.accent },
  food: { label: "식사", icon: UtensilsCrossed, color: C.clay },
  cafe: { label: "카페", icon: Coffee, color: C.amber },
  transport: { label: "이동", icon: Bus, color: C.inkSoft },
  rest: { label: "휴식", icon: Bed, color: C.inkSoft },
};

const CAT_META = {
  lodging: { label: "숙박", color: C.accent },
  food: { label: "식비", color: C.clay },
  transport: { label: "교통", color: C.amber },
  activity: { label: "액티비티", color: "#6E8BB5" },
  shopping: { label: "쇼핑", color: "#9A7BB0" },
  etc: { label: "기타", color: C.inkFaint },
};

/* --------------------------------- helpers --------------------------------- */
const uid = () => Math.random().toString(36).slice(2, 9);

function addDays(dateStr, n) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmtDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const wd = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}.${d.getDate()} (${wd})`;
}
function money(n, sym) {
  if (n == null || isNaN(n)) return `${sym}0`;
  return `${sym}${Math.round(n).toLocaleString()}`;
}

// 장소 이름으로 좌표 찾기 (OpenStreetMap Nominatim · 무료, 키 불필요)
async function geocode(query) {
  if (!query || !query.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query.trim())}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await res.json();
    if (Array.isArray(data) && data.length) {
      const lat = parseFloat(data[0].lat), lng = parseFloat(data[0].lon);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
  } catch (_) {}
  return null;
}

const ICON_FOR_WEATHER = (s = "") => {
  s = s.toLowerCase();
  if (/(비|rain|소나기|shower)/.test(s)) return CloudRain;
  if (/(흐림|구름많|cloud)/.test(s)) return Cloud;
  if (/(맑음|화창|sun|clear)/.test(s)) return Sun;
  return CloudSun;
};

/* ===================================================================== */

/* --------------------------- 여행 상태(예정/지난) --------------------------- */
function tripStatus(t) {
  if (!t.startDate) return "draft";
  const start = new Date(t.startDate + "T00:00:00");
  const end = new Date(addDays(t.startDate, (t.days || 1) - 1) + "T23:59:59");
  const now = new Date();
  if (now > end) return "past";
  if (now >= start) return "ongoing";
  return "upcoming";
}

export default function TripPlanner() {
  const cloud = useCloudTrips();
  const { user, authReady, ready, trips, createTrip, removeTrip, updateActive, join, signOut } = cloud;

  const [view, setView] = useState("home"); // home | setup | trip
  const [activeId, setActiveId] = useState(null);
  const [tab, setTab] = useState("plan");

  // 공유 링크(?join=토큰)로 들어오면 자동으로 그 여행에 참여
  useEffect(() => {
    if (!user) return;
    const token = new URLSearchParams(window.location.search).get("join");
    if (!token) return;
    join(token)
      .then((id) => {
        window.history.replaceState({}, "", window.location.pathname);
        if (id) { setActiveId(id); setTab("plan"); setView("trip"); }
      })
      .catch(() => {});
  }, [user, join]);

  const openTrip = (id) => { setActiveId(id); setTab("plan"); setView("trip"); };
  const startTrip = async (trip) => { const t = await createTrip(trip); openTrip(t.id); };
  const goHome = () => { setActiveId(null); setView("home"); };

  const activeTrip = activeId ? trips[activeId] : null;
  const setActiveTrip = (updater) => updateActive(activeId, updater);

  if (!authReady) return <CenterSpinner />;
  if (!user) return <Auth />;

  return (
    <div style={{ background: C.bg, color: C.ink, fontFamily: BODY, minHeight: "100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .tp-fade { animation: tpFade .5s ease both; }
        @keyframes tpFade { from { opacity: 0; transform: translateY(8px);} to { opacity: 1; transform: none; } }
        .tp-route { stroke-dasharray: 600; stroke-dashoffset: 600; animation: tpDraw 1.1s ease forwards; }
        @keyframes tpDraw { to { stroke-dashoffset: 0; } }
        .tp-pin { opacity: 0; animation: tpPin .4s ease forwards; }
        @keyframes tpPin { to { opacity: 1; } }
        input, select, textarea, button { font-family: inherit; }
        input:focus, select:focus, textarea:focus { outline: 2px solid ${C.accent}; outline-offset: 1px; }
        button:focus-visible { outline: 2px solid ${C.accent}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          .tp-fade, .tp-route, .tp-pin { animation: none !important; opacity: 1 !important; stroke-dashoffset: 0 !important; transform: none !important; }
        }
        .tp-scroll::-webkit-scrollbar { height: 6px; width: 6px; }
        .tp-scroll::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 99px; }
        .tp-spin { animation: tpSpin 1s linear infinite; }
        @keyframes tpSpin { to { transform: rotate(360deg); } }
        .tp-card-hover { transition: transform .18s ease, box-shadow .18s ease; }
        .tp-card-hover:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(31,42,42,0.10); }
      `}</style>

      {/* 로그아웃 (항상 우상단) */}
      <button onClick={signOut} title="로그아웃" style={{
        position: "fixed", top: 14, right: 16, zIndex: 50, fontSize: 12.5, fontWeight: 600,
        color: C.inkSoft, background: C.surface, border: `1px solid ${C.line}`,
        borderRadius: 99, padding: "6px 13px", cursor: "pointer",
      }}>로그아웃</button>

      {!ready ? (
        <CenterSpinner />
      ) : view === "home" ? (
        <HomeScreen trips={trips} onNew={() => setView("setup")} onOpen={openTrip} onDelete={removeTrip}
          onImport={startTrip} storageOK={true} />
      ) : view === "setup" ? (
        <Setup onStart={startTrip} onCancel={goHome} />
      ) : activeTrip ? (
        <AppShell trip={activeTrip} setTrip={setActiveTrip} tab={tab} setTab={setTab}
          onHome={goHome} storageOK={true} />
      ) : (
        <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
          <button onClick={goHome} style={miniBtn(C.accent, true)}>홈으로</button>
        </div>
      )}
    </div>
  );
}

function CenterSpinner() {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "60vh", background: C.bg, color: C.inkFaint }}>
      <Loader2 size={22} className="tp-spin" />
    </div>
  );
}

/* ------------------------------- HOME SCREEN ------------------------------- */
function HomeScreen({ trips, onNew, onOpen, onDelete, onImport, storageOK }) {
  const all = Object.values(trips).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const upcoming = all.filter((t) => ["upcoming", "ongoing", "draft"].includes(tripStatus(t)));
  const past = all.filter((t) => tripStatus(t) === "past");
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="tp-fade" style={{ maxWidth: 1040, margin: "0 auto", padding: "56px 22px 90px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.accent, marginBottom: 26 }}>
        <Compass size={20} />
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, letterSpacing: "-0.01em", fontSize: 15 }}>Travel</span>
      </div>

      {/* hero CTA */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginBottom: 40 }}>
        <div style={{ background: `linear-gradient(135deg, ${C.accentDeep}, ${C.accent})`, borderRadius: 22, padding: "38px 30px", color: "#fff", position: "relative", overflow: "hidden" }}>
          <Plane size={130} style={{ position: "absolute", right: -18, bottom: -28, opacity: 0.12, transform: "rotate(-18deg)" }} />
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 34, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
            다음 여행을<br />계획해 볼까요?
          </h1>
          <p style={{ fontSize: 14.5, opacity: 0.85, maxWidth: 420, margin: "0 0 22px" }}>
            여행지만 알려주면 동선·숙소·맛집까지 한 번에. 지난 여행 기록도 여기 모여요.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={onNew} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 22px", borderRadius: 12, border: "none", background: "#fff", color: C.accentDeep, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              <Plus size={18} /> 새 여행 계획하기
            </button>
            <button onClick={() => setShowImport((v) => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", background: "transparent", color: "#fff", fontWeight: 600, fontSize: 14.5, cursor: "pointer" }}>
              <CloudDownload size={17} /> 공유 코드로 불러오기
            </button>
          </div>
          {showImport && <ImportInline onImport={(t) => { onImport(t); }} />}
        </div>
      </div>

      {!storageOK && (
        <div style={{ background: C.claySoft, border: `1px solid ${C.clay}`, color: C.clay, borderRadius: 12, padding: "11px 15px", fontSize: 13, marginBottom: 26 }}>
          이 환경에서는 자동 저장이 제한될 수 있어요. 실제 배포 사이트에서는 여행이 자동으로 저장돼 다시 들어와도 그대로 보여요.
        </div>
      )}

      {all.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: C.inkFaint }}>
          <MapIcon size={30} style={{ opacity: 0.5, marginBottom: 12 }} />
          <div style={{ fontSize: 15 }}>아직 계획한 여행이 없어요.</div>
          <div style={{ fontSize: 13.5, marginTop: 4 }}>위에서 첫 여행을 만들어 보세요.</div>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <TripSection title="다가오는 · 진행 중" trips={upcoming} onOpen={onOpen} onDelete={onDelete} />
          )}
          {past.length > 0 && (
            <TripSection title="지난 여행" trips={past} onOpen={onOpen} onDelete={onDelete} muted />
          )}
        </>
      )}
    </div>
  );
}

function TripSection({ title, trips, onOpen, onDelete, muted }) {
  return (
    <section style={{ marginBottom: 38 }}>
      <h2 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em", margin: "0 0 14px", color: muted ? C.inkSoft : C.ink }}>
        {title} <span style={{ color: C.inkFaint, fontWeight: 500, fontSize: 14 }}>· {trips.length}</span>
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
        {trips.map((t) => <TripCard key={t.id} trip={t} onOpen={onOpen} onDelete={onDelete} muted={muted} />)}
      </div>
    </section>
  );
}

function TripCard({ trip, onOpen, onDelete, muted }) {
  const [confirm, setConfirm] = useState(false);
  const status = tripStatus(trip);
  const statusMeta = {
    upcoming: { label: "예정", color: C.accent, bg: C.accentSoft },
    ongoing: { label: "여행 중", color: C.clay, bg: C.claySoft },
    past: { label: "다녀옴", color: C.inkSoft, bg: C.surfaceAlt },
    draft: { label: "임시저장", color: C.amber, bg: "#F7EEDB" },
  }[status];
  const stops = (trip.itinerary || []).reduce((a, d) => a + d.stops.length, 0);
  const day1 = (trip.itinerary || []).find((d) => d.stops.some((s) => typeof s.lat === "number"));

  return (
    <div className="tp-card-hover" style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, overflow: "hidden", cursor: "pointer", opacity: muted ? 0.92 : 1, position: "relative" }}
      onClick={() => onOpen(trip.id)}>
      <div style={{ height: 96, background: `linear-gradient(150deg, ${C.surfaceAlt}, #E8E0D3)`, position: "relative" }}>
        <MiniRoute stops={day1 ? day1.stops : []} />
        <span style={{ position: "absolute", top: 11, left: 12, fontSize: 11, fontWeight: 700, color: statusMeta.color, background: statusMeta.bg, padding: "3px 9px", borderRadius: 99 }}>
          {statusMeta.label}
        </span>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 19, letterSpacing: "-0.01em", lineHeight: 1.1 }}>{trip.destination}</div>
        <div style={{ color: C.inkSoft, fontSize: 13, marginTop: 6, display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Calendar size={12} /> {trip.startDate ? fmtDate(trip.startDate) : "날짜 미정"}</span>
          <span>{trip.days}일</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {stops}곳</span>
        </div>
        {trip.summary && <div style={{ color: C.inkFaint, fontSize: 12.5, marginTop: 8, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>“{trip.summary}”</div>}
      </div>
      <button onClick={(e) => { e.stopPropagation(); setConfirm(true); }}
        style={{ position: "absolute", top: 10, right: 10, width: 30, height: 30, borderRadius: 9, border: "none", background: "rgba(255,255,255,0.85)", color: C.inkSoft, cursor: "pointer", display: "grid", placeItems: "center" }}>
        <Trash2 size={15} />
      </button>
      {confirm && (
        <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", inset: 0, background: "rgba(29,42,42,0.55)", display: "grid", placeItems: "center", padding: 18 }}>
          <div style={{ background: C.surface, borderRadius: 14, padding: 18, textAlign: "center", maxWidth: 220 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>이 여행을 삭제할까요?</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 14 }}>되돌릴 수 없어요.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={() => setConfirm(false)} style={miniBtn(C.inkSoft, false)}>취소</button>
              <button onClick={() => onDelete(trip.id)} style={miniBtn(C.clay, true)}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniRoute({ stops }) {
  const pts = stops.filter((s) => typeof s.lat === "number");
  const W = 300, H = 96, pad = 22;
  const coords = useMemo(() => {
    if (pts.length < 1) return [];
    if (pts.length === 1) return [{ x: W / 2, y: H / 2 }];
    const lats = pts.map((p) => p.lat), lngs = pts.map((p) => p.lng);
    let minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    if (maxLat - minLat < 1e-4) { minLat -= 0.01; maxLat += 0.01; }
    if (maxLng - minLng < 1e-4) { minLng -= 0.01; maxLng += 0.01; }
    return pts.map((p) => ({
      x: pad + ((p.lng - minLng) / (maxLng - minLng)) * (W - pad * 2),
      y: pad + (1 - (p.lat - minLat) / (maxLat - minLat)) * (H - pad * 2),
    }));
  }, [JSON.stringify(pts.map((p) => [p.lat, p.lng]))]);
  if (coords.length === 0)
    return <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: C.inkFaint }}><Compass size={26} style={{ opacity: 0.4 }} /></div>;
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%", display: "block" }} aria-hidden="true">
      {coords.length > 1 && <path d={path} fill="none" stroke={C.accent} strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" opacity="0.6" />}
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="5" fill={C.accent} stroke="#fff" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

function ImportInline({ onImport }) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const run = () => {
    try {
      const json = decodeURIComponent(escape(atob(code.trim())));
      const obj = JSON.parse(json);
      if (!obj.destination) throw new Error();
      onImport({ ...obj, id: uid(), createdAt: Date.now() });
    } catch (_) { setMsg("코드를 읽을 수 없어요."); }
  };
  return (
    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 16, background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
      <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="공유 코드를 붙여넣으세요"
        style={{ width: "100%", height: 56, borderRadius: 9, border: "none", padding: 10, fontSize: 11, fontFamily: "ui-monospace, monospace", resize: "none" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
        <button onClick={run} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "none", background: "#fff", color: C.accentDeep, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          <ArrowRight size={14} /> 불러오기
        </button>
        {msg && <span style={{ fontSize: 12.5, color: "#fff" }}>{msg}</span>}
      </div>
    </div>
  );
}

/* ------------------------------- SETUP SCREEN ------------------------------ */
function Setup({ onStart, onCancel }) {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [days, setDays] = useState(4);
  const [travelers, setTravelers] = useState(2);
  const [interests, setInterests] = useState(["맛집", "역사·문화"]);
  const [pace, setPace] = useState("balanced");
  const [budget, setBudget] = useState(1500000);
  const [cur, setCur] = useState(CURRENCIES[0]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const toggleInterest = (i) =>
    setInterests((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  const buildEmpty = () => ({
    id: uid(), createdAt: Date.now(),
    destination, startDate, days, travelers, interests, pace,
    budget: Number(budget), cur, summary: "",
    itinerary: Array.from({ length: days }, (_, i) => ({
      id: uid(), day: i + 1, date: addDays(startDate, i), title: `Day ${i + 1}`,
      weather: null, stops: [],
    })),
    lodging: [], restaurants: [], expenses: [],
    companions: [{ id: uid(), name: "나" }],
  });

  const createBlank = () => {
    if (!destination.trim()) { setErr("여행지를 입력해 주세요."); return; }
    onStart(buildEmpty());
  };

  return (
    <div className="tp-fade" style={{ maxWidth: 720, margin: "0 auto", padding: "56px 22px 80px" }}>
      <button onClick={onCancel} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.inkSoft, cursor: "pointer", fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 18 }}>
        <ArrowRight size={14} style={{ transform: "rotate(180deg)" }} /> 홈으로
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.accent, marginBottom: 18 }}>
        <Compass size={20} />
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, letterSpacing: "-0.01em", fontSize: 15 }}>Travel</span>
      </div>
      <h1 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 40, lineHeight: 1.08, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
        어디로<br />떠나시나요?
      </h1>
      <p style={{ color: C.inkSoft, fontSize: 15, maxWidth: 460, margin: "0 0 32px" }}>
        여행지와 기간을 입력하면, 일정·동선·숙소·맛집·예산을 직접 채워가며 계획할 수 있어요.
      </p>

      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: 24 }}>
        <Field label="여행지">
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="예: 교토, 포르투, 제주"
            style={inputStyle}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="출발일">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="여행 일수">
            <Stepper value={days} setValue={(v) => setDays(Math.max(1, Math.min(14, v)))} suffix="일" />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="인원">
            <Stepper value={travelers} setValue={(v) => setTravelers(Math.max(1, Math.min(12, v)))} suffix="명" />
          </Field>
          <Field label="예산">
            <div style={{ display: "flex", gap: 8 }}>
              <select value={cur.code} onChange={(e) => setCur(CURRENCIES.find((c) => c.code === e.target.value))} style={{ ...inputStyle, width: 88 }}>
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.sym} {c.code}</option>)}
              </select>
              <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} style={inputStyle} />
            </div>
          </Field>
        </div>

        <Field label="관심사">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {INTERESTS.map((i) => {
              const on = interests.includes(i);
              return (
                <button key={i} onClick={() => toggleInterest(i)} style={{
                  padding: "7px 13px", borderRadius: 99, fontSize: 13.5, cursor: "pointer",
                  border: `1px solid ${on ? C.accent : C.line}`,
                  background: on ? C.accentSoft : C.surface,
                  color: on ? C.accentDeep : C.inkSoft, fontWeight: on ? 600 : 500,
                }}>{i}</button>
              );
            })}
          </div>
        </Field>

        <Field label="여행 속도">
          <div style={{ display: "flex", gap: 8 }}>
            {[["relaxed", "여유롭게"], ["balanced", "적당히"], ["packed", "알차게"]].map(([v, l]) => {
              const on = pace === v;
              return (
                <button key={v} onClick={() => setPace(v)} style={{
                  flex: 1, padding: "10px 0", borderRadius: 12, cursor: "pointer", fontSize: 14,
                  border: `1px solid ${on ? C.accent : C.line}`,
                  background: on ? C.accentSoft : C.surface, color: on ? C.accentDeep : C.inkSoft,
                  fontWeight: on ? 600 : 500,
                }}>{l}</button>
              );
            })}
          </div>
        </Field>

        {err && <div style={{ color: C.clay, fontSize: 13.5, margin: "4px 0 14px" }}>{err}</div>}

        <button onClick={createBlank} style={{
          width: "100%", padding: "15px 0", borderRadius: 13, border: "none", cursor: "pointer",
          background: C.accent, color: "#fff", fontWeight: 600, fontSize: 15.5,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
        }}>
          <Compass size={18} /> 여행 만들기
        </button>
      </div>
    </div>
  );
}

/* -------------------------------- APP SHELL -------------------------------- */
function AppShell({ trip, setTrip, tab, setTab, onHome, storageOK }) {
  const sym = trip.cur.sym;
  const update = (patch) => setTrip((t) => ({ ...t, ...patch }));
  // 비동기(위치 찾기)에도 안전하도록 stop을 id로 직접 갱신
  const patchStop = (dayId, stopId, patch) =>
    setTrip((t) => ({
      ...t,
      itinerary: (t.itinerary || []).map((d) =>
        d.id === dayId
          ? { ...d, stops: d.stops.map((s) => (s.id === stopId ? { ...s, ...patch } : s)) }
          : d
      ),
    }));

  const tabs = [
    { id: "plan", label: "일정", icon: Calendar },
    { id: "stay", label: "숙소", icon: Hotel },
    { id: "eat", label: "맛집", icon: UtensilsCrossed },
    { id: "budget", label: "예산", icon: Wallet },
    { id: "share", label: "공유", icon: Share2 },
  ];

  return (
    <div>
      {/* header */}
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "16px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div>
              <button onClick={onHome} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 12.5, fontWeight: 600, padding: 0, marginBottom: 6 }}>
                <ArrowRight size={13} style={{ transform: "rotate(180deg)" }} /> 모든 여행
              </button>
              <h1 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 26, letterSpacing: "-0.02em", margin: 0, lineHeight: 1 }}>
                {trip.destination}
              </h1>
              <div style={{ color: C.inkSoft, fontSize: 13.5, marginTop: 5, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span>{trip.days}일</span>
                {trip.startDate && <span>{fmtDate(trip.startDate)} – {fmtDate(addDays(trip.startDate, trip.days - 1))}</span>}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Users size={12} /> {trip.travelers}명</span>
              </div>
            </div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: storageOK ? C.accent : C.inkFaint, background: storageOK ? C.accentSoft : C.surfaceAlt, padding: "5px 11px", borderRadius: 99, whiteSpace: "nowrap" }}>
              <Check size={12} /> {storageOK ? "자동 저장됨" : "이 세션에만 유지"}
            </span>
          </div>

          {/* tabs */}
          <nav className="tp-scroll" style={{ display: "flex", gap: 4, marginTop: 18, overflowX: "auto", paddingBottom: 2 }}>
            {tabs.map((t) => {
              const on = tab === t.id;
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: 10,
                  border: "none", cursor: "pointer", fontSize: 14, fontWeight: on ? 600 : 500, whiteSpace: "nowrap",
                  background: on ? C.ink : "transparent", color: on ? "#fff" : C.inkSoft,
                }}>
                  <Icon size={15} /> {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "26px 22px 90px" }}>
        {trip.summary && tab === "plan" && (
          <p className="tp-fade" style={{ fontSize: 15, color: C.inkSoft, fontStyle: "italic", margin: "0 0 22px", maxWidth: 640 }}>
            “{trip.summary}”
          </p>
        )}
        {tab === "plan" && <PlanTab trip={trip} update={update} patchStop={patchStop} sym={sym} />}
        {tab === "stay" && <StayTab trip={trip} update={update} sym={sym} />}
        {tab === "eat" && <EatTab trip={trip} update={update} />}
        {tab === "budget" && <BudgetTab trip={trip} update={update} sym={sym} />}
        {tab === "share" && <ShareTab trip={trip} update={update} setTrip={setTrip} />}
      </main>
    </div>
  );
}

/* --------------------------------- PLAN TAB -------------------------------- */
function PlanTab({ trip, update, patchStop, sym }) {
  const [active, setActive] = useState(0);
  const day = trip.itinerary[active];
  if (!day) return null;

  const setDay = (newDay) => {
    const it = trip.itinerary.slice();
    it[active] = newDay;
    update({ itinerary: it });
  };

  // 장소 이름으로 좌표 찾아서 채우기 (비동기 — patchStop으로 안전하게 갱신)
  const locateStop = async (dayId, stopId, name) => {
    if (!name || !name.trim()) return;
    patchStop(dayId, stopId, { _geo: "loading" });
    const found = await geocode(`${name} ${trip.destination || ""}`);
    patchStop(dayId, stopId, found ? { lat: found.lat, lng: found.lng, _geo: "ok" } : { _geo: "none" });
  };

  const moveStop = (i, dir) => {
    const stops = day.stops.slice();
    const j = i + dir;
    if (j < 0 || j >= stops.length) return;
    [stops[i], stops[j]] = [stops[j], stops[i]];
    setDay({ ...day, stops });
  };
  const delStop = (id) => setDay({ ...day, stops: day.stops.filter((s) => s.id !== id) });
  const editStop = (id, patch) => setDay({ ...day, stops: day.stops.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const addStop = (s) => {
    const id = uid();
    setDay({ ...day, stops: [...day.stops, { id, lat: null, lng: null, cost: 0, ...s }] });
    if (s.name && s.name.trim()) locateStop(day.id, id, s.name.trim()); // 추가하면 자동으로 위치 찾기
  };

  const dayTotal = day.stops.reduce((a, s) => a + (Number(s.cost) || 0), 0);
  const W = day.weather ? ICON_FOR_WEATHER(day.weather.summary) : null;

  return (
    <div className="tp-fade">
      {/* day selector */}
      <div className="tp-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 18 }}>
        {trip.itinerary.map((d, i) => {
          const on = i === active;
          return (
            <button key={d.id} onClick={() => setActive(i)} style={{
              flex: "0 0 auto", padding: "10px 16px", borderRadius: 13, cursor: "pointer", textAlign: "left",
              border: `1px solid ${on ? C.ink : C.line}`, background: on ? C.ink : C.surface, color: on ? "#fff" : C.ink, minWidth: 92,
            }}>
              <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 600 }}>DAY {d.day}</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>{d.date ? fmtDate(d.date) : `${d.day}일차`}</div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 18 }}>
        {/* day header w/ weather */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <input
            value={day.title}
            onChange={(e) => setDay({ ...day, title: e.target.value })}
            style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", border: "none", background: "transparent", color: C.ink, padding: 0, maxWidth: "60%" }}
          />
          {day.weather && (
            <div style={{ display: "flex", alignItems: "center", gap: 9, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "8px 13px" }}>
              <W size={20} color={C.amber} />
              <div style={{ fontSize: 13 }}>
                <div style={{ fontWeight: 600 }}>{day.weather.summary}</div>
                <div style={{ color: C.inkSoft, fontSize: 12 }}>{day.weather.hi}° / {day.weather.lo}°</div>
              </div>
              <span style={{ fontSize: 10.5, color: C.inkFaint, marginLeft: 2 }}>예상</span>
            </div>
          )}
        </div>

        {/* map */}
        <RouteMap stops={day.stops} />

        {/* stop list */}
        <div>
          {day.stops.length === 0 && (
            <EmptyHint icon={MapIcon} text="아직 일정이 없어요. 아래에서 장소를 추가해 보세요." />
          )}
          {day.stops.map((s, i) => (
            <StopRow key={s.id} index={i} stop={s} sym={sym}
              onMove={(d) => moveStop(i, d)} onDelete={() => delStop(s.id)} onEdit={(p) => editStop(s.id, p)}
              onLocate={() => locateStop(day.id, s.id, s.name)}
              isFirst={i === 0} isLast={i === day.stops.length - 1} />
          ))}
          <AddStop onAdd={addStop} />
          {dayTotal > 0 && (
            <div style={{ textAlign: "right", marginTop: 12, color: C.inkSoft, fontSize: 13.5 }}>
              이 날 예상 비용 <strong style={{ color: C.ink }}>{money(dayTotal, sym)}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StopRow({ index, stop, sym, onMove, onDelete, onEdit, onLocate, isFirst, isLast }) {
  const [edit, setEdit] = useState(false);
  const meta = TYPE_META[stop.type] || TYPE_META.sight;
  const Icon = meta.icon;

  return (
    <div style={{ display: "flex", gap: 12, position: "relative" }}>
      {/* timeline */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16 }}>
        <div style={{ width: 30, height: 30, borderRadius: 99, background: C.surface, border: `1.5px solid ${meta.color}`, display: "grid", placeItems: "center", color: meta.color, flex: "0 0 auto", fontWeight: 700, fontSize: 13 }}>
          {index + 1}
        </div>
        {!isLast && <div style={{ width: 2, flex: 1, background: C.line, marginTop: 2 }} />}
      </div>

      <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
        {edit ? (
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={stop.time} onChange={(e) => onEdit({ time: e.target.value })} placeholder="09:00" style={{ ...inputStyle, width: 90 }} />
              <select value={stop.type} onChange={(e) => onEdit({ type: e.target.value })} style={{ ...inputStyle, width: 110 }}>
                {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <input type="number" value={stop.cost} onChange={(e) => onEdit({ cost: Number(e.target.value) })} placeholder="비용" style={{ ...inputStyle, flex: 1 }} />
            </div>
            <input value={stop.name} onChange={(e) => onEdit({ name: e.target.value })} placeholder="장소 이름" style={inputStyle} />
            <input value={stop.note} onChange={(e) => onEdit({ note: e.target.value })} placeholder="메모" style={inputStyle} />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="number" value={stop.lat ?? ""} onChange={(e) => onEdit({ lat: e.target.value === "" ? null : Number(e.target.value) })} placeholder="위도 37.57" style={{ ...inputStyle, flex: 1 }} />
              <input type="number" value={stop.lng ?? ""} onChange={(e) => onEdit({ lng: e.target.value === "" ? null : Number(e.target.value) })} placeholder="경도 126.98" style={{ ...inputStyle, flex: 1 }} />
              <button onClick={onLocate} title="이름으로 위치 자동 찾기" style={miniBtn(C.inkSoft, false)}><MapPin size={14} /> 자동</button>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setEdit(false)} style={miniBtn(C.accent, true)}><Check size={14} /> 완료</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {stop.time && <span style={{ fontSize: 12.5, fontWeight: 700, color: meta.color, display: "inline-flex", alignItems: "center", gap: 3 }}><Clock size={12} /> {stop.time}</span>}
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: C.surfaceAlt, color: C.inkSoft, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Icon size={11} /> {meta.label}
                </span>
                {stop.lat != null ? (
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: C.accentSoft, color: C.accentDeep, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={11} /> 지도 표시됨
                  </span>
                ) : stop._geo === "loading" ? (
                  <span style={{ fontSize: 11, color: C.inkFaint, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Loader2 size={11} className="tp-spin" /> 위치 찾는 중…
                  </span>
                ) : (
                  <button onClick={onLocate} style={{ fontSize: 11, padding: "2px 9px", borderRadius: 99, border: `1px solid ${C.line}`, background: C.surface, color: C.inkSoft, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={11} /> {stop._geo === "none" ? "못 찾음 · 다시" : "위치 찾기"}
                  </button>
                )}
              </div>
              <div style={{ fontWeight: 600, fontSize: 15.5, marginTop: 6 }}>{stop.name || "이름 없음"}</div>
              {stop.note && <div style={{ color: C.inkSoft, fontSize: 13.5, marginTop: 3 }}>{stop.note}</div>}
              {stop.cost > 0 && <div style={{ color: C.inkFaint, fontSize: 12.5, marginTop: 5 }}>{money(stop.cost, sym)}</div>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button onClick={() => onMove(-1)} disabled={isFirst} style={iconBtn(isFirst)}><ChevronUp size={15} /></button>
              <button onClick={() => onMove(1)} disabled={isLast} style={iconBtn(isLast)}><ChevronDown size={15} /></button>
              <button onClick={() => setEdit(true)} style={iconBtn(false)}><Pencil size={14} /></button>
              <button onClick={onDelete} style={iconBtn(false, C.clay)}><Trash2 size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddStop({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState("sight");
  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), time, type, note: "", cost: 0 });
    setName(""); setTime(""); setType("sight"); setOpen(false);
  };
  if (!open)
    return (
      <button onClick={() => setOpen(true)} style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "13px 14px", marginLeft: 42,
        width: "calc(100% - 42px)", borderRadius: 13, border: `1.5px dashed ${C.line}`, background: "transparent",
        color: C.inkSoft, cursor: "pointer", fontSize: 14, fontWeight: 500,
      }}><Plus size={16} /> 장소 추가</button>
    );
  return (
    <div style={{ marginLeft: 42, background: C.surface, border: `1px solid ${C.accent}`, borderRadius: 14, padding: 14, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="09:00" style={{ ...inputStyle, width: 90 }} />
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...inputStyle, width: 110 }}>
          {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="장소 이름" style={{ ...inputStyle, flex: 1 }} autoFocus />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={() => setOpen(false)} style={miniBtn(C.inkSoft, false)}><X size={14} /> 취소</button>
        <button onClick={submit} style={miniBtn(C.accent, true)}><Plus size={14} /> 추가</button>
      </div>
    </div>
  );
}

/* --------------------------------- ROUTE MAP ------------------------------- */
function RouteMap({ stops }) {
  const pts = stops.filter((s) => typeof s.lat === "number" && typeof s.lng === "number");
  const W = 700, H = 300, pad = 46;

  const coords = useMemo(() => {
    if (pts.length === 0) return [];
    if (pts.length === 1) return [{ ...pts[0], x: W / 2, y: H / 2 }];
    const lats = pts.map((p) => p.lat), lngs = pts.map((p) => p.lng);
    let minLat = Math.min(...lats), maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    if (maxLat - minLat < 1e-4) { minLat -= 0.01; maxLat += 0.01; }
    if (maxLng - minLng < 1e-4) { minLng -= 0.01; maxLng += 0.01; }
    return pts.map((p) => ({
      ...p,
      x: pad + ((p.lng - minLng) / (maxLng - minLng)) * (W - pad * 2),
      y: pad + (1 - (p.lat - minLat) / (maxLat - minLat)) * (H - pad * 2),
    }));
  }, [JSON.stringify(pts.map((p) => [p.lat, p.lng]))]);

  if (coords.length === 0)
    return (
      <div style={{ background: C.surfaceAlt, border: `1px solid ${C.line}`, borderRadius: 16, padding: "30px 18px", textAlign: "center", color: C.inkFaint, fontSize: 13.5 }}>
        <MapIcon size={22} style={{ marginBottom: 8, opacity: 0.6 }} />
        <div>위치 정보가 있는 장소를 추가하면 동선이 지도에 그려져요.</div>
      </div>
    );

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 15px", borderBottom: `1px solid ${C.lineSoft}`, color: C.inkSoft, fontSize: 12.5, fontWeight: 600 }}>
        <MapIcon size={13} color={C.accent} /> 오늘의 동선 · 순서대로 {coords.length}곳
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", background: "linear-gradient(160deg,#F3F0EA,#ECE6DB)" }} role="img" aria-label="여행 동선 지도">
        {/* faint grid */}
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={"v" + i} x1={(W / 7) * i} y1="0" x2={(W / 7) * i} y2={H} stroke={C.line} strokeWidth="0.5" opacity="0.5" />
        ))}
        {Array.from({ length: 4 }).map((_, i) => (
          <line key={"h" + i} x1="0" y1={(H / 4) * i} x2={W} y2={(H / 4) * i} stroke={C.line} strokeWidth="0.5" opacity="0.5" />
        ))}
        {coords.length > 1 && (
          <path className="tp-route" d={path} fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 9" opacity="0.55" />
        )}
        {coords.map((c, i) => (
          <g key={c.id} className="tp-pin" style={{ animationDelay: `${i * 0.12}s` }}>
            <circle cx={c.x} cy={c.y} r="13" fill={C.accent} />
            <circle cx={c.x} cy={c.y} r="13" fill="none" stroke="#fff" strokeWidth="2" />
            <text x={c.x} y={c.y + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff" fontFamily={BODY}>{i + 1}</text>
            <text x={c.x} y={c.y - 19} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={C.ink} fontFamily={BODY}>
              {(c.name || "").length > 14 ? c.name.slice(0, 13) + "…" : c.name}
            </text>
          </g>
        ))}
      </svg>
      <div style={{ padding: "8px 15px", fontSize: 11, color: C.inkFaint, borderTop: `1px solid ${C.lineSoft}` }}>
        * 위치는 상대적 위치를 보여주는 개략도예요. 실제 거리·비율과 다를 수 있어요.
      </div>
    </div>
  );
}

/* --------------------------------- STAY TAB -------------------------------- */
function StayTab({ trip, update, sym }) {
  const [filter, setFilter] = useState("all");
  const setLodging = (l) => update({ lodging: l });
  const list = trip.lodging.filter((l) => filter === "all" || l.type === filter);

  const toggleSave = (id) => setLodging(trip.lodging.map((l) => (l.id === id ? { ...l, saved: !l.saved } : l)));
  const del = (id) => setLodging(trip.lodging.filter((l) => l.id !== id));
  const add = (l) => setLodging([...trip.lodging, { id: uid(), saved: false, ...l }]);

  return (
    <div className="tp-fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[["all", "전체"], ["hotel", "호텔"], ["airbnb", "에어비앤비"]].map(([v, l]) => {
            const on = filter === v;
            return <button key={v} onClick={() => setFilter(v)} style={pill(on)}>{l}</button>;
          })}
        </div>
        <AddInline label="숙소 추가" fields={[
          { key: "name", ph: "숙소 이름" }, { key: "area", ph: "지역" },
          { key: "pricePerNight", ph: "1박 가격", num: true }, { key: "rating", ph: "평점 0-5", num: true },
        ]} extra={{ type: "hotel" }} typeToggle onAdd={add} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
        {list.length === 0 && <EmptyHint icon={Hotel} text="아직 숙소가 없어요. '숙소 추가'로 직접 추가해 보세요." />}
        {list.map((l) => {
          const TypeIcon = l.type === "airbnb" ? Home : Hotel;
          return (
            <div key={l.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: l.type === "airbnb" ? C.clay : C.accent, background: l.type === "airbnb" ? C.claySoft : C.accentSoft, padding: "3px 9px", borderRadius: 99 }}>
                  <TypeIcon size={12} /> {l.type === "airbnb" ? "에어비앤비" : "호텔"}
                </span>
                <button onClick={() => toggleSave(l.id)} style={{ background: "none", border: "none", cursor: "pointer", color: l.saved ? C.clay : C.inkFaint, padding: 2 }}>
                  <Heart size={17} fill={l.saved ? C.clay : "none"} />
                </button>
              </div>
              <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em", marginTop: 11, lineHeight: 1.2 }}>{l.name}</div>
              <div style={{ color: C.inkSoft, fontSize: 13, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {l.area}</div>
              {l.note && <div style={{ color: C.inkSoft, fontSize: 13, marginTop: 8 }}>{l.note}</div>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 13, paddingTop: 12, borderTop: `1px solid ${C.lineSoft}` }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{money(l.pricePerNight, sym)}</span>
                  <span style={{ color: C.inkFaint, fontSize: 12 }}> /박</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                  <Star size={13} fill={C.amber} color={C.amber} /> <strong>{l.rating}</strong>
                </div>
              </div>
              <button onClick={() => del(l.id)} style={{ ...iconBtn(false, C.inkFaint), position: "absolute", bottom: 10, right: 10, opacity: 0 }} />
            </div>
          );
        })}
      </div>
      <DeleteList items={trip.lodging} onDelete={del} label="숙소" />
    </div>
  );
}

/* --------------------------------- EAT TAB --------------------------------- */
function EatTab({ trip, update }) {
  const setR = (r) => update({ restaurants: r });
  const toggleSave = (id) => setR(trip.restaurants.map((r) => (r.id === id ? { ...r, saved: !r.saved } : r)));
  const del = (id) => setR(trip.restaurants.filter((r) => r.id !== id));
  const add = (r) => setR([...trip.restaurants, { id: uid(), saved: false, priceLevel: Math.min(4, Math.max(1, Number(r.priceLevel) || 2)), ...r }]);

  return (
    <div className="tp-fade">
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 16 }}>
        <AddInline label="맛집 추가" fields={[
          { key: "name", ph: "가게 이름" }, { key: "cuisine", ph: "음식 종류" },
          { key: "area", ph: "지역" }, { key: "priceLevel", ph: "가격대 1-4", num: true },
          { key: "rating", ph: "평점 0-5", num: true },
        ]} onAdd={add} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
        {trip.restaurants.length === 0 && <EmptyHint icon={UtensilsCrossed} text="아직 맛집이 없어요. '맛집 추가'로 직접 추가해 보세요." />}
        {trip.restaurants.map((r) => (
          <div key={r.id} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: C.clay, background: C.claySoft, padding: "3px 9px", borderRadius: 99 }}>{r.cuisine || "음식"}</span>
              <button onClick={() => toggleSave(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: r.saved ? C.clay : C.inkFaint, padding: 2 }}>
                <Heart size={17} fill={r.saved ? C.clay : "none"} />
              </button>
            </div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em", marginTop: 11, lineHeight: 1.2 }}>{r.name}</div>
            <div style={{ color: C.inkSoft, fontSize: 13, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {r.area}</div>
            {r.note && <div style={{ color: C.inkSoft, fontSize: 13, marginTop: 8 }}>{r.note}</div>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 13, paddingTop: 12, borderTop: `1px solid ${C.lineSoft}` }}>
              <span style={{ color: C.accent, fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>{Array.from({ length: 4 }).map((_, i) => (i < r.priceLevel ? "●" : "○")).join("")}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                <Star size={13} fill={C.amber} color={C.amber} /> <strong>{r.rating}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
      <DeleteList items={trip.restaurants} onDelete={del} label="맛집" />
    </div>
  );
}

/* -------------------------------- BUDGET TAB ------------------------------- */
function BudgetTab({ trip, update, sym }) {
  const exp = trip.expenses;
  const setExp = (e) => update({ expenses: e });
  const add = (e) => setExp([...exp, { id: uid(), ...e }]);
  const del = (id) => setExp(exp.filter((x) => x.id !== id));

  const byCat = useMemo(() => {
    const m = {};
    exp.forEach((e) => { m[e.category] = (m[e.category] || 0) + Number(e.amount || 0); });
    return Object.entries(m).map(([k, v]) => ({ key: k, name: CAT_META[k]?.label || k, value: v, color: CAT_META[k]?.color || C.inkFaint }));
  }, [exp]);

  const total = exp.reduce((a, e) => a + Number(e.amount || 0), 0);
  const pct = trip.budget > 0 ? Math.min(100, (total / trip.budget) * 100) : 0;
  const over = total > trip.budget;
  const perPerson = trip.travelers > 0 ? total / trip.travelers : total;

  return (
    <div className="tp-fade">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 22 }}>
        {/* budget gauge */}
        <div style={{ ...cardStyle, gridColumn: "span 1" }}>
          <div style={{ color: C.inkSoft, fontSize: 13, fontWeight: 600 }}>총 지출 / 예산</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 28, color: over ? C.clay : C.ink }}>{money(total, sym)}</span>
            <span style={{ color: C.inkFaint, fontSize: 14 }}>/ {money(trip.budget, sym)}</span>
          </div>
          <div style={{ height: 10, borderRadius: 99, background: C.surfaceAlt, marginTop: 12, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: over ? C.clay : C.accent, transition: "width .5s" }} />
          </div>
          <div style={{ fontSize: 12.5, marginTop: 9, color: over ? C.clay : C.inkSoft }}>
            {over ? `예산을 ${money(total - trip.budget, sym)} 초과했어요` : `${money(trip.budget - total, sym)} 남았어요`}
          </div>
          <div style={{ fontSize: 12.5, marginTop: 4, color: C.inkFaint }}>1인당 약 {money(perPerson, sym)}</div>
        </div>

        {/* donut */}
        <div style={{ ...cardStyle }}>
          <div style={{ color: C.inkSoft, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>항목별 비중</div>
          {byCat.length === 0 ? (
            <div style={{ color: C.inkFaint, fontSize: 13, padding: "24px 0", textAlign: "center" }}>지출을 추가하면 표시돼요</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 120, height: 120 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={byCat} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={34} outerRadius={56} paddingAngle={2} stroke="none">
                      {byCat.map((e) => <Cell key={e.key} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, display: "grid", gap: 5 }}>
                {byCat.map((e) => (
                  <div key={e.key} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: e.color, flex: "0 0 auto" }} />
                    <span style={{ color: C.inkSoft }}>{e.name}</span>
                    <span style={{ marginLeft: "auto", fontWeight: 600 }}>{money(e.value, sym)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AddExpense onAdd={add} sym={sym} days={trip.days} />

      <div style={{ marginTop: 18 }}>
        {exp.length === 0 && <EmptyHint icon={Wallet} text="아직 등록된 지출이 없어요." />}
        {exp.slice().reverse().map((e) => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 15px", marginBottom: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: CAT_META[e.category]?.color || C.inkFaint, flex: "0 0 auto" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{e.label}</div>
              <div style={{ color: C.inkFaint, fontSize: 12 }}>{CAT_META[e.category]?.label}{e.day ? ` · Day ${e.day}` : ""}</div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{money(e.amount, sym)}</div>
            <button onClick={() => del(e.id)} style={iconBtn(false, C.clay)}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddExpense({ onAdd, sym, days }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [day, setDay] = useState("");
  const submit = () => {
    if (!label.trim() || !amount) return;
    onAdd({ label: label.trim(), amount: Number(amount), category, day: day ? Number(day) : null });
    setLabel(""); setAmount("");
  };
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="지출 항목" style={{ ...inputStyle, flex: "2 1 140px" }} />
      <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, flex: "1 1 100px" }}>
        {Object.entries(CAT_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <select value={day} onChange={(e) => setDay(e.target.value)} style={{ ...inputStyle, flex: "0 1 100px" }}>
        <option value="">날짜</option>
        {Array.from({ length: days }).map((_, i) => <option key={i} value={i + 1}>Day {i + 1}</option>)}
      </select>
      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder={`금액 (${sym})`} style={{ ...inputStyle, flex: "1 1 110px" }} />
      <button onClick={submit} style={miniBtn(C.accent, true)}><Plus size={14} /> 추가</button>
    </div>
  );
}

/* -------------------------------- SHARE TAB -------------------------------- */
function ShareTab({ trip, update, setTrip }) {
  const [code, setCode] = useState("");
  const [importCode, setImportCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [newName, setNewName] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);

  const genCode = () => {
    try {
      const json = JSON.stringify(trip);
      const b64 = btoa(unescape(encodeURIComponent(json)));
      setCode(b64);
    } catch (_) { setCode(""); }
  };
  const copy = () => {
    try {
      const ta = document.createElement("textarea");
      ta.value = code; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    } catch (_) {}
  };
  const doImport = () => {
    try {
      const json = decodeURIComponent(escape(atob(importCode.trim())));
      const obj = JSON.parse(json);
      if (!obj.destination) throw new Error();
      setTrip(obj); setImportMsg("불러왔어요!");
    } catch (_) { setImportMsg("코드를 읽을 수 없어요. 다시 확인해 주세요."); }
  };

  const addCompanion = () => {
    if (!newName.trim()) return;
    update({ companions: [...(trip.companions || []), { id: uid(), name: newName.trim() }] });
    setNewName("");
  };
  const delCompanion = (id) => update({ companions: (trip.companions || []).filter((c) => c.id !== id) });

  return (
    <div className="tp-fade" style={{ display: "grid", gap: 18, maxWidth: 640 }}>
      {/* companions */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Users size={16} color={C.accent} />
          <h3 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, margin: 0 }}>동행자</h3>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {(trip.companions || []).map((c) => (
            <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.accentSoft, color: C.accentDeep, padding: "6px 12px", borderRadius: 99, fontSize: 13.5, fontWeight: 500 }}>
              {c.name}
              {c.name !== "나" && <button onClick={() => delCompanion(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.accentDeep, padding: 0, display: "flex" }}><X size={13} /></button>}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCompanion()} placeholder="동행자 이름" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={addCompanion} style={miniBtn(C.accent, true)}><Plus size={14} /> 추가</button>
        </div>
      </div>

      {/* 실시간 공동 편집 초대 링크 */}
      {trip._shareToken && (
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Users size={16} color={C.accent} />
            <h3 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, margin: 0 }}>실시간 공동 편집 초대</h3>
          </div>
          <p style={{ color: C.inkSoft, fontSize: 13.5, margin: "0 0 10px" }}>
            이 링크를 받은 사람이 로그인하면 같은 여행을 함께 편집할 수 있어요. (배포된 사이트에서 동작해요)
          </p>
          <input readOnly value={`${location.origin}/?join=${trip._shareToken}`}
            onFocus={(e) => e.target.select()}
            style={{ ...inputStyle, fontSize: 12.5 }} />
          <button
            onClick={() => {
              const url = `${location.origin}/?join=${trip._shareToken}`;
              if (navigator.clipboard) navigator.clipboard.writeText(url);
              setInviteCopied(true);
              setTimeout(() => setInviteCopied(false), 1500);
            }}
            style={{ ...miniBtn(C.accent, true), marginTop: 8 }}>
            {inviteCopied ? <><Check size={14} /> 복사됨</> : <><Copy size={14} /> 초대 링크 복사</>}
          </button>
        </div>
      )}

      {/* share code */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Share2 size={16} color={C.accent} />
          <h3 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, margin: 0 }}>일정 공유</h3>
        </div>
        <p style={{ color: C.inkSoft, fontSize: 13.5, margin: "0 0 12px" }}>
          공유 코드를 만들어 동행자에게 보내면, 받은 사람이 아래 ‘코드 불러오기’로 같은 일정을 열 수 있어요.
        </p>
        <button onClick={genCode} style={{ ...miniBtn(C.ink, true), padding: "10px 16px" }}><Download size={15} /> 공유 코드 만들기</button>
        {code && (
          <div style={{ marginTop: 12 }}>
            <textarea readOnly value={code} className="tp-scroll" style={{ ...inputStyle, height: 80, fontSize: 11, fontFamily: "ui-monospace, monospace", resize: "none", wordBreak: "break-all" }} />
            <button onClick={copy} style={{ ...miniBtn(C.accent, false), marginTop: 8 }}>
              {copied ? <><Check size={14} /> 복사됨</> : <><Copy size={14} /> 코드 복사</>}
            </button>
          </div>
        )}
      </div>

      {/* import */}
      <div style={cardStyle}>
        <h3 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, margin: "0 0 10px" }}>코드 불러오기</h3>
        <textarea value={importCode} onChange={(e) => setImportCode(e.target.value)} placeholder="받은 공유 코드를 붙여넣으세요" className="tp-scroll" style={{ ...inputStyle, height: 70, fontSize: 11, fontFamily: "ui-monospace, monospace", resize: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
          <button onClick={doImport} style={miniBtn(C.accent, true)}><ArrowRight size={14} /> 불러오기</button>
          {importMsg && <span style={{ fontSize: 13, color: importMsg.includes("없") ? C.clay : C.accent }}>{importMsg}</span>}
        </div>
      </div>

      <p style={{ fontSize: 12, color: C.inkFaint, lineHeight: 1.6, margin: 0 }}>
        참고: 실시간 동시 편집은 서버 연결이 필요해요. 지금은 코드를 주고받는 방식으로 일정을 공유합니다. 코드를 다시 만들면 그 시점의 최신 일정이 담겨요.
      </p>
    </div>
  );
}

/* ------------------------------- shared UI bits ---------------------------- */
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: C.inkSoft, marginBottom: 7, letterSpacing: "0.01em" }}>{label}</label>
      {children}
    </div>
  );
}
function Stepper({ value, setValue, suffix }) {
  return (
    <div style={{ display: "flex", alignItems: "center", border: `1px solid ${C.line}`, borderRadius: 11, overflow: "hidden", background: C.surface }}>
      <button onClick={() => setValue(value - 1)} style={{ width: 40, height: 44, border: "none", background: "transparent", cursor: "pointer", color: C.inkSoft, fontSize: 18 }}>−</button>
      <div style={{ flex: 1, textAlign: "center", fontWeight: 600, fontSize: 15 }}>{value}{suffix}</div>
      <button onClick={() => setValue(value + 1)} style={{ width: 40, height: 44, border: "none", background: "transparent", cursor: "pointer", color: C.inkSoft, fontSize: 18 }}>+</button>
    </div>
  );
}
function EmptyHint({ icon: Icon, text }) {
  return (
    <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 20px", color: C.inkFaint }}>
      <Icon size={26} style={{ opacity: 0.5, marginBottom: 10 }} />
      <div style={{ fontSize: 14 }}>{text}</div>
    </div>
  );
}
function DeleteList({ items, onDelete, label }) {
  if (items.length === 0) return null;
  return (
    <details style={{ marginTop: 18 }}>
      <summary style={{ cursor: "pointer", color: C.inkFaint, fontSize: 12.5, listStyle: "none" }}>{label} 삭제 / 정리 ▾</summary>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
        {items.map((i) => (
          <span key={i.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 99, padding: "5px 11px" }}>
            {i.name}
            <button onClick={() => onDelete(i.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.clay, display: "flex", padding: 0 }}><X size={13} /></button>
          </span>
        ))}
      </div>
    </details>
  );
}

function AddInline({ label, fields, extra = {}, typeToggle, onAdd }) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState({});
  const [type, setType] = useState(extra.type || "hotel");
  const submit = () => {
    if (!vals.name || !vals.name.trim()) return;
    const out = { ...extra };
    fields.forEach((f) => { out[f.key] = f.num ? Number(vals[f.key]) || 0 : (vals[f.key] || ""); });
    if (typeToggle) out.type = type;
    onAdd(out); setVals({}); setOpen(false);
  };
  if (!open)
    return <button onClick={() => setOpen(true)} style={miniBtn(C.ink, true)}><Plus size={15} /> {label}</button>;
  return (
    <div style={{ position: "relative", zIndex: 5, background: C.surface, border: `1px solid ${C.accent}`, borderRadius: 14, padding: 14, display: "grid", gap: 8, width: "min(340px, 90vw)" }}>
      {typeToggle && (
        <div style={{ display: "flex", gap: 6 }}>
          {[["hotel", "호텔"], ["airbnb", "에어비앤비"]].map(([v, l]) => (
            <button key={v} onClick={() => setType(v)} style={pill(type === v)}>{l}</button>
          ))}
        </div>
      )}
      {fields.map((f) => (
        <input key={f.key} value={vals[f.key] || ""} type={f.num ? "number" : "text"}
          onChange={(e) => setVals((p) => ({ ...p, [f.key]: e.target.value }))}
          placeholder={f.ph} style={inputStyle} />
      ))}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={() => setOpen(false)} style={miniBtn(C.inkSoft, false)}><X size={14} /> 취소</button>
        <button onClick={submit} style={miniBtn(C.accent, true)}><Plus size={14} /> 추가</button>
      </div>
    </div>
  );
}

/* --------------------------------- styles ---------------------------------- */
const inputStyle = {
  width: "100%", padding: "11px 13px", borderRadius: 11, border: `1px solid ${C.line}`,
  background: C.surface, color: C.ink, fontSize: 14, lineHeight: 1.2,
};
const cardStyle = {
  background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, position: "relative",
};
function pill(on) {
  return {
    padding: "7px 14px", borderRadius: 99, fontSize: 13, cursor: "pointer", fontWeight: on ? 600 : 500,
    border: `1px solid ${on ? C.accent : C.line}`, background: on ? C.accentSoft : C.surface, color: on ? C.accentDeep : C.inkSoft,
  };
}
function miniBtn(color, filled) {
  return {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, cursor: "pointer",
    fontSize: 13.5, fontWeight: 600, border: filled ? "none" : `1px solid ${C.line}`,
    background: filled ? color : "transparent", color: filled ? "#fff" : color,
  };
}
function iconBtn(disabled, color = C.inkSoft) {
  return {
    width: 28, height: 26, display: "grid", placeItems: "center", borderRadius: 8, cursor: disabled ? "default" : "pointer",
    border: "none", background: "transparent", color: disabled ? C.inkFaint : color, opacity: disabled ? 0.4 : 1,
  };
}