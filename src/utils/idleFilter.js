/**
 * Idle Filter
 * ────────────
 * Detects idle/disconnected sensor readings for the infection engine.
 * Dashboard always shows raw values — this only affects infection prediction.
 *
 * Note: bodyTemp transform (+5°C) is applied BEFORE this check,
 * so we compare against the already-offset value.
 */

const IDLE_RANGES = {
  bodyTemp: {
    // Raw ~28°C + 5 offset = ~33°C — still below real body temp
    // Real reading on skin/armpit/mouth will be 36°C+ after offset
    check: (v) => v < 35,
    reason: "Body temp below 35°C after offset — sensor not properly placed",
  },
  ph: {
    check: (v) => v > 8.5 || v < 3.5,
    reason: "pH out of wound range — sensor not in contact or uncalibrated",
  },
  moisture: {
    check: (v) => v <= 3,
    reason: "Moisture too low — sensor not in contact",
  },
};

export function isIdle(key, value) {
  const rule = IDLE_RANGES[key];
  if (!rule) return { idle: false, reason: null };
  if (value === null || value === undefined || isNaN(value)) {
    return { idle: true, reason: "No value" };
  }
  if (rule.check(value)) {
    return { idle: true, reason: rule.reason };
  }
  return { idle: false, reason: null };
}

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