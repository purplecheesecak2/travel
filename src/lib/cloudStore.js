// src/lib/cloudStore.js
// 앱과 Supabase 사이의 데이터 계층.
// 여행 객체는 trips.data(jsonb)에 통째로 저장하고, 멤버십으로 공유를 표현합니다.
import { supabase } from "./supabaseClient";

/* ------------------------------- 인증 ------------------------------- */
export const authApi = {
  getUser: async () => (await supabase.auth.getUser()).data.user,
  onChange: (cb) =>
    supabase.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null)),
  signUp: (email, password) => supabase.auth.signUp({ email, password }),
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signInWithLink: (email) =>
    supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    }),
  signOut: () => supabase.auth.signOut(),
};

/* --------------------------- 행 <-> 앱 객체 --------------------------- */
// DB 한 행을 앱의 trip 객체로. 메타데이터는 _ 접두사로 붙임.
function rowToTrip(row, role) {
  return {
    ...(row.data || {}),
    id: row.id,                 // 앱은 DB의 uuid를 trip.id로 사용
    _role: role || "editor",
    _shareToken: row.share_token,
    _ownerId: row.owner,
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

// 앱 객체에서 저장용 data만 추출 (메타·DB id 제거)
function tripToData(trip) {
  const clean = { ...trip };
  delete clean.id;
  delete clean._role;
  delete clean._shareToken;
  delete clean._ownerId;
  delete clean.updatedAt;
  return clean;
}

/* ------------------------------ 조회 ------------------------------- */
// 내가 멤버인 모든 여행을 { [id]: trip } 형태로
export async function listTrips() {
  const { data, error } = await supabase
    .from("trip_members")
    .select("role, trips(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const map = {};
  (data || []).forEach((m) => {
    if (m.trips) {
      const t = rowToTrip(m.trips, m.role);
      map[t.id] = t;
    }
  });
  return map;
}

/* ----------------------------- 생성/수정/삭제 ----------------------------- */
export async function createTrip(tripData) {
  // 사용자 정보를 두 경로로 확실히 가져옴
  let user = (await supabase.auth.getUser()).data.user;
  if (!user) {
    const { data } = await supabase.auth.getSession();
    user = data?.session?.user || null;
  }
  if (!user || !user.id) {
    throw new Error("로그인 정보가 없어요. 로그아웃했다가 다시 로그인해 주세요.");
  }

  const payload = { owner: user.id, data: tripToData(tripData) };
  console.log("[createTrip] owner =", user.id); // 확인용 로그

  const { data, error } = await supabase
    .from("trips")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return rowToTrip(data, "owner");
}

export async function updateTrip(id, tripData) {
  const { error } = await supabase
    .from("trips")
    .update({ data: tripToData(tripData) })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTrip(id) {
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------ 공유 ------------------------------- */
// 공유 링크의 토큰으로 여행 참여 → 참여한 trip id 반환
export async function joinByToken(token) {
  const { data, error } = await supabase.rpc("join_trip", { p_token: token });
  if (error) throw error;
  return data;
}

// 여행의 멤버 목록 (이메일까지 보려면 별도 설정 필요 — 여기선 user_id/role만)
export async function listMembers(tripId) {
  const { data, error } = await supabase
    .from("trip_members")
    .select("user_id, role, created_at")
    .eq("trip_id", tripId);
  if (error) throw error;
  return data || [];
}

/* ----------------------------- 실시간 ----------------------------- */
// 내가 볼 수 있는 여행/멤버십에 변화가 생기면 onChange() 호출.
// (보안을 위해 변경 내용을 직접 신뢰하지 않고, onChange 안에서 다시 조회하도록 설계)
export function subscribeTrips(onChange) {
  const channel = supabase
    .channel("yeojeong-trips")
    .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => onChange())
    .on("postgres_changes", { event: "*", schema: "public", table: "trip_members" }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(channel);
}