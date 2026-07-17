const RankingApi = {
  TOP_N: 10,

  // ----- 리그 -----
  async fetchLeagues() {
    const { data, error } = await window.sb
      .from("leagues")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  subscribeLeagues(onChange) {
    const channel = window.sb
      .channel("leagues_changes_" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "*", schema: "public", table: "leagues" }, () =>
        onChange(),
      )
      .subscribe();
    return () => window.sb.removeChannel(channel);
  },

  async updateLeagueTargetTime(key, targetTime) {
    const { error } = await window.sb
      .from("leagues")
      .update({ target_time: targetTime })
      .eq("key", key);
    if (error) throw error;
  },

  // ----- 랭킹 조회 (리그별) -----
  async fetchTopScores(leagueKey, limit = RankingApi.TOP_N) {
    const { data, error } = await window.sb
      .from("scores")
      .select("*")
      .eq("league_key", leagueKey)
      .order("difference", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async fetchRecentScores(leagueKey, limit = 15) {
    let query = window.sb
      .from("scores")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (leagueKey) query = query.eq("league_key", leagueKey);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async fetchAllScores() {
    const { data, error } = await window.sb
      .from("scores")
      .select("*")
      .order("league_key", { ascending: true })
      .order("difference", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async fetchBestDifference(leagueKey) {
    const { data, error } = await window.sb
      .from("scores")
      .select("difference")
      .eq("league_key", leagueKey)
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
      .eq("league_key", score.league_key)
      .lt("difference", score.difference);
    if (e1) throw e1;

    const { count: tieEarlierCount, error: e2 } = await window.sb
      .from("scores")
      .select("id", { count: "exact", head: true })
      .eq("league_key", score.league_key)
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
};

window.RankingApi = RankingApi;
