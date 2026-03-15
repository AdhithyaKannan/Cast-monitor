import { motion, AnimatePresence } from "framer-motion";

const RISK_ICONS = {
  high:        "🔴",
  medium:      "🟡",
  "low-medium": "🟠",
  low:         "🟢",
  unknown:     "⚪",
};

const SENSOR_LABELS = {
  bodyTemp: "Body Temp",
  ph:       "pH",
  moisture: "Moisture",
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
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "10px" }}>

          {/* Left — risk level + type */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Pulsing dot */}
            <motion.div
              style={{ width: "12px", height: "12px", borderRadius: "50%", background: infection.dot, flexShrink: 0 }}
              animate={infection.riskLevel === "high"
                ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }
                : { opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: infection.riskLevel === "high" ? 0.8 : 2 }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "'DM Mono', monospace", color: infection.color }}>
                  {infection.riskLabel}
                </span>
                <span style={{ fontSize: "11px", color: "#475569", fontFamily: "'DM Mono', monospace" }}>·</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>
                  {icon} {infection.type}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px", lineHeight: 1.5 }}>
                {infection.description}
              </p>
            </div>
          </div>

          {/* Right — sensor freshness indicators */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {Object.entries(SENSOR_LABELS).map(([key, label]) => {
              const isFresh = infection.freshSensors?.[key];
              const val     = infection.available?.[key];
              return (
                <div
                  key={key}
                  style={{
                    padding: "4px 10px", borderRadius: "999px",
                    fontSize: "10px", fontFamily: "'DM Mono', monospace",
                    background: isFresh ? "rgba(34,197,94,0.08)" : "rgba(100,116,139,0.1)",
                    border: `1px solid ${isFresh ? "#14532d" : "#1e293b"}`,
                    color: isFresh ? "#86efac" : "#475569",
                    display: "flex", alignItems: "center", gap: "4px",
                  }}
                >
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: isFresh ? "#22c55e" : "#334155" }} />
                  {label}
                  {val !== null && val !== undefined
                    ? <span style={{ color: isFresh ? "#4ade80" : "#475569", marginLeft: "2px" }}>
                        {typeof val === "number" ? val.toFixed(1) : val}
                      </span>
                    : <span style={{ color: "#334155", marginLeft: "2px" }}>—</span>
                  }
                </div>
              );
            })}
          </div>
        </div>

        {/* Partial data warning */}
        {infection.partial && !infection.noData && (
          <div style={{
            marginTop: "8px", padding: "6px 12px", borderRadius: "8px",
            background: "rgba(245,158,11,0.06)", border: "1px solid #422006",
            fontSize: "11px", color: "#92400e", fontFamily: "'DM Mono', monospace",
            display: "flex", alignItems: "center", gap: "6px",
          }}>
            <span>⚠</span>
            Prediction based on partial data — some sensors have stale or missing readings
          </div>
        )}

        {/* No data state */}
        {infection.noData && (
          <div style={{
            fontSize: "11px", color: "#475569",
            fontFamily: "'DM Mono', monospace",
            textAlign: "center", padding: "4px 0",
          }}>
            Waiting for sensor data to begin infection analysis...
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}