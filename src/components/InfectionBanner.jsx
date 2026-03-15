import { motion, AnimatePresence } from "framer-motion";

const RISK_ICONS = {
  high:         "🔴",
  medium:       "🟡",
  "low-medium": "🟠",
  low:          "🟢",
  unknown:      "⚪",
};

const SENSOR_LABELS = {
  bodyTemp: { label: "Body Temp", unit: "°C" },
  ph:       { label: "pH",        unit: "pH" },
  moisture: { label: "Moisture",  unit: "%"  },
};

export default function InfectionBanner({ infection }) {
  if (!infection) return null;

  const icon = RISK_ICONS[infection.riskLevel] || "⚪";

  return (
    <AnimatePresence>
      <motion.div
        key={infection.riskLevel + infection.type}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          borderRadius: "16px",
          padding: "16px 20px",
          marginBottom: "20px",
          background: infection.bg,
          border: `1px solid ${infection.border}`,
          boxShadow: infection.riskLevel === "high"
            ? `0 0 28px ${infection.border}55, 0 4px 20px rgba(0,0,0,0.4)`
            : "0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        {/* ── Top row ───────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>

          {/* Left — pulsing dot + risk label + type + description */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1 }}>
            <motion.div
              style={{ width: "12px", height: "12px", borderRadius: "50%", background: infection.dot, flexShrink: 0, marginTop: "3px" }}
              animate={infection.riskLevel === "high"
                ? { scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }
                : { opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: infection.riskLevel === "high" ? 0.8 : 2 }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                <span style={{
                  fontSize: "11px", fontWeight: 700,
                  letterSpacing: "0.1em", fontFamily: "'DM Mono', monospace",
                  color: infection.color,
                }}>
                  {infection.riskLabel}
                </span>
                <span style={{ color: "#334155", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>·</span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>
                  {icon} {infection.type}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
                {infection.description}
              </p>
            </div>
          </div>

          {/* Right — sensor pills */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "flex-start" }}>
            {Object.entries(SENSOR_LABELS).map(([key, meta]) => {
              const isFresh   = infection.freshSensors?.[key];
              const val       = infection.available?.[key];
              const isUsed    = val !== null && val !== undefined;
              const isStale   = !isFresh;
              const isInvalid = isFresh && !isUsed; // fresh but out of range

              let bg, border, color, dotColor, statusText;

              if (isUsed) {
                // Fresh and valid — being used in prediction
                bg = "rgba(34,197,94,0.08)"; border = "#14532d";
                color = "#86efac"; dotColor = "#22c55e";
                statusText = "USED";
              } else if (isStale) {
                // Stale — not used
                bg = "rgba(100,116,139,0.08)"; border = "#1e293b";
                color = "#475569"; dotColor = "#334155";
                statusText = "STALE";
              } else {
                // Fresh but invalid value
                bg = "rgba(239,68,68,0.08)"; border = "#7f1d1d";
                color = "#fca5a5"; dotColor = "#ef4444";
                statusText = "INVALID";
              }

              return (
                <div key={key} style={{
                  padding: "5px 10px", borderRadius: "10px",
                  fontSize: "10px", fontFamily: "'DM Mono', monospace",
                  background: bg, border: `1px solid ${border}`, color,
                  display: "flex", flexDirection: "column", gap: "2px",
                  minWidth: "72px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: dotColor }} />
                    <span>{meta.label}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color }}>
                      {isUsed
                        ? `${typeof val === "number" ? val.toFixed(1) : val}${meta.unit}`
                        : "—"
                      }
                    </span>
                    <span style={{ fontSize: "9px", opacity: 0.7 }}>{statusText}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Partial data warning ──────────────────────────── */}
        {infection.partial && !infection.noData && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              marginTop: "10px", padding: "6px 12px", borderRadius: "8px",
              background: "rgba(245,158,11,0.06)", border: "1px solid #422006",
              fontSize: "11px", color: "#92400e",
              fontFamily: "'DM Mono', monospace",
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            <span>⚠</span>
            Partial prediction — only sensors marked USED are contributing.
            Stale or invalid sensors are excluded.
          </motion.div>
        )}

        {/* ── No data state ─────────────────────────────────── */}
        {infection.noData && (
          <div style={{
            marginTop: "8px", fontSize: "11px", color: "#334155",
            fontFamily: "'DM Mono', monospace", textAlign: "center",
          }}>
            Waiting for device to send valid sensor readings...
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}