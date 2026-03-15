import { motion } from "framer-motion";
import { getStatus, getStatusColors } from "../utils/helpers";

/**
 * StatusBadge — replaces AIBadge
 * Shows good / warning / critical based on thresholds only
 */
export default function StatusBadge({ sensor, value }) {
  const status = getStatus(sensor, value);
  const sc = getStatusColors(sensor, value);

  return (
    <motion.div
      style={{
        display: "flex", alignItems: "center", gap: "6px",
        padding: "4px 8px", borderRadius: "999px",
        fontSize: "11px", fontFamily: "'DM Mono', monospace",
        background: sc.bg,
        border: `1px solid ${sc.border}`,
        color: sc.text,
        whiteSpace: "nowrap",
      }}
    >
      <motion.div
        style={{ width: "6px", height: "6px", borderRadius: "50%", background: sc.text, flexShrink: 0 }}
        animate={{ opacity: status === "critical" ? [1, 0.3, 1] : 1 }}
        transition={{ repeat: Infinity, duration: 0.8 }}
      />
      {status.toUpperCase()}
    </motion.div>
  );
}