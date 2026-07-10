const Theme = {
  KEY: "human-stopwatch-theme",

  init() {
    const stored = localStorage.getItem(Theme.KEY);
    const theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia?.("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    Theme.apply(theme);
  },

  apply(theme) {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(Theme.KEY, theme);
  },

  toggle() {
    const isDark = document.documentElement.classList.contains("dark");
    Theme.apply(isDark ? "light" : "dark");
    Theme.updateToggleIcon();
  },

  updateToggleIcon() {
    const btn = document.querySelector("[data-theme-toggle]");
    if (!btn) return;
    const isDark = document.documentElement.classList.contains("dark");
    btn.textContent = isDark ? "☀️" : "🌙";
    btn.title = isDark ? "라이트 모드" : "다크 모드";
  },

  mountToggleButton() {
    const btn = document.createElement("button");
    btn.className = "theme-toggle";
    btn.setAttribute("data-theme-toggle", "");
    btn.setAttribute("aria-label", "다크/라이트 모드 전환");
    btn.addEventListener("click", Theme.toggle);
    document.body.appendChild(btn);
    Theme.updateToggleIcon();
  },
};

Theme.init();
window.Theme = Theme;
