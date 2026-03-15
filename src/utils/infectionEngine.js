/**
 * Infection Prediction Engine
 * ────────────────────────────
 * Uses latest available sensor readings (bodyTemp, ph, moisture)
 * to predict infection risk level and type.
 * Handles partial data, stale sensors, and out-of-range/invalid values.
 */

const STALE_MS = 2 * 60 * 1000; // 2 minutes

// ── Valid sensor ranges (discard readings outside these) ──────
const VALID_RANGES = {
  bodyTemp: [25, 45],
  ph:       [0,  14],
  moisture: [0,  100],
};

// ── Threshold definitions ─────────────────────────────────────
const TEMP_THRESHOLDS = {
  belowNormal: 36.1,
  normal:      [36.1, 37.5],
  lowFever:    [37.5, 38.5],
  highFever:   38.5,
};

const PH_THRESHOLDS = {
  normal:   [4.0, 5.5],
  elevated: [5.5, 6.5],
  high:     6.5,
};

const MOISTURE_THRESHOLDS = {
  normal: [30, 75],
  high:   75,
  vhigh:  85,
};

// ── Validators ────────────────────────────────────────────────
function isValid(key, val) {
  if (val === null || val === undefined || isNaN(val)) return false;
  const [min, max] = VALID_RANGES[key];
  return val >= min && val <= max;
}

// ── Individual classifiers ────────────────────────────────────
function classifyTemp(val) {
  if (val >= TEMP_THRESHOLDS.highFever)      return "highFever";
  if (val >= TEMP_THRESHOLDS.lowFever[0])    return "lowFever";
  if (val >= TEMP_THRESHOLDS.normal[0])      return "normal";
  return "belowNormal";
}

function classifyPh(val) {
  if (val >= PH_THRESHOLDS.high)             return "high";
  if (val >= PH_THRESHOLDS.elevated[0])      return "elevated";
  return "normal";
}

function classifyMoisture(val) {
  if (val >= MOISTURE_THRESHOLDS.vhigh)      return "vhigh";
  if (val >= MOISTURE_THRESHOLDS.high)       return "high";
  return "normal";
}

// ── Result builder helper ─────────────────────────────────────
function result(riskLevel, riskLabel, type, description, colors) {
  return { riskLevel, riskLabel, type, description, ...colors };
}

const COLORS = {
  high:       { color: "#f87171", bg: "#2d0a0a", border: "#dc2626", dot: "#ef4444" },
  medium:     { color: "#fbbf24", bg: "#2d1a00", border: "#d97706", dot: "#f59e0b" },
  lowMedium:  { color: "#fb923c", bg: "#2d1200", border: "#c2410c", dot: "#f97316" },
  low:        { color: "#4ade80", bg: "#052e16", border: "#16a34a", dot: "#22c55e" },
  unknown:    { color: "#475569", bg: "#0f172a", border: "#1e293b", dot: "#475569" },
};

