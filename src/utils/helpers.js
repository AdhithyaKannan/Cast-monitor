import { STATUS_COLORS } from "../constants/sensors";

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getStatus(sensor, value) {
  if (value === null || value === undefined || isNaN(value)) return "good";

  const [safeL, safeH] = sensor.safe;
  const { low, high }  = sensor.thresholds;

  // Moisture — 0% is fine, only flag when too high
  if (sensor.key === "moisture") {
    if (value > high)  return "critical";
    if (value > safeH) return "warning";
    return "good";
  }

  // All other sensors — flag BOTH too low and too high
  if (value < low || value > high) return "critical";
  if (value < safeL || value > safeH) return "warning";
  return "good";
}

export function getStatusColors(sensor, value) {
  return STATUS_COLORS[getStatus(sensor, value)];
}

export function toRad(d) { return (d * Math.PI) / 180; }

export function arcPath(cx, cy, r, sA, eA) {
  const s = { x: cx + r * Math.cos(toRad(sA)), y: cy + r * Math.sin(toRad(sA)) };
  const e = { x: cx + r * Math.cos(toRad(eA)), y: cy + r * Math.sin(toRad(eA)) };
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${eA - sA > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
}

export function formatValue(v) {
  if (typeof v !== "number") return v;
  return v % 1 === 0 ? v.toString() : v.toFixed(1);
}