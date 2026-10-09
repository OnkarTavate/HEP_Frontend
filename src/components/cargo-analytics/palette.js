/**
 * Chart palette — validated with the dataviz six-check validator (light + dark).
 * Categorical slots are assigned by ENTITY, in fixed order, never cycled.
 * Status colours are reserved for state and always ship with an icon + label.
 */
export const SERIES = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#4a3aa7"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#9085e9"],
};

/** Entity → slot. Keep this stable so a filter never repaints survivors. */
export const ENTITY_SLOT = {
  eirIn: 0,
  eirOut: 1,
  weighments: 2,
  export: 0,
  import: 1,
  ooc: 2,
  scans: 3,
  gateEvents: 4,
  median: 0,
  p90: 1,
};

export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
  neutral: "#94a3b8",
};

export const SEQUENTIAL_BLUE = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#2a78d6", "#1c5cab", "#104281"];

export const SOURCE_COLOR = {
  TOS: "#2a78d6",
  WEIGHBRIDGE: "#eb6834",
  CUSTOMS: "#4a3aa7",
  GATE: "#1baf7a",
};

export const seriesColor = (entity, mode = "light") =>
  SERIES[mode][ENTITY_SLOT[entity] ?? 0];

export const CHART_INK = {
  grid: "#e5e7eb",
  axis: "#94a3b8",
  text: "#475569",
  textStrong: "#0f172a",
};
