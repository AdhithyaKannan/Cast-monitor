import { motion, AnimatePresence } from "framer-motion";

export default function AlertToast({ alerts, onDismiss }) {
  return (
    <div style={{ position: "fixed", top: "16px", right: "16px", zIndex: 50, display: "flex", flexDirection: "column", gap: "8px", maxWidth: "320px", width: "calc(100vw - 32px)" }}>
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div key={alert.id} initial={{ x: 80, opacity: 0, scale: 0.95 }} animate={{ x: 0, opacity: 1, scale: 1 }} exit={{ x: 80, opacity: 0, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
            style={{ borderRadius: "12px", padding: "12px", display: "flex", alignItems: "flex-start", gap: "8px", background: "#1a0a0a", border: "1px solid #7f1d1d", boxShadow: "0 4px 20px rgba(239,68,68,0.25)" }}>
            <span style={{ fontSize: "18px", marginTop: "2px" }}>⚠</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "13px", color: "#fca5a5", fontFamily: "'DM Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{alert.label}</div>
              <div style={{ fontSize: "11px", color: "#f87171", opacity: 0.7, marginTop: "2px" }}>{alert.message}</div>
              <div style={{ fontSize: "10px", color: "#7f1d1d", fontFamily: "'DM Mono', monospace", marginTop: "2px" }}>{alert.timestamp}</div>
            </div>
            <button onClick={() => onDismiss(alert.id)} style={{ background: "#2d0a0a", border: "1px solid #7f1d1d", color: "#dc2626", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "10px", flexShrink: 0 }}>✕</button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}