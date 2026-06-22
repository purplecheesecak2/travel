// src/lib/supabaseClient.js
// Supabase 연결 클라이언트. 키는 .env 파일에서 읽어옵니다.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.warn(
    "[Supabase] 환경변수가 없습니다. 프로젝트 루트에 .env 파일을 만들고\n" +
    "VITE_SUPABASE_URL 과 VITE_SUPABASE_ANON_KEY 를 넣어 주세요."
  );
}

export const supabase = createClient(url, anon);