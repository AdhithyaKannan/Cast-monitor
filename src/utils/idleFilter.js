/**
 * Idle Filter
 * ────────────
 * Detects idle/disconnected sensor readings for the infection engine.
 * Dashboard still shows all values — this only affects infection prediction.
 *
 * Idle signatures:
 *   bodyTemp → below 32°C   = sensor not on skin (ignore for infection)
 *   ph       → above 8.5 or below 3.5 = not calibrated/in contact
 *   moisture → no idle state (0% is now a valid normal reading)
 *   humidity → no idle state
 *   envTemp  → no idle state
 */

const IDLE_RULES = {
  bodyTemp: {
    check:  (v) => v < 32,
    reason: "Body temp below 32°C — sensor not on skin",
  },
  ph: {
    check:  (v) => v > 8.5 || v < 3.5,
    reason: "pH out of wound range — sensor not calibrated or not in contact",
  },
  // moisture: no idle rule — 0% is valid normal reading
};

/**
 * Check if a single sensor value is an idle reading.
 * @param {string} key
 * @param {number} value
 * @returns {{ idle: boolean, reason: string|null }}
 */
export function isIdle(key, value) {
  const rule = IDLE_RULES[key];
  if (!rule) return { idle: false, reason: null };

  if (value === null || value === undefined || isNaN(value)) {
    return { idle: true, reason: "No value" };
  }

  if (rule.check(value)) {
    return { idle: true, reason: rule.reason };
  }

  return { idle: false, reason: null };
}

/**
 * Filter a full payload for infection engine use only.
 */
export function filterIdleValues(newValues, lastKnown) {
  const filtered = {};
  const skipped  = [];

  Object.entries(newValues).forEach(([key, val]) => {
    const { idle, reason } = isIdle(key, val);
    if (idle) {
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