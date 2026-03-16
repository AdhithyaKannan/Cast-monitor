/**
 * Infection Prediction Engine
 * ────────────────────────────
 * Uses latest real (non-idle) sensor readings to predict infection.
 * Moisture: 0% = normal, >10% = elevated, >15% = high risk
 * Body temp: only HIGH temps considered (low = sensor issue)
 * pH: 4.0–5.5 = normal wound range
 */

const STALE_MS = 2 * 60 * 1000; // 2 minutes

const VALID_RANGES = {
  bodyTemp: [32, 45],   // below 32 = not on skin, ignored
  ph:       [3.5, 8.5], // outside = not calibrated
  moisture: [0, 100],   // 0% is valid normal
};

const TEMP = {
  normal:   [36.1, 37.5],
  lowFever: [37.5, 38.5],
  high:     38.5,
};

const PH = {
  normal:   [4.0, 5.5],
  elevated: [5.5, 6.5],
  high:     6.5,
};

const MOIST = {
  normal:   10,  // 0–10% normal
  elevated: 15,  // 10–15% warning
  high:     15,  // >15% critical
};

function isValid(key, val) {
  if (val === null || val === undefined || isNaN(val)) return false;
  const [min, max] = VALID_RANGES[key];
  return val >= min && val <= max;
}

function classifyTemp(v) {
  if (v >= TEMP.high)       return "high";
  if (v >= TEMP.lowFever[0]) return "lowFever";
  if (v >= TEMP.normal[0])  return "normal";
  return "normal"; // below normal = sensor issue, treat as normal
}

function classifyPh(v) {
  if (v >= PH.high)         return "high";
  if (v >= PH.elevated[0])  return "elevated";
  return "normal";
}

function classifyMoisture(v) {
  if (v > MOIST.high)       return "high";
  if (v > MOIST.normal)     return "elevated";
  return "normal";
}

function make(riskLevel, riskLabel, type, description, colors) {
  return { riskLevel, riskLabel, type, description, ...colors };
}

const C = {
  high:      { color: "#f87171", bg: "#2d0a0a", border: "#dc2626", dot: "#ef4444" },
  medium:    { color: "#fbbf24", bg: "#2d1a00", border: "#d97706", dot: "#f59e0b" },
  lowMed:    { color: "#fb923c", bg: "#2d1200", border: "#c2410c", dot: "#f97316" },
  low:       { color: "#4ade80", bg: "#052e16", border: "#16a34a", dot: "#22c55e" },
  unknown:   { color: "#475569", bg: "#0f172a", border: "#1e293b", dot: "#475569" },
};

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
    moisture: fresh.moisture && isValid("moisture",  values.moisture) ? values.moisture  : null,
  };

  const availableCount = Object.values(available).filter(v => v !== null).length;

  if (availableCount === 0) {
    return {
      riskLevel: "unknown", riskLabel: "NO DATA",
      type: "Awaiting sensor readings",
      description: "No valid sensor data yet. Waiting for device readings.",
      ...C.unknown,
      freshSensors: fresh, available, partial: false, noData: true,
    };
  }

  const tc = available.bodyTemp !== null ? classifyTemp(available.bodyTemp)     : null;
  const pc = available.ph       !== null ? classifyPh(available.ph)             : null;
  const mc = available.moisture !== null ? classifyMoisture(available.moisture) : null;

  const partial = availableCount < 3;
  let prediction;

  // ── HIGH RISK ─────────────────────────────────────────────
  if (tc === "high" && pc === "high" && mc === "high") {
    prediction = make("high", "HIGH RISK", "Bacterial Infection",
      "High fever, alkaline wound pH, and elevated moisture — strong indicators of bacterial infection.",
      C.high);

  } else if (tc === "high" && pc === "high") {
    prediction = make("high", "HIGH RISK", "Inflammatory Infection",
      "High fever with alkaline wound pH — active inflammatory infection likely.",
      C.high);

  } else if (tc === "high" && mc === "high") {
    prediction = make("high", "HIGH RISK", "Wound Infection",
      "High fever with elevated wound moisture — likely active wound infection.",
      C.high);

  } else if (pc === "high" && mc === "high") {
    prediction = make("high", "HIGH RISK", "Fungal / Bacterial Infection",
      "Alkaline pH and elevated moisture — favourable environment for fungal or bacterial growth.",
      C.high);

  // ── MEDIUM RISK ───────────────────────────────────────────
  } else if (tc === "lowFever" && pc === "elevated" && mc === "elevated") {
    prediction = make("medium", "MEDIUM RISK", "Fungal Infection Risk",
      "Low-grade fever, slightly elevated pH and moisture — conditions favour fungal infection.",
      C.medium);

  } else if (tc === "lowFever" && pc === "elevated") {
    prediction = make("medium", "MEDIUM RISK", "Early Infection Risk",
      "Low-grade fever with elevated wound pH — early signs of infection, monitor closely.",
      C.medium);

  } else if (tc === "high") {
    prediction = make("medium", "MEDIUM RISK", "Systemic Fever",
      "High body temperature — possible systemic fever. Check wound site for other signs.",
      C.medium);

  } else if (pc === "high") {
    prediction = make("medium", "MEDIUM RISK", "pH Imbalance",
      "Wound pH is highly alkaline — may indicate infection or chemical imbalance.",
      C.medium);

  } else if (mc === "high") {
    prediction = make("medium", "MEDIUM RISK", "Maceration Risk",
      "Elevated wound moisture can break down tissue and create infection conditions.",
      C.medium);

  // ── LOW-MEDIUM ────────────────────────────────────────────
  } else if (pc === "elevated" || mc === "elevated" || tc === "lowFever") {
    prediction = make("low-medium", "LOW-MEDIUM", "Early Warning",
      "Slightly elevated wound conditions — no immediate concern but worth monitoring.",
      C.lowMed);

  // ── ALL NORMAL ────────────────────────────────────────────
  } else {
    prediction = make("low", "LOW RISK", "No Infection Detected",
      "All monitored parameters are within normal range. Wound healing appears on track.",
      C.low);
  }

  return { ...prediction, freshSensors: fresh, available, partial, noData: false };
}