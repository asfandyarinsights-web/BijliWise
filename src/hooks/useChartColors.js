import { usePreferences } from "../context/preferencesContext";

// Recharts and SVG need real colour values, so charts read them from here instead of
// using fixed hex codes. Every pair keeps readable contrast on its theme's card colour.
const CHART_COLORS = {
  dark: {
    brand: "#10b981",
    axis: "#9aa5b4",
    grid: "rgb(148 163 184 / 0.12)",
    cursor: "rgb(148 163 184 / 0.08)",
    track: "rgb(148 163 184 / 0.18)",
    text: "#f8fafc",
    average: "#9aa5b4",
  },
  oled: {
    brand: "#10b981",
    axis: "#a1a9b5",
    grid: "rgb(255 255 255 / 0.10)",
    cursor: "rgb(255 255 255 / 0.07)",
    track: "rgb(255 255 255 / 0.16)",
    text: "#f8fafc",
    average: "#a1a9b5",
  },
  light: {
    brand: "#059669",
    axis: "#4b5a6e",
    grid: "rgb(15 23 42 / 0.10)",
    cursor: "rgb(15 23 42 / 0.06)",
    track: "rgb(15 23 42 / 0.12)",
    text: "#0f172a",
    average: "#64748b",
  },
};

export function getChartColors(theme) {
  return CHART_COLORS[theme] ?? CHART_COLORS.dark;
}

export function useChartColors() {
  return getChartColors(usePreferences().resolvedTheme);
}