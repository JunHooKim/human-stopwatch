(function () {
  const COUNTDOWN_STEPS = [3, 2, 1];
  const COUNTDOWN_STEP_MS = 800;

  const els = {
    startScreen: document.getElementById("startScreen"),
    runningScreen: document.getElementById("runningScreen"),
    resultScreen: document.getElementById("resultScreen"),
    countdownOverlay: document.getElementById("countdownOverlay"),
    countdownValue: document.getElementById("countdownValue"),
    newRecordOverlay: document.getElementById("newRecordOverlay"),
    footerLink: document.getElementById("footerLink"),
    targetTimeLabel: document.getElementById("targetTimeLabel"),
    startBtn: document.getElementById("startBtn"),
    stopBtn: document.getElementById("stopBtn"),
    replayBtn: document.getElementById("replayBtn"),
    nicknameForm: document.getElementById("nicknameForm"),
    nicknameInput: document.getElementById("nicknameInput"),
    submitScoreBtn: document.getElementById("submitScoreBtn"),
    resultTarget: document.getElementById("resultTarget"),
    resultMeasured: document.getElementById("resultMeasured"),
    resultDiff: document.getElementById("resultDiff"),
    rankBox: document.getElementById("rankBox"),
    registeredNote: document.getElementById("registeredNote"),
    resultError: document.getElementById("resultError"),
  };

  let phase = "idle"; // idle | countdown | running | result
  let targetTime = 10;
  let startTimestamp = null;
  let measuredTime = null;
  let difference = null;
  const timeouts = [];

  Theme.mountToggleButton();

  function clearTimers() {
    timeouts.forEach((t) => clearTimeout(t));
    timeouts.length = 0;
  }

  function show(el) {
    el.classList.remove("hidden");
  }
  function hide(el) {
    el.classList.add("hidden");
  }

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

  function start() {
    if (phase !== "idle" && phase !== "result") return;
    clearTimers();
    measuredTime = null;
    difference = null;
    setPhase("countdown");
    els.countdownValue.className = "countdown-number";

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
    if (phase !== "running" || startTimestamp === null) return;
    const elapsedMs = performance.now() - startTimestamp;
    measuredTime = elapsedMs / 1000;
    difference = Math.abs(measuredTime - targetTime);
    startTimestamp = null;
    renderResult();
    setPhase("result");
  }

  function renderResult() {
    els.resultTarget.textContent = Format.seconds(targetTime);
    els.resultMeasured.textContent = Format.seconds(measuredTime);
    const diffSigned = measuredTime - targetTime;
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
    if (measuredTime === null || difference === null) return;
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
      const bestBefore = await RankingApi.fetchBestDifference();
      const saved = await RankingApi.insertScore({
        nickname,
        target_time: targetTime,
        measured_time: measuredTime,
        difference,
      });
      const rank = await RankingApi.fetchRankOf(saved);

      hide(els.nicknameForm);
      els.rankBox.textContent = `🏅 현재 랭킹 ${rank}위`;
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
    // 파티클 생성
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
  els.startBtn.addEventListener("click", start);
  els.stopBtn.addEventListener("click", stop);
  els.replayBtn.addEventListener("click", reset);
  els.nicknameForm.addEventListener("submit", handleSubmit);

  window.addEventListener("keydown", (e) => {
    const target = e.target;
    const isTyping = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
    if (isTyping) return;

    if (e.code === "Enter" && (phase === "idle" || phase === "result")) {
      e.preventDefault();
      start();
    } else if (e.code === "Space" && phase === "running") {
      e.preventDefault();
      stop();
    }
  });

  // ----- 목표 시간 로드 + 실시간 반영 -----
  async function loadSettings() {
    const settings = await RankingApi.fetchSettings();
    targetTime = Number(settings.target_time) || 10;
    els.targetTimeLabel.textContent = `${targetTime.toFixed(3)}초`;
  }
  loadSettings();
  RankingApi.subscribeSettings((next) => {
    if (next?.target_time !== undefined) {
      targetTime = Number(next.target_time);
      els.targetTimeLabel.textContent = `${targetTime.toFixed(3)}초`;
    }
  });

  setPhase("idle");
})();
