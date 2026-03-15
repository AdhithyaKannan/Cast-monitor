import { motion } from "framer-motion";

export default function AIBadge({ confidence, anomaly }) {
  return (
    <motion.div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", borderRadius: "999px", fontSize: "11px", fontFamily: "'DM Mono', monospace", background: anomaly ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.08)", border: `1px solid ${anomaly ? "#7f1d1d" : "#14532d"}`, color: anomaly ? "#fca5a5" : "#86efac", whiteSpace: "nowrap" }}>
      <motion.div style={{ width: "6px", height: "6px", borderRadius: "50%", background: anomaly ? "#ef4444" : "#22c55e", flexShrink: 0 }} animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: anomaly ? 0.8 : 2 }} />
      {anomaly ? "⚠ ANOMALY" : `AI ${confidence}%`}
    </motion.div>
  );
}