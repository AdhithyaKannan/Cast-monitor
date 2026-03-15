import { motion } from "framer-motion";
import { getStatusColors } from "../utils/helpers";

export default function ThresholdBar({ sensor, value }) {
  const sc  = getStatusColors(sensor, value);
  const rng = sensor.max - sensor.min;
  const slp = ((sensor.safe[0] - sensor.min) / rng) * 100;
  const swp = ((sensor.safe[1] - sensor.safe[0]) / rng) * 100;
  const vp  = Math.min(100, Math.max(0, ((value - sensor.min) / rng) * 100));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "#475569", fontSize: "11px", fontFamily: "'DM Mono', monospace" }}>
        <span>{sensor.min}{sensor.unit}</span>
        <span>Safe: {sensor.safe[0]}–{sensor.safe[1]}</span>
        <span>{sensor.max}{sensor.unit}</span>
      </div>
      <div style={{ position: "relative", height: "6px", borderRadius: "999px", background: "#1e293b" }}>
        <div style={{ position: "absolute", height: "100%", borderRadius: "999px", left: `${slp}%`, width: `${swp}%`, background: "#16a34a33" }}/>
        <motion.div style={{ position: "absolute", width: "12px", height: "12px", top: "50%", left: `${vp}%`, background: sc.text, borderRadius: "50%", border: "2px solid #0a0f1e", transform: "translateX(-50%) translateY(-50%)" }} layout transition={{ type: "spring", stiffness: 100, damping: 20 }}/>
      </div>
    </div>
  );
}