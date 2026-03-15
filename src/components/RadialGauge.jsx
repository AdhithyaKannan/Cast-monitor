import { motion } from "framer-motion";
import { arcPath, formatValue, getStatusColors } from "../utils/helpers";

const SIZE = 180, CX = 90, CY = 90, R = 72, SW = 10;
const SA = -220, EA = 40, ARC = 260;

export default function RadialGauge({ sensor, value, anomaly }) {
  // Clamp pct between 0 and 1 so arc never goes negative or overflows
  const pct  = Math.min(1, Math.max(0, (value - sensor.min) / (sensor.max - sensor.min)));
  const vA   = SA + pct * ARC;

  const ssA  = SA + Math.min(1, Math.max(0, (sensor.safe[0] - sensor.min) / (sensor.max - sensor.min))) * ARC;
  const seA  = SA + Math.min(1, Math.max(0, (sensor.safe[1] - sensor.min) / (sensor.max - sensor.min))) * ARC;

  const nX   = CX + (R - 14) * Math.cos((vA * Math.PI) / 180);
  const nY   = CY + (R - 14) * Math.sin((vA * Math.PI) / 180);
  const sc   = getStatusColors(sensor, value);
  const fid  = `glow-${sensor.key}`;

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <defs>
        <filter id={fid}>
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Track */}
      <path d={arcPath(CX,CY,R,SA,EA)} fill="none" stroke="#1e293b" strokeWidth={SW} strokeLinecap="round"/>

      {/* Safe zone */}
      <path d={arcPath(CX,CY,R,ssA,seA)} fill="none" stroke="#16a34a" strokeWidth={SW*0.55} strokeLinecap="round" opacity="0.25"/>

      {/* Value arc — only render if pct > 0 */}
      {pct > 0 && (
        <motion.path
          d={arcPath(CX,CY,R,SA,vA)}
          fill="none" stroke={sc.text} strokeWidth={SW} strokeLinecap="round"
          filter={`url(#${fid})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      )}

      {/* Needle glow */}
      <circle cx={nX} cy={nY} r={9} fill={sc.text} opacity="0.3" filter={`url(#${fid})`}/>

      {/* Needle dot — no layout animation, just position */}
      <circle cx={nX} cy={nY} r={5} fill={sc.text}/>

      {/* Centre value */}
      <text x={CX} y={CY - 4} textAnchor="middle" fill={sc.text} fontSize="22" fontWeight="700" fontFamily="'DM Mono', monospace">
        {formatValue(value)}
      </text>
      <text x={CX} y={CY + 16} textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="'DM Mono', monospace">
        {sensor.unit}
      </text>

      {/* Anomaly ring */}
      {anomaly && (
        <motion.circle
          cx={CX} cy={CY} r={R + SW/2 + 4}
          fill="none" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="6 4"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          style={{ transformOrigin: `${CX}px ${CY}px` }}
        />
      )}
    </svg>
  );
}