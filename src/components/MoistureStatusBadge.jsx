import { motion } from "framer-motion";

const CONFIG = {
  1: { label: "WET",  icon: "💦", bg: "#0c2a3a", color: "#38bdf8", border: "#0e4f6e" },
  0: { label: "DRY",  icon: "🏜️", bg: "#2d1a00", color: "#fbbf24", border: "#854d0e" },
};

export default function MoistureStatusBadge({ status }) {
  const cfg = status !== null && status !== undefined ? CONFIG[status] : null;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
      style={{ borderRadius: "16px", padding: "16px 20px", background: "linear-gradient(145deg, #0f172a 0%, #0a0f1e 100%)", border: "1px solid #1e293b", boxShadow: "0 4px 24px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "20px" }}>🌊</span>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#67e8f9", fontFamily: "'DM Mono', monospace" }}>Moisture Status</div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Digital threshold — field5</div>
        </div>
      </div>
      {cfg ? (
        <motion.div key={cfg.label} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 20px", borderRadius: "999px", background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: "14px", fontWeight: 700, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>
          <span>{cfg.icon}</span> {cfg.label}
        </motion.div>
      ) : (
        <div style={{ color: "#334155", fontSize: "12px", fontFamily: "'DM Mono', monospace" }}>AWAITING DATA...</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <div style={{ fontSize: "10px", color: "#334155", fontFamily: "'DM Mono', monospace" }}>RAW VALUE</div>
        <div style={{ fontSize: "24px", fontWeight: 700, color: cfg ? cfg.color : "#334155", fontFamily: "'DM Mono', monospace" }}>
          {status !== null && status !== undefined ? status : "—"}
        </div>
      </div>
    </motion.div>
  );
}