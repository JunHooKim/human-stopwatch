const Format = {
  seconds(value, digits = 3) {
    return `${value.toFixed(digits)}초`;
  },
  difference(value, digits = 3) {
    const sign = value > 0 ? "+" : value < 0 ? "" : "±";
    return `${sign}${value.toFixed(digits)}초`;
  },
  dateTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  },
  escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },
};

window.Format = Format;
