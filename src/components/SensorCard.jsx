import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RadialGauge from "./RadialGauge";
import Sparkline from "./Sparkline";
import AIBadge from "./AIBadge";
import ThresholdBar from "./ThresholdBar";
import { getStatus, getStatusColors } from "../utils/helpers";

export default function SensorCard({ sensor, value, history, anomaly, confidence, index }) {
  const [expanded, setExpanded] = useState(false);
  const status = getStatus(sensor, value);
  const sc = getStatusColors(sensor, value);

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1, duration: 0.5 }}
      style={{ borderRadius: "16px", padding: "20px", cursor: "pointer", userSelect: "none", background: "linear-gradient(145deg, #0f172a 0%, #0a0f1e 100%)", border: `1px solid ${anomaly ? sc.border : "#1e293b"}`, boxShadow: anomaly ? `0 0 24px ${sc.border}44, 0 4px 24px rgba(0,0,0,0.5)` : "0 4px 24px rgba(0,0,0,0.4)", transition: "border-color 0.4s, box-shadow 0.4s", boxSizing: "border-box" }}
      whileHover={{ scale: 1.01 }}
      onClick={() => setExpanded(v => !v)}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "18px" }}>{sensor.icon}</span>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: sensor.color, fontFamily: "'DM Mono', monospace" }}>{sensor.label}</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>{sensor.description}</div>
          </div>
        </div>
        <AIBadge confidence={confidence} anomaly={anomaly} />
      </div>

      {/* Gauge */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <RadialGauge sensor={sensor} value={value} anomaly={anomaly} />
      </div>

      {/* Status pill */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
        <motion.div
          style={{ padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}
          animate={anomaly ? { scale: [1, 1.06, 1] } : {}} transition={{ repeat: Infinity, duration: 1 }}
        >
          {status}
        </motion.div>
      </div>

      {/* Threshold bar */}
      <div style={{ marginBottom: "16px" }}>
        <ThresholdBar sensor={sensor} value={value} />
      </div>

      {/* Sparkline */}
      <div style={{ borderRadius: "10px", overflow: "hidden", background: "#060d1a", padding: "6px 4px 2px" }}>
        <div style={{ padding: "0 8px", marginBottom: "4px", color: "#475569", fontSize: "10px", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>
          TREND — LAST {history.length} READINGS
        </div>
        <Sparkline data={history} sensor={sensor} />
      </div>

      {/* Expandable details */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #1e293b", display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                { label: "LOW ALERT",  val: `${sensor.thresholds.low}${sensor.unit}`,           color: "#fbbf24" },
                { label: "HIGH ALERT", val: `${sensor.thresholds.high}${sensor.unit}`,          color: "#f87171" },
                { label: "SAFE ZONE",  val: `${sensor.safe[0]}–${sensor.safe[1]}${sensor.unit}`, color: "#4ade80" },
                { label: "RANGE",      val: `${sensor.min}–${sensor.max}${sensor.unit}`,        color: "#94a3b8" },
                { label: "AI CONF.",   val: `${confidence}%`,                                    color: sensor.color },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "'DM Mono', monospace" }}>
                  <span style={{ color: "#475569" }}>{row.label}</span>
                  <span style={{ color: row.color }}>{row.val}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ textAlign: "center", marginTop: "8px", fontSize: "10px", color: "#334155", fontFamily: "'DM Mono', monospace" }}>
        {expanded ? "▲ COLLAPSE" : "▼ THRESHOLDS"}
      </div>
    </motion.article>
  );
}