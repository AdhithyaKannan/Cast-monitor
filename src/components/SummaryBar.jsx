import { motion } from "framer-motion";

const STATUS = {
  anomaly: { color: "#ef4444", label: "ANOMALY DETECTED",  dur: 0.8 },
  warning: { color: "#f59e0b", label: "ATTENTION REQUIRED", dur: 1.2 },
  good:    { color: "#22c55e", label: "ALL SYSTEMS NORMAL", dur: 2   },
};

export default function SummaryBar({ overallStatus, time, sensorCount }) {
  const cfg = STATUS[overallStatus] || STATUS.good;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px 16px", borderRadius: "16px", marginBottom: "24px", background: "#0a0f1e", border: "1px solid #1e293b" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <motion.div style={{ width: "10px", height: "10px", borderRadius: "50%", background: cfg.color, flexShrink: 0 }} animate={{ opacity: [1, 0.25, 1] }} transition={{ repeat: Infinity, duration: cfg.dur }}/>
        <span style={{ color: cfg.color, fontSize: "13px", fontWeight: 600, fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em" }}>{cfg.label}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", color: "#475569", fontSize: "11px", fontFamily: "'DM Mono', monospace" }}>
        <span>🤖 AI LEARNING</span>
        <span>📡 {sensorCount} SENSORS</span>
        <span>🕐 {time}</span>
        <motion.span style={{ padding: "2px 8px", borderRadius: "4px", background: "#0f2012", color: "#4ade80", border: "1px solid #14532d" }} animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.8 }}>
          ● PUSHER REALTIME
        </motion.span>
      </div>
    </div>
  );
}