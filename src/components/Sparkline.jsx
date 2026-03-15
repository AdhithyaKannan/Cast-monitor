import { getStatusColors } from "../utils/helpers";
const PAD = 8;

export default function Sparkline({ data = [], sensor, width = 280, height = 70 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const w = width - PAD * 2, h = height - PAD * 2;
  const pts = data.map((v, i) => ({ x: PAD + (i / (data.length - 1)) * w, y: PAD + h - ((v - min) / range) * h }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${pts[pts.length-1].x} ${height} L ${PAD} ${height} Z`;
  const sc = getStatusColors(sensor, data[data.length - 1]);
  const gid = `sg-${sensor.key}`;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sc.text} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={sc.text} stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gid})`}/>
      <path d={pathD} fill="none" stroke={sc.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="3.5" fill={sc.text}/>
    </svg>
  );
}