/**
 * Infection Prediction Engine
 * ────────────────────────────
 * Uses latest real (non-idle) sensor readings.
 * bodyTemp values already have +5°C offset applied from sensors.js transform.
 */

const STALE_MS = 2 * 60 * 1000;

const VALID = {
  bodyTemp: [35, 47],   // after +5 offset, real readings are 36-43°C
  ph:       [0,  14],
  moisture: [0,  100],
};

// Temperature thresholds (post +5°C offset)
const TEMP = {
  normal:   [36.1, 37.5],
  lowFever: [37.5, 38.5],
  highFever: 38.5,
};

const PH = {
  normal:   [4.0, 5.5],
  elevated: [5.5, 6.5],
  high:     6.5,
};

const MOIST = {
  normal:   75,
  high:     85,
};

const COLORS = {
  high:      { color: "#f87171", bg: "#2d0a0a", border: "#dc2626", dot: "#ef4444" },
  medium:    { color: "#fbbf24", bg: "#2d1a00", border: "#d97706", dot: "#f59e0b" },
  lowMedium: { color: "#fb923c", bg: "#2d1200", border: "#c2410c", dot: "#f97316" },
  low:       { color: "#4ade80", bg: "#052e16", border: "#16a34a", dot: "#22c55e" },
  unknown:   { color: "#475569", bg: "#0f172a", border: "#1e293b", dot: "#475569" },
};

function isValid(key, val) {
  if (val === null || val === undefined || isNaN(val)) return false;
  const [min, max] = VALID[key];
  return val >= min && val <= max;
}

function classifyTemp(v) {
  if (v >= TEMP.highFever)   return "highFever";
  if (v >= TEMP.lowFever[0]) return "lowFever";
  if (v >= TEMP.normal[0])   return "normal";
  return "belowNormal";
}

function classifyPh(v) {
  if (v >= PH.high)          return "high";
  if (v >= PH.elevated[0])   return "elevated";
  return "normal";
}

function classifyMoisture(v) {
  if (v >= MOIST.high)       return "high";
  if (v >= MOIST.normal)     return "elevated";
  return "normal";
}

function result(riskLevel, riskLabel, type, description, colors) {
  return { riskLevel, riskLabel, type, description, ...colors };
}

export function predictInfection(values, lastUpdated) {
  const now = Date.now();

  const fresh = {
    bodyTemp: !!(lastUpdated.bodyTemp && (now - lastUpdated.bodyTemp) < STALE_MS),
    ph:       !!(lastUpdated.ph       && (now - lastUpdated.ph)       < STALE_MS),
    moisture: !!(lastUpdated.moisture && (now - lastUpdated.moisture) < STALE_MS),
  };

  const available = {
    bodyTemp: fresh.bodyTemp && isValid("bodyTemp", values.bodyTemp) ? values.bodyTemp : null,
    ph:       fresh.ph       && isValid("ph",       values.ph)       ? values.ph       : null,
    moisture: fresh.moisture && isValid("moisture", values.moisture) ? values.moisture  : null,
  };

  const count = Object.values(available).filter(v => v !== null).length;

  if (count === 0) {
    return {
      riskLevel: "unknown", riskLabel: "NO DATA",
      type: "Awaiting sensor readings",
      description: "No valid sensor data available yet.",
      ...COLORS.unknown,
      freshSensors: fresh, available, partial: false, noData: true,
    };
  }

  const tc = available.bodyTemp !== null ? classifyTemp(available.bodyTemp)    : null;
  const pc = available.ph       !== null ? classifyPh(available.ph)            : null;
  const mc = available.moisture !== null ? classifyMoisture(available.moisture) : null;
  const partial = count < 3;

  let prediction;

  // ── HIGH RISK ────────────────────────────────────────────
  if (tc === "highFever" && pc === "high" && mc === "high") {
    prediction = result("high", "HIGH RISK", "Bacterial Infection",
      "High fever, alkaline wound pH and excessive moisture — strong indicators of bacterial infection.",
      COLORS.high);

  } else if (tc === "highFever" && pc === "high") {
    prediction = result("high", "HIGH RISK", "Inflammatory Infection",
      "High fever with elevated wound pH — active inflammatory infection likely.",
      COLORS.high);

  } else if (tc === "highFever" && mc === "high") {
    prediction = result("high", "HIGH RISK", "Wound Infection",
      "High fever with excessive wound moisture — likely active wound infection.",
      COLORS.high);

  } else if (pc === "high" && mc === "high") {
    prediction = result("high", "HIGH RISK", "Fungal / Bacterial Infection",
      "Alkaline pH with high moisture — environment highly favourable for infection.",
      COLORS.high);

  // ── MEDIUM RISK ──────────────────────────────────────────
  } else if (tc === "lowFever" && pc === "elevated" && mc === "elevated") {
    prediction = result("medium", "MEDIUM RISK", "Fungal Infection Risk",
      "Low-grade fever, slightly elevated pH and high moisture — conditions favour fungal infection.",
      COLORS.medium);

  } else if (tc === "lowFever" && pc === "elevated") {
    prediction = result("medium", "MEDIUM RISK", "Early Infection Risk",
      "Low-grade fever with elevated wound pH — early signs of infection, monitor closely.",
      COLORS.medium);

  } else if (tc === "highFever") {
    prediction = result("medium", "MEDIUM RISK", "Systemic Fever",
      "High body temperature — possible systemic fever. Check wound site for other signs.",
      COLORS.medium);

  } else if (pc === "high") {
    prediction = result("medium", "MEDIUM RISK", "pH Imbalance",
      "Wound pH is highly alkaline — possible infection or chemical imbalance at wound site.",
      COLORS.medium);

  } else if (mc === "high") {
    prediction = result("medium", "MEDIUM RISK", "Maceration Risk",
      "Excessive wound moisture can break down tissue and create infection risk.",
      COLORS.medium);

  // ── LOW-MEDIUM ───────────────────────────────────────────
  } else if (tc === "lowFever" || pc === "elevated" || mc === "elevated") {
    prediction = result("low-medium", "LOW-MEDIUM", "Early Warning",
      "Slightly elevated conditions — no immediate concern but worth monitoring.",
      COLORS.lowMedium);

  } else if (tc === "belowNormal") {
    prediction = result("low-medium", "LOW-MEDIUM", "Low Body Temperature",
      "Body temperature below normal range — may indicate poor circulation at wound site.",
      COLORS.lowMedium);

  // ── ALL NORMAL ───────────────────────────────────────────
  } else {
    prediction = result("low", "LOW RISK", "No Infection Detected",
      "All monitored parameters within normal range. Wound healing appears on track.",
      COLORS.low);
  }

  return { ...prediction, freshSensors: fresh, available, partial, noData: false };
}