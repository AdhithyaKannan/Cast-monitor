/**
 * Infection Prediction Engine
 * ────────────────────────────
 * Uses latest available sensor readings (bodyTemp, ph, moisture)
 * to predict infection risk level and type.
 *
 * Handles partial data — works with any combination of sensors.
 * Marks sensors as stale if last reading is older than STALE_MS.
 */

const STALE_MS = 2 * 60 * 1000; // 2 minutes

// ── Threshold definitions ─────────────────────────────────────

const TEMP_THRESHOLDS = {
  normal:  [36.1, 37.5],
  low:     [37.5, 38.5],
  high:    38.5,
};

const PH_THRESHOLDS = {
  normal:   [4.0, 5.5],
  elevated: [5.5, 6.5],
  high:     6.5,
};

const MOISTURE_THRESHOLDS = {
  normal: [30, 75],
  high:   [75, 85],
  vhigh:  85,
};

// ── Individual sensor classifiers ─────────────────────────────

function classifyTemp(val) {
  if (val > TEMP_THRESHOLDS.high)          return "high";
  if (val >= TEMP_THRESHOLDS.low[0])       return "low";
  if (val >= TEMP_THRESHOLDS.normal[0])    return "normal";
  return "low"; // below normal — hypothermia risk
}

function classifyPh(val) {
  if (val > PH_THRESHOLDS.high)            return "high";
  if (val >= PH_THRESHOLDS.elevated[0])    return "elevated";
  return "normal";
}

function classifyMoisture(val) {
  if (val >= MOISTURE_THRESHOLDS.vhigh)    return "vhigh";
  if (val >= MOISTURE_THRESHOLDS.high[0])  return "high";
  return "normal";
}

// ── Main prediction function ──────────────────────────────────

/**
 * @param {object} values      - { bodyTemp, ph, moisture, ... }
 * @param {object} lastUpdated - { bodyTemp: timestamp, ph: timestamp, ... }
 * @returns {object} prediction result
 */
