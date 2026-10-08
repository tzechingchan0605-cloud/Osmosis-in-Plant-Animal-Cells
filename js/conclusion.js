const highlights = {
  en: {
    hypoMovement: ["net", "into the cell", "equilibrium"],
    hypoBurstMovement: ["net", "into the cell"],
    hyperMovement: ["net", "out of the cell", "equilibrium"],
    isoMovement: ["equal rates", "no net movement"],
    unchangedDescription: ["remained unchanged"],
    turgidDescription: ["turgid", "equilibrium"],
    plasmolysedDescription: ["plasmolysis", "flaccid"],
    flaccidDescription: ["flaccid"],
    wrinkledDescription: ["shrank", "wrinkled"],
    swollenDescription: ["swelled", "equilibrium"],
    haemolysisDescription: ["swelled", "burst", "haemoglobin", "haemolysis"],
    xResult: ["equally", "unchanged"],
    yResult: ["LOWER", "into Y", "increased"],
    zResult: ["HIGHER", "out of Z", "decreased"],
    finalEquilibriumNote: ["no net movement"],
  },
  zh: {
    hypoMovement: ["淨", "進入細胞", "平衡"],
    hypoBurstMovement: ["淨", "進入細胞"],
    hyperMovement: ["淨", "離開細胞", "平衡"],
    isoMovement: ["速率相同", "沒有淨移動"],
    unchangedDescription: ["維持不變"],
    turgidDescription: ["硬脹", "平衡"],
    plasmolysedDescription: ["質壁分離", "軟縮"],
    flaccidDescription: ["軟縮"],
    wrinkledDescription: ["萎縮", "皺褶"],
    swollenDescription: ["膨脹", "平衡"],
    haemolysisDescription: ["膨脹", "爆裂", "血紅蛋白", "溶血"],
    xResult: ["速率相同", "維持不變"],
    yResult: ["低", "淨", "進入 Y", "增加"],
    zResult: ["高", "淨", "離開 Z", "減少"],
    finalEquilibriumNote: ["沒有淨移動"],
  },
};

export function conclusionPoint(key, t, parameters = {}) {
  const language = document.documentElement.lang.startsWith("zh") ? "zh" : "en";
  const text = t(key, parameters);
  const ranges = (highlights[language][key] ?? [])
    .map((term) => ({
      start: text.indexOf(term),
      term,
    }))
    .filter((range) => range.start >= 0)
    .sort((a, b) => a.start - b.start);
  const point = document.createElement("li");
  let offset = 0;
  for (const { start, term } of ranges) {
    if (start < offset) continue;
    point.append(document.createTextNode(text.slice(offset, start)));
    const emphasis = document.createElement("strong");
    emphasis.className = "key-point";
    emphasis.textContent = term;
    point.append(emphasis);
    offset = start + term.length;
  }
  point.append(document.createTextNode(text.slice(offset)));
  return point;
}
