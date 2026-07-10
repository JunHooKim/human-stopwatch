const RankingApi = {
  TOP_N: 10,

  async fetchTopScores(limit = RankingApi.TOP_N) {
    const { data, error } = await window.sb
      .from("scores")
      .select("*")
      .order("difference", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async fetchRecentScores(limit = 15) {
    const { data, error } = await window.sb
      .from("scores")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async fetchAllScores() {
    const { data, error } = await window.sb
      .from("scores")
      .select("*")
      .order("difference", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async fetchBestDifference() {
    const { data, error } = await window.sb
      .from("scores")
      .select("difference")
      .order("difference", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? Number(data.difference) : null;
  },

  async insertScore(input) {
    const { data, error } = await window.sb
      .from("scores")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async fetchRankOf(score) {
    const { count: betterCount, error: e1 } = await window.sb
      .from("scores")
      .select("id", { count: "exact", head: true })
      .lt("difference", score.difference);
    if (e1) throw e1;

    const { count: tieEarlierCount, error: e2 } = await window.sb
      .from("scores")
      .select("id", { count: "exact", head: true })
      .eq("difference", score.difference)
      .lt("created_at", score.created_at);
    if (e2) throw e2;

    return (betterCount ?? 0) + (tieEarlierCount ?? 0) + 1;
  },

  subscribeScores(onChange) {
    const channel = window.sb
      .channel("scores_changes_" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, () =>
        onChange(),
      )
      .subscribe();
    return () => window.sb.removeChannel(channel);
  },

  async fetchSettings() {
    const { data, error } = await window.sb
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return data ?? { id: 1, target_time: 10 };
  },

  subscribeSettings(onChange) {
    const channel = window.sb
      .channel("settings_changes_" + Math.random().toString(36).slice(2))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        (payload) => onChange(payload.new),
      )
      .subscribe();
    return () => window.sb.removeChannel(channel);
  },

  // ----- 관리자 전용 -----
  async updateScoreNickname(id, nickname) {
    const { error } = await window.sb.from("scores").update({ nickname }).eq("id", id);
    if (error) throw error;
  },

  async deleteScore(id) {
    const { error } = await window.sb.from("scores").delete().eq("id", id);
    if (error) throw error;
  },

  async deleteAllScores() {
    const { error } = await window.sb
      .from("scores")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw error;
  },

  async insertScoresBulk(inputs) {
    if (inputs.length === 0) return;
    const { error } = await window.sb.from("scores").insert(inputs);
    if (error) throw error;
  },

  async updateTargetTime(targetTime) {
    const { error } = await window.sb
      .from("app_settings")
      .update({ target_time: targetTime, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw error;
  },
};

window.RankingApi = RankingApi;
