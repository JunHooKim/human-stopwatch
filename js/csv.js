const Csv = {
  HEADERS: ["nickname", "target_time", "measured_time", "difference", "created_at"],

  escapeCell(value) {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  },

  scoresToCsv(scores) {
    const rows = scores.map((s) =>
      [s.nickname, s.target_time, s.measured_time, s.difference, s.created_at]
        .map((v) => Csv.escapeCell(String(v)))
        .join(","),
    );
    return [Csv.HEADERS.join(","), ...rows].join("\n");
  },

  download(filename, csv) {
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  parseLine(line) {
    const cells = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        cells.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current);
    return cells;
  },

  /** 관리자 CSV 업로드 파서. nickname, target_time, measured_time 컬럼이 필요합니다. */
  parseScoresCsv(text) {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length < 2) return [];

    const header = Csv.parseLine(lines[0]).map((h) => h.trim());
    const idx = {
      nickname: header.indexOf("nickname"),
      target_time: header.indexOf("target_time"),
      measured_time: header.indexOf("measured_time"),
      difference: header.indexOf("difference"),
    };
    if (idx.nickname === -1 || idx.target_time === -1 || idx.measured_time === -1) {
      throw new Error("CSV 헤더에 nickname, target_time, measured_time 컬럼이 필요합니다.");
    }

    return lines.slice(1).map((line) => {
      const cells = Csv.parseLine(line);
      const target_time = Number(cells[idx.target_time]);
      const measured_time = Number(cells[idx.measured_time]);
      const difference =
        idx.difference !== -1 && cells[idx.difference] !== undefined
          ? Number(cells[idx.difference])
          : Math.abs(measured_time - target_time);

      return {
        nickname: cells[idx.nickname]?.trim() || "익명",
        target_time,
        measured_time,
        difference,
      };
    });
  },
};

window.Csv = Csv;
