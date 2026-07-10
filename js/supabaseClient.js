// window.supabase 는 CDN에서 로드한 @supabase/supabase-js UMD 라이브러리입니다.
// 우리가 만든 클라이언트 인스턴스는 window.sb 에 저장해 이름 충돌을 피합니다.
(function () {
  const cfg = window.APP_CONFIG || {};
  const url = cfg.SUPABASE_URL || "https://placeholder.supabase.co";
  const key = cfg.SUPABASE_ANON_KEY || "placeholder-anon-key";

  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    console.warn(
      "[Supabase] js/config.js 에 SUPABASE_URL / SUPABASE_ANON_KEY 를 설정해주세요.",
    );
  }

  window.sb = window.supabase.createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  window.ADMIN_EMAIL = cfg.ADMIN_EMAIL || "";
})();
