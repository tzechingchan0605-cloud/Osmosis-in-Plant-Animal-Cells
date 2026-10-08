const highlights = {
  en: {
    hypoMovementNow: [
      "net",
      "into the cell",
      "equilibrium has not yet been reached",
    ],
    hyperMovementNow: [
      "net",
      "out of the cell",
      "equilibrium has not yet been reached",
    ],
    turgidNowDescription: ["turgid"],
    swollenNowDescription: ["swelling", "has not burst"],
    wrinkledNowDescription: ["shrinking", "wrinkled"],
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
    lysedDescription: ["swelled", "burst", "cytoplasm"],
    xResult: ["equally", "unchanged"],
    yResult: ["HIGHER", "out of Y", "decreased"],
    zResult: ["LOWER", "into Z", "increased"],
    finalEquilibriumNote: ["no net movement"],
  },
  zh: {
    hypoMovementNow: ["淨", "進入細胞", "尚未達至平衡"],
    hyperMovementNow: ["淨", "離開細胞", "尚未達至平衡"],
    turgidNowDescription: ["硬脹"],
    swollenNowDescription: ["膨脹", "尚未爆裂"],
    wrinkledNowDescription: ["萎縮", "皺褶"],
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
    lysedDescription: ["膨脹", "爆裂", "細胞質"],
    xResult: ["速率相同", "維持不變"],
    yResult: ["高", "淨", "離開 Y", "減少"],
    zResult: ["低", "淨", "進入 Z", "增加"],
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