// ── Main prediction function ──────────────────────────────────
export function predictInfection(values, lastUpdated) {
  const now = Date.now();

  // Check staleness
  const fresh = {
    bodyTemp: !!(lastUpdated.bodyTemp && (now - lastUpdated.bodyTemp) < STALE_MS),
    ph:       !!(lastUpdated.ph       && (now - lastUpdated.ph)       < STALE_MS),
    moisture: !!(lastUpdated.moisture && (now - lastUpdated.moisture) < STALE_MS),
  };

  // Only use fresh AND valid values
  const available = {
    bodyTemp: fresh.bodyTemp && isValid("bodyTemp", values.bodyTemp) ? values.bodyTemp : null,
    ph:       fresh.ph       && isValid("ph",       values.ph)       ? values.ph       : null,
    moisture: fresh.moisture && isValid("moisture",  values.moisture) ? values.moisture  : null,
  };

  const availableCount = Object.values(available).filter(v => v !== null).length;

  // No valid sensors
  if (availableCount === 0) {
    return {
      riskLevel: "unknown", riskLabel: "NO DATA",
      type: "Awaiting sensor readings",
      description: "No valid sensor data available. Waiting for device readings.",
      ...COLORS.unknown,
      freshSensors: fresh, available, partial: false, noData: true,
    };
  }

  const tc = available.bodyTemp !== null ? classifyTemp(available.bodyTemp)    : null;
  const pc = available.ph       !== null ? classifyPh(available.ph)            : null;
  const mc = available.moisture !== null ? classifyMoisture(available.moisture) : null;

  const partial = availableCount < 3;

  let prediction;

  // ── HIGH RISK ─────────────────────────────────────────────
  if (tc === "highFever" && pc === "high" && mc === "vhigh") {
    prediction = result("high", "HIGH RISK", "Bacterial Infection",
      "Elevated temperature, alkaline wound pH, and excessive moisture — strong indicators of bacterial infection.",
      COLORS.high);

  } else if (tc === "highFever" && pc === "high") {
    prediction = result("high", "HIGH RISK", "Inflammatory Infection",
      "High fever combined with elevated wound pH suggests active inflammatory infection.",
      COLORS.high);

  } else if (tc === "highFever" && mc === "vhigh") {
    prediction = result("high", "HIGH RISK", "Wound Infection",
      "High fever with excessive wound moisture — likely active wound infection.",
      COLORS.high);

  } else if (pc === "high" && mc === "vhigh") {
    prediction = result("high", "HIGH RISK", "Fungal / Bacterial Infection",
      "Alkaline wound pH with very high moisture — favourable environment for fungal or bacterial growth.",
      COLORS.high);

  // ── MEDIUM RISK ───────────────────────────────────────────
  } else if (tc === "lowFever" && pc === "elevated" && mc === "high") {
    prediction = result("medium", "MEDIUM RISK", "Fungal Infection Risk",
      "Low-grade fever, slightly elevated pH, and high moisture — conditions favour fungal infection.",
      COLORS.medium);

  } else if (tc === "lowFever" && pc === "elevated") {
    prediction = result("medium", "MEDIUM RISK", "Early Infection Risk",
      "Low-grade fever with elevated wound pH — early signs of infection. Monitor closely.",
      COLORS.medium);

  } else if (tc === "highFever" && pc === "normal") {
    prediction = result("medium", "MEDIUM RISK", "Systemic Fever",
      "High body temperature but normal wound pH — possible systemic fever unrelated to wound.",
      COLORS.medium);

  } else if (pc === "high") {
    prediction = result("medium", "MEDIUM RISK", "pH Imbalance",
      "Wound pH is highly alkaline — may indicate infection or chemical imbalance at wound site.",
      COLORS.medium);

  } else if (mc === "vhigh") {
    prediction = result("medium", "MEDIUM RISK", "Maceration Risk",
      "Excessive wound moisture can break down surrounding tissue and create infection risk.",
      COLORS.medium);

  // ── LOW-MEDIUM ────────────────────────────────────────────
  } else if (pc === "elevated" || mc === "high" || tc === "lowFever") {
    prediction = result("low-medium", "LOW-MEDIUM", "Early Warning",
      "Slightly elevated wound conditions — no immediate concern but worth monitoring.",
      COLORS.lowMedium);

  // ── BELOW NORMAL TEMP (hypothermia / poor circulation) ───
  } else if (tc === "belowNormal") {
    prediction = result("low-medium", "LOW-MEDIUM", "Low Body Temperature",
      "Body temperature below normal range — may indicate poor circulation at wound site.",
      COLORS.lowMedium);

  // ── ALL NORMAL ────────────────────────────────────────────
  } else {
    prediction = result("low", "LOW RISK", "No Infection Detected",
      "All monitored parameters are within normal range. Wound healing appears on track.",
      COLORS.low);
  }

  return {
    ...prediction,
    freshSensors: fresh,
    available,
    partial,
    noData: false,
  };
}