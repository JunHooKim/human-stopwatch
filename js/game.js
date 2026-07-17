(function () {
  const COUNTDOWN_STEPS = [3, 2, 1];
  const COUNTDOWN_STEP_MS = 800;
  const LEAGUE_EMOJI = { "3s": "⚡", "5s": "🎯", "10s": "⏱️" };

  const els = {
    startScreen: document.getElementById("startScreen"),
    leagueButtons: document.getElementById("leagueButtons"),
    runningScreen: document.getElementById("runningScreen"),
    resultScreen: document.getElementById("resultScreen"),
    resultLeagueTitle: document.getElementById("resultLeagueTitle"),
    countdownOverlay: document.getElementById("countdownOverlay"),
    countdownValue: document.getElementById("countdownValue"),
    newRecordOverlay: document.getElementById("newRecordOverlay"),
    footerLink: document.getElementById("footerLink"),
    stopBtn: document.getElementById("stopBtn"),
    replayBtn: document.getElementById("replayBtn"),
    nicknameForm: document.getElementById("nicknameForm"),
    nicknameInput: document.getElementById("nicknameInput"),
    submitScoreBtn: document.getElementById("submitScoreBtn"),
    resultMeasured: document.getElementById("resultMeasured"),
    resultDiff: document.getElementById("resultDiff"),
    rankBox: document.getElementById("rankBox"),
    registeredNote: document.getElementById("registeredNote"),
    resultError: document.getElementById("resultError"),
  };

  let phase = "idle"; // idle | countdown | running | result
  let leagues = [];
  let selectedLeague = null; // { key, label, target_time }
  let startTimestamp = null;
  let measuredTime = null;
  let difference = null;
  const timeouts = [];

  Theme.mountToggleButton();

  function clearTimers() {
    timeouts.forEach((t) => clearTimeout(t));
    timeouts.length = 0;
  }
  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }

  function setPhase(next) {
    phase = next;
    hide(els.startScreen);
    hide(els.runningScreen);
    hide(els.resultScreen);
    hide(els.countdownOverlay);
    hide(els.footerLink);

    if (next === "idle") {
      show(els.startScreen);
      show(els.footerLink);
    } else if (next === "countdown") {
      show(els.countdownOverlay);
    } else if (next === "running") {
      show(els.runningScreen);
    } else if (next === "result") {
      show(els.resultScreen);
    }
  }

  // ----- 리그 로드 & 버튼 렌더링 -----
  async function loadLeagues() {
    leagues = await RankingApi.fetchLeagues();
    renderLeagueButtons();
  }

  function renderLeagueButtons() {
    els.leagueButtons.innerHTML = "";
    leagues.forEach((league, i) => {
      const btn = document.createElement("button");
      btn.className = "league-btn";
      btn.dataset.key = league.key;
      btn.innerHTML = `
        <span class="league-emoji">${LEAGUE_EMOJI[league.key] ?? "🏁"}</span>
        <span class="league-label">${Format.escapeHtml(league.label)}</span>
        <span class="league-key-hint">키보드 ${i + 1}</span>
      `;
      btn.addEventListener("click", () => start(league));
      els.leagueButtons.appendChild(btn);
    });
  }

  RankingApi.subscribeLeagues(loadLeagues);

  function start(league) {
    if (phase !== "idle" && phase !== "result") return;
    if (!league) return;
    selectedLeague = league;
    clearTimers();
    measuredTime = null;
    difference = null;
    setPhase("countdown");

    COUNTDOWN_STEPS.forEach((step, i) => {
      timeouts.push(
        setTimeout(() => {
          els.countdownValue.textContent = String(step);
          els.countdownValue.classList.remove("countdown-number");
          void els.countdownValue.offsetWidth;
          els.countdownValue.classList.add("countdown-number");
        }, i * COUNTDOWN_STEP_MS),
      );
    });

    timeouts.push(
      setTimeout(
        () => {
          els.countdownValue.textContent = "GO";
          els.countdownValue.classList.remove("countdown-number", "countdown-go");
          void els.countdownValue.offsetWidth;
          els.countdownValue.classList.add("countdown-go");
          startTimestamp = performance.now();
          setPhase("running");
        },
        COUNTDOWN_STEPS.length * COUNTDOWN_STEP_MS,
      ),
    );
  }

  function stop() {
    if (phase !== "running" || startTimestamp === null || !selectedLeague) return;
    const elapsedMs = performance.now() - startTimestamp;
    measuredTime = elapsedMs / 1000;
    difference = Math.abs(measuredTime - Number(selectedLeague.target_time));
    startTimestamp = null;
    renderResult();
    setPhase("result");
  }

  function renderResult() {
    els.resultLeagueTitle.textContent = selectedLeague.label;
    els.resultMeasured.textContent = Format.seconds(measuredTime);
    const diffSigned = measuredTime - Number(selectedLeague.target_time);
    els.resultDiff.textContent = Format.difference(diffSigned);
    els.resultDiff.classList.toggle("diff-good", Math.abs(diffSigned) < 0.05);

    hide(els.rankBox);
    hide(els.registeredNote);
    hide(els.resultError);
    show(els.nicknameForm);
    els.nicknameInput.value = "";
    els.nicknameInput.disabled = false;
    els.submitScoreBtn.disabled = false;
    els.submitScoreBtn.textContent = "랭킹 등록";
  }

  function reset() {
    clearTimers();
    startTimestamp = null;
    measuredTime = null;
    difference = null;
    setPhase("idle");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (measuredTime === null || difference === null || !selectedLeague) return;
    const nickname = els.nicknameInput.value.trim();
    hide(els.resultError);

    if (!nickname) {
      showError("닉네임을 입력해주세요");
      return;
    }
    if (nickname.length > 12) {
      showError("닉네임은 12자 이내로 입력해주세요");
      return;
    }

    els.nicknameInput.disabled = true;
    els.submitScoreBtn.disabled = true;
    els.submitScoreBtn.textContent = "등록 중…";

    try {
      const bestBefore = await RankingApi.fetchBestDifference(selectedLeague.key);
      const saved = await RankingApi.insertScore({
        nickname,
        league_key: selectedLeague.key,
        target_time: Number(selectedLeague.target_time),
        measured_time: measuredTime,
        difference,
      });
      const rank = await RankingApi.fetchRankOf(saved);

      hide(els.nicknameForm);
      els.rankBox.textContent = `🏅 ${selectedLeague.label} 현재 랭킹 ${rank}위`;
      show(els.rankBox);
      show(els.registeredNote);

      if (bestBefore === null || difference < bestBefore) {
        celebrateNewRecord();
      }
    } catch (err) {
      showError(err?.message || "등록 중 오류가 발생했습니다.");
      els.nicknameInput.disabled = false;
      els.submitScoreBtn.disabled = false;
      els.submitScoreBtn.textContent = "랭킹 등록";
    }
  }

  function showError(msg) {
    els.resultError.textContent = msg;
    show(els.resultError);
  }

  function celebrateNewRecord() {
    els.newRecordOverlay.querySelectorAll(".new-record-particle").forEach((p) => p.remove());
    const colors = ["var(--accent)", "var(--gold)"];
    for (let i = 0; i < 18; i += 1) {
      const p = document.createElement("span");
      p.className = "new-record-particle";
      p.style.left = `${(i * 97) % 100}%`;
      p.style.background = colors[i % 2];
      const duration = 2.2 + (i % 5) * 0.3;
      const delay = i * 0.05;
      p.style.animationDuration = `${duration}s`;
      p.style.animationDelay = `${delay}s`;
      els.newRecordOverlay.appendChild(p);
    }
    show(els.newRecordOverlay);
    setTimeout(() => hide(els.newRecordOverlay), 3200);
  }

  // ----- 이벤트 바인딩 -----
  els.stopBtn.addEventListener("click", stop);
  els.replayBtn.addEventListener("click", reset);
  els.nicknameForm.addEventListener("submit", handleSubmit);

  window.addEventListener("keydown", (e) => {
    const target = e.target;
    const isTyping = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
    if (isTyping) return;

    if (["Digit1", "Digit2", "Digit3"].includes(e.code) && phase === "idle") {
      const idx = Number(e.code.slice(-1)) - 1;
      if (leagues[idx]) {
        e.preventDefault();
        start(leagues[idx]);
      }
    } else if (e.code === "Enter" && phase === "result") {
      e.preventDefault();
      reset();
    } else if (e.code === "Space" && phase === "running") {
      e.preventDefault();
      stop();
    }
  });

  loadLeagues();
  setPhase("idle");
})();
