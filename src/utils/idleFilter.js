/**
 * Idle Filter
 * ────────────
 * Detects idle/disconnected sensor readings and rejects them.
 * When a sensor is not in contact or not measuring, it sends
 * predictable default values — we ignore those and keep the
 * last known real value instead.
 *
 * Idle signatures (based on observed device behaviour):
 *   bodyTemp  → ~25–30°C    (sensor not on skin)
 *   ph        → ~9.5–10.5   (sensor not in solution)
 *   moisture  → 0% (raw 1023) or ~2% (raw ~990+) — not in contact
 *   humidity  → no idle state, always reads env
 *   envTemp   → no idle state, always reads env
 */

const IDLE_RANGES = {
  bodyTemp: {
    // Body temp below 32°C means sensor is not on skin
    check: (v) => v < 29,
    reason: "Body temp below 32°C — sensor not on skin",
  },
  ph: {
    // pH above 8.5 or below 3.5 means sensor not calibrated/in contact
    check: (v) => v > 8.5 || v < 3.5,
    reason: "pH out of wound range — sensor not in contact or uncalibrated",
  },
  moisture: {
    // Raw 1023 = 0% after transform, raw ~990+ = ~2% or less
    // Moisture below 3% means sensor is dry/not in contact
    check: (v) => v <= 3,
    reason: "Moisture too low — sensor not in contact",
  },
};

/**
 * Check if a sensor value is an idle reading.
 * @param {string} key   - sensor key e.g. "bodyTemp"
 * @param {number} value - the transformed value (not raw)
 * @returns {{ idle: boolean, reason: string }}
 */
export function isIdle(key, value) {
  const rule = IDLE_RANGES[key];
  if (!rule) return { idle: false, reason: null }; // no filter for this sensor

  if (value === null || value === undefined || isNaN(value)) {
    return { idle: true, reason: "No value received" };
  }

  if (rule.check(value)) {
    return { idle: true, reason: rule.reason };
  }

  return { idle: false, reason: null };
}

/**
 * Filter a full payload — returns only non-idle values.
 * @param {object} newValues  - incoming parsed sensor values
 * @param {object} lastKnown  - last known real values
 * @returns {{ filtered: object, skipped: string[] }}
 */
export function filterIdleValues(newValues, lastKnown) {
  const filtered = {};
  const skipped  = [];

  Object.entries(newValues).forEach(([key, val]) => {
    const { idle, reason } = isIdle(key, val);
    if (idle) {
      // Keep last known real value, don't update
      if (lastKnown[key] !== undefined && lastKnown[key] !== null) {
        filtered[key] = lastKnown[key];
      }
      skipped.push(`${key}: ${reason}`);
    } else {
      filtered[key] = val;
    }
  });

  return { filtered, skipped };
}