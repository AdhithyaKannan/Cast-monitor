import { motion } from "framer-motion";

const CONN = {
  connecting: { color: "#f59e0b", label: "CONNECTING...", dot: "#fbbf24", dur: 0.6 },
  live:       { color: "#38bdf8", label: "LIVE ⚡",       dot: "#38bdf8", dur: 2   },
  error:      { color: "#f87171", label: "DISCONNECTED", dot: "#ef4444", dur: 0.5 },
};

export default function Header({ time, connectionStatus, lastUpdated }) {
  const cfg = CONN[connectionStatus] || CONN.connecting;
  return (
    <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
      style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #1e3a5f 0%, #0ea5e9 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>🩺</div>
        <div>
          <h1 style={{ fontSize: "clamp(18px, 4vw, 26px)", fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.025em", margin: 0 }}>
            SmartBand<span style={{ color: "#38bdf8" }}>Monitor</span>
          </h1>
          <p style={{ color: "#334155", fontSize: "10px", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", marginTop: "2px" }}>
            IoT FRACTURE HEALING · REAL-TIME SENSOR DASHBOARD
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <motion.div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "999px", background: "#0a1628", border: `1px solid ${cfg.color}44`, color: cfg.color, fontSize: "11px", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
            <motion.div style={{ width: "7px", height: "7px", borderRadius: "50%", background: cfg.dot }} animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: cfg.dur }}/>
            {cfg.label}
          </motion.div>
          <div style={{ padding: "6px 12px", borderRadius: "999px", background: "#0a0f1e", border: "1px solid #1e293b", color: "#475569", fontSize: "11px", fontFamily: "'DM Mono', monospace" }}>{time}</div>
        </div>
        {lastUpdated && <div style={{ fontSize: "10px", color: "#334155", fontFamily: "'DM Mono', monospace" }}>DEVICE: {lastUpdated}</div>}
        {connectionStatus === "error" && <div style={{ fontSize: "10px", color: "#7f1d1d", fontFamily: "'DM Mono', monospace" }}>⚠ CHECK PUSHER CONFIG</div>}
      </div>
    </motion.header>
  );
}