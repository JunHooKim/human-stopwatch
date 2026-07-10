(function () {
  const els = {
    boardList: document.getElementById("boardList"),
    boardEmpty: document.getElementById("boardEmpty"),
    ticker: document.getElementById("ticker"),
    tickerTrack: document.getElementById("tickerTrack"),
    targetTimeSub: document.getElementById("targetTimeSub"),
    newRecordOverlay: document.getElementById("newRecordOverlay"),
  };

  const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };
  let prevBestId = null;
  let loaded = false;

  Theme.mountToggleButton();

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
    const [top, recent] = await Promise.all([
      RankingApi.fetchTopScores(10),
      RankingApi.fetchRecentScores(15),
    ]);
    renderBoard(top);
    renderTicker(recent);

    if (top.length > 0) {
      const currentBestId = top[0].id;
      if (loaded && prevBestId && prevBestId !== currentBestId) {
        celebrateNewRecord();
      }
      prevBestId = currentBestId;
    }
    loaded = true;
  }

  async function loadSettings() {
    const settings = await RankingApi.fetchSettings();
    els.targetTimeSub.textContent = `목표 시간 ${Number(settings.target_time).toFixed(3)}초`;
  }

  loadSettings();
  RankingApi.subscribeSettings((next) => {
    if (next?.target_time !== undefined) {
      els.targetTimeSub.textContent = `목표 시간 ${Number(next.target_time).toFixed(3)}초`;
    }
  });

  reload();
  RankingApi.subscribeScores(reload);
})();
