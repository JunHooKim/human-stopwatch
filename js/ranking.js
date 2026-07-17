(function () {
  const els = {
    leagueTabs: document.getElementById("leagueTabs"),
    boardList: document.getElementById("boardList"),
    boardEmpty: document.getElementById("boardEmpty"),
    ticker: document.getElementById("ticker"),
    tickerTrack: document.getElementById("tickerTrack"),
    targetTimeSub: document.getElementById("targetTimeSub"),
    newRecordOverlay: document.getElementById("newRecordOverlay"),
  };

  const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };
  let leagues = [];
  let activeLeagueKey = null;
  const prevBestIdByLeague = {};
  let loaded = false;

  Theme.mountToggleButton();

  function renderTabs() {
    els.leagueTabs.innerHTML = "";
    leagues.forEach((league) => {
      const tab = document.createElement("button");
      tab.className = `league-tab${league.key === activeLeagueKey ? " active" : ""}`;
      tab.textContent = league.label;
      tab.addEventListener("click", () => {
        activeLeagueKey = league.key;
        renderTabs();
        reload();
      });
      els.leagueTabs.appendChild(tab);
    });
  }

  function renderBoard(scores) {
    els.boardList.innerHTML = "";
    if (scores.length === 0) {
      els.boardEmpty.classList.remove("hidden");
      return;
    }
    els.boardEmpty.classList.add("hidden");

    scores.forEach((score, i) => {
      const rank = i + 1;
      const row = document.createElement("div");
      row.className = `rank-row${rank === 1 ? " top1" : ""}`;
      const diff = score.measured_time - score.target_time;
      row.innerHTML = `
        <span class="${MEDALS[rank] ? "rank-medal" : "rank-num"}">${MEDALS[rank] ?? rank}</span>
        <span class="rank-nickname">${Format.escapeHtml(score.nickname)}</span>
        <span class="rank-diff">${Format.difference(diff)}</span>
      `;
      els.boardList.appendChild(row);
    });
  }

  function renderTicker(scores) {
    if (scores.length === 0) {
      els.ticker.style.display = "none";
      return;
    }
    els.ticker.style.display = "flex";
    const items = [...scores, ...scores];
    els.tickerTrack.innerHTML = items
      .map((score) => {
        const diff = score.measured_time - score.target_time;
        return `<span class="ticker-item"><strong>${Format.escapeHtml(
          score.nickname,
        )}</strong><span>${Format.difference(diff)}</span></span>`;
      })
      .join("");
  }

  function celebrateNewRecord() {
    els.newRecordOverlay.querySelectorAll(".new-record-particle").forEach((p) => p.remove());
    const colors = ["var(--accent)", "var(--gold)"];
    for (let i = 0; i < 18; i += 1) {
      const p = document.createElement("span");
      p.className = "new-record-particle";
      p.style.left = `${(i * 97) % 100}%`;
      p.style.background = colors[i % 2];
      p.style.animationDuration = `${2.2 + (i % 5) * 0.3}s`;
      p.style.animationDelay = `${i * 0.05}s`;
      els.newRecordOverlay.appendChild(p);
    }
    els.newRecordOverlay.classList.remove("hidden");
    setTimeout(() => els.newRecordOverlay.classList.add("hidden"), 3500);
  }

  async function reload() {
    if (!activeLeagueKey) return;
    const activeLeague = leagues.find((l) => l.key === activeLeagueKey);
    if (activeLeague) {
      els.targetTimeSub.textContent = `· 목표 ${Number(activeLeague.target_time).toFixed(3)}초`;
    }

    const [top, recent] = await Promise.all([
      RankingApi.fetchTopScores(activeLeagueKey, 10),
      RankingApi.fetchRecentScores(activeLeagueKey, 15),
    ]);
    renderBoard(top);
    renderTicker(recent);

    if (top.length > 0) {
      const currentBestId = top[0].id;
      const prevBestId = prevBestIdByLeague[activeLeagueKey];
      if (loaded && prevBestId && prevBestId !== currentBestId) {
        celebrateNewRecord();
      }
      prevBestIdByLeague[activeLeagueKey] = currentBestId;
    }
    loaded = true;
  }

  async function init() {
    leagues = await RankingApi.fetchLeagues();
    if (leagues.length === 0) return;
    activeLeagueKey = leagues[0].key;
    renderTabs();
    await reload();
  }

  init();
  RankingApi.subscribeScores(reload);
  RankingApi.subscribeLeagues(async () => {
    leagues = await RankingApi.fetchLeagues();
    renderTabs();
    reload();
  });
})();