export function predictInfection(values, lastUpdated) {
  const now = Date.now();

  // Check staleness for each relevant sensor
  const fresh = {
    bodyTemp: lastUpdated.bodyTemp && (now - lastUpdated.bodyTemp) < STALE_MS,
    ph:       lastUpdated.ph       && (now - lastUpdated.ph)       < STALE_MS,
    moisture: lastUpdated.moisture && (now - lastUpdated.moisture) < STALE_MS,
  };

  const available = {
    bodyTemp: fresh.bodyTemp ? values.bodyTemp : null,
    ph:       fresh.ph       ? values.ph       : null,
    moisture: fresh.moisture ? values.moisture : null,
  };

  const availableCount = Object.values(available).filter(v => v !== null).length;

  // No sensors available
  if (availableCount === 0) {
    return {
      riskLevel:    "unknown",
      riskLabel:    "NO DATA",
      type:         "Awaiting sensor readings",
      description:  "No fresh sensor data available.",
      color:        "#475569",
      bg:           "#0f172a",
      border:       "#1e293b",
      dot:          "#475569",
      freshSensors: fresh,
      partial:      false,
      noData:       true,
    };
  }

  // Classify each available sensor
  const tc = available.bodyTemp !== null ? classifyTemp(available.bodyTemp)     : null;
  const pc = available.ph       !== null ? classifyPh(available.ph)             : null;
  const mc = available.moisture !== null ? classifyMoisture(available.moisture) : null;

  const partial = availableCount < 3;

  // ── Prediction rules (priority order) ────────────────────────

  let riskLevel, riskLabel, type, description, color, bg, border, dot;

  // HIGH RISK rules
  if (tc === "high" && pc === "high" && mc === "vhigh") {
    riskLevel   = "high";
    riskLabel   = "HIGH RISK";
    type        = "Bacterial Infection";
    description = "Elevated temperature, alkaline wound pH, and excessive moisture — strong indicators of bacterial infection.";
    color       = "#f87171"; bg = "#2d0a0a"; border = "#dc2626"; dot = "#ef4444";

  } else if (tc === "high" && pc === "high") {
    riskLevel   = "high";
    riskLabel   = "HIGH RISK";
    type        = "Inflammatory Infection";
    description = "High fever combined with elevated wound pH suggests active inflammatory infection.";
    color       = "#f87171"; bg = "#2d0a0a"; border = "#dc2626"; dot = "#ef4444";

  } else if (tc === "high" && mc === "vhigh") {
    riskLevel   = "high";
    riskLabel   = "HIGH RISK";
    type        = "Wound Infection";
    description = "High fever with excessive wound moisture — likely wound infection.";
    color       = "#f87171"; bg = "#2d0a0a"; border = "#dc2626"; dot = "#ef4444";

  } else if (pc === "high" && mc === "vhigh") {
    riskLevel   = "high";
    riskLabel   = "HIGH RISK";
    type        = "Fungal / Bacterial Infection";
    description = "Alkaline wound pH with very high moisture — favourable environment for fungal or bacterial growth.";
    color       = "#f87171"; bg = "#2d0a0a"; border = "#dc2626"; dot = "#ef4444";

  // MEDIUM RISK rules
  } else if (tc === "low" && pc === "elevated" && mc === "high") {
    riskLevel   = "medium";
    riskLabel   = "MEDIUM RISK";
    type        = "Fungal Infection Risk";
    description = "Low-grade fever, slightly elevated pH, and high moisture — conditions favour fungal infection.";
    color       = "#fbbf24"; bg = "#2d1a00"; border = "#d97706"; dot = "#f59e0b";

  } else if (tc === "low" && pc === "elevated") {
    riskLevel   = "medium";
    riskLabel   = "MEDIUM RISK";
    type        = "Early Infection Risk";
    description = "Low-grade fever with elevated wound pH — early signs of infection. Monitor closely.";
    color       = "#fbbf24"; bg = "#2d1a00"; border = "#d97706"; dot = "#f59e0b";

  } else if (tc === "high" && pc === "normal") {
    riskLevel   = "medium";
    riskLabel   = "MEDIUM RISK";
    type        = "Systemic Fever";
    description = "High body temperature but normal wound pH — possible systemic fever unrelated to wound.";
    color       = "#fbbf24"; bg = "#2d1a00"; border = "#d97706"; dot = "#f59e0b";

  } else if (pc === "high") {
    riskLevel   = "medium";
    riskLabel   = "MEDIUM RISK";
    type        = "pH Imbalance";
    description = "Wound pH is highly alkaline — may indicate infection or chemical imbalance at wound site.";
    color       = "#fbbf24"; bg = "#2d1a00"; border = "#d97706"; dot = "#f59e0b";

  } else if (mc === "vhigh") {
    riskLevel   = "medium";
    riskLabel   = "MEDIUM RISK";
    type        = "Maceration Risk";
    description = "Excessive wound moisture can break down surrounding tissue and create infection risk.";
    color       = "#fbbf24"; bg = "#2d1a00"; border = "#d97706"; dot = "#f59e0b";

  } else if (pc === "elevated" || mc === "high") {
    riskLevel   = "low-medium";
    riskLabel   = "LOW-MEDIUM";
    type        = "Early Warning";
    description = "Slightly elevated wound conditions. No immediate concern but worth monitoring.";
    color       = "#fb923c"; bg = "#2d1200"; border = "#c2410c"; dot = "#f97316";

  // LOW / NORMAL
  } else {
    riskLevel   = "low";
    riskLabel   = "LOW RISK";
    type        = "No Infection Detected";
    description = "All monitored parameters are within normal range. Wound healing appears on track.";
    color       = "#4ade80"; bg = "#052e16"; border = "#16a34a"; dot = "#22c55e";
  }

  return {
    riskLevel,
    riskLabel,
    type,
    description,
    color,
    bg,
    border,
    dot,
    freshSensors: fresh,
    available,
    partial,
    noData: false,
  };
}