(function () {
  const els = {
    loginWrap: document.getElementById("loginWrap"),
    adminMain: document.getElementById("adminMain"),
    loginForm: document.getElementById("loginForm"),
    passwordInput: document.getElementById("passwordInput"),
    loginError: document.getElementById("loginError"),
    loginBtn: document.getElementById("loginBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    targetTimeInput: document.getElementById("targetTimeInput"),
    saveTargetBtn: document.getElementById("saveTargetBtn"),
    savedNote: document.getElementById("savedNote"),
    resetAllBtn: document.getElementById("resetAllBtn"),
    downloadCsvBtn: document.getElementById("downloadCsvBtn"),
    uploadCsvBtn: document.getElementById("uploadCsvBtn"),
    csvFileInput: document.getElementById("csvFileInput"),
    csvMessage: document.getElementById("csvMessage"),
    scoreTableBody: document.getElementById("scoreTableBody"),
    scoreTableEmpty: document.getElementById("scoreTableEmpty"),
  };

  let currentScores = [];
  let unsubscribeScores = null;
  let editingId = null;

  Theme.mountToggleButton();

  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }

  // ----- 인증 -----
  async function checkSession() {
    const { data } = await window.sb.auth.getSession();
    setAuthed(Boolean(data.session));
  }

  function setAuthed(isAuthed) {
    if (isAuthed) {
      hide(els.loginWrap);
      show(els.adminMain);
      initAdmin();
    } else {
      show(els.loginWrap);
      hide(els.adminMain);
      if (unsubscribeScores) {
        unsubscribeScores();
        unsubscribeScores = null;
      }
    }
  }

  window.sb.auth.onAuthStateChange((_event, session) => {
    setAuthed(Boolean(session));
  });

  els.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = els.passwordInput.value;
    if (!password) return;
    hide(els.loginError);
    els.loginBtn.disabled = true;
    els.loginBtn.textContent = "확인 중…";

    if (!window.ADMIN_EMAIL) {
      showLoginError("관리자 이메일(js/config.js의 ADMIN_EMAIL)이 설정되지 않았습니다.");
      resetLoginBtn();
      return;
    }

    const { error } = await window.sb.auth.signInWithPassword({
      email: window.ADMIN_EMAIL,
      password,
    });

    if (error) {
      showLoginError("비밀번호가 올바르지 않습니다.");
    }
    resetLoginBtn();
  });

  function showLoginError(msg) {
    els.loginError.textContent = msg;
    show(els.loginError);
  }
  function resetLoginBtn() {
    els.loginBtn.disabled = false;
    els.loginBtn.textContent = "로그인";
  }

  els.logoutBtn.addEventListener("click", async () => {
    await window.sb.auth.signOut();
  });

  // ----- 관리자 메인 초기화 -----
  async function initAdmin() {
    await loadSettings();
    await reloadScores();
    if (!unsubscribeScores) {
      unsubscribeScores = RankingApi.subscribeScores(reloadScores);
    }
  }

  async function loadSettings() {
    const settings = await RankingApi.fetchSettings();
    els.targetTimeInput.value = Number(settings.target_time);
  }

  els.saveTargetBtn.addEventListener("click", async () => {
    const parsed = Number(els.targetTimeInput.value);
    if (Number.isNaN(parsed) || parsed <= 0) return;
    els.saveTargetBtn.disabled = true;
    els.saveTargetBtn.textContent = "저장 중…";
    try {
      await RankingApi.updateTargetTime(parsed);
      show(els.savedNote);
      setTimeout(() => hide(els.savedNote), 2000);
    } finally {
      els.saveTargetBtn.disabled = false;
      els.saveTargetBtn.textContent = "저장";
    }
  });

  els.resetAllBtn.addEventListener("click", async () => {
    const ok = window.confirm("정말로 전체 랭킹을 초기화할까요? 이 작업은 되돌릴 수 없습니다.");
    if (!ok) return;
    await RankingApi.deleteAllScores();
    await reloadScores();
  });

  // ----- CSV -----
  els.downloadCsvBtn.addEventListener("click", () => {
    Csv.download(`human-stopwatch-scores-${Date.now()}.csv`, Csv.scoresToCsv(currentScores));
  });

  els.uploadCsvBtn.addEventListener("click", () => els.csvFileInput.click());

  els.csvFileInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    hide(els.csvMessage);
    els.uploadCsvBtn.disabled = true;
    els.uploadCsvBtn.textContent = "업로드 중…";
    try {
      const text = await file.text();
      const parsed = Csv.parseScoresCsv(text);
      await RankingApi.insertScoresBulk(parsed);
      await reloadScores();
      showCsvMessage("업로드가 완료되었습니다.");
    } catch (err) {
      showCsvMessage(err?.message || "업로드 중 오류가 발생했습니다.");
    } finally {
      els.uploadCsvBtn.disabled = false;
      els.uploadCsvBtn.textContent = "⬆ CSV 업로드";
      els.csvFileInput.value = "";
    }
  });

  function showCsvMessage(msg) {
    els.csvMessage.textContent = msg;
    show(els.csvMessage);
  }

  // ----- 기록 테이블 -----
  async function reloadScores() {
    currentScores = await RankingApi.fetchAllScores();
    renderScoreTable();
  }

  function renderScoreTable() {
    els.scoreTableBody.innerHTML = "";
    if (currentScores.length === 0) {
      show(els.scoreTableEmpty);
      return;
    }
    hide(els.scoreTableEmpty);

    currentScores.forEach((score, i) => {
      const tr = document.createElement("tr");
      const diff = score.measured_time - score.target_time;
      const nicknameCell =
        editingId === score.id
          ? `<input class="edit-input" id="editInput-${score.id}" value="${Format.escapeHtml(score.nickname)}" />`
          : Format.escapeHtml(score.nickname);

      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${nicknameCell}</td>
        <td>${Format.seconds(score.target_time)}</td>
        <td>${Format.seconds(score.measured_time)}</td>
        <td>${Format.difference(diff)}</td>
        <td>${Format.dateTime(score.created_at)}</td>
        <td>
          <div class="row-actions">
            ${
              editingId === score.id
                ? `<button class="btn btn-sm btn-primary" data-action="save" data-id="${score.id}">저장</button>`
                : `<button class="btn btn-sm btn-secondary" data-action="edit" data-id="${score.id}">수정</button>`
            }
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${score.id}">삭제</button>
          </div>
        </td>
      `;
      els.scoreTableBody.appendChild(tr);
    });

    if (editingId) {
      const input = document.getElementById(`editInput-${editingId}`);
      if (input) {
        input.focus();
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") saveEdit(editingId, input.value);
          if (e.key === "Escape") {
            editingId = null;
            renderScoreTable();
          }
        });
      }
    }
  }

  els.scoreTableBody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === "edit") {
      editingId = id;
      renderScoreTable();
    } else if (action === "save") {
      const input = document.getElementById(`editInput-${id}`);
      await saveEdit(id, input?.value ?? "");
    } else if (action === "delete") {
      const ok = window.confirm("이 기록을 삭제할까요?");
      if (!ok) return;
      await RankingApi.deleteScore(id);
      await reloadScores();
    }
  });

  async function saveEdit(id, nickname) {
    const trimmed = nickname.trim();
    if (trimmed) {
      await RankingApi.updateScoreNickname(id, trimmed);
    }
    editingId = null;
    await reloadScores();
  }

  checkSession();
})();
