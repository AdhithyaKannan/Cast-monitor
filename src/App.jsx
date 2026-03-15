import { motion } from "framer-motion";
import { SENSORS } from "./constants/sensors";
import { useSensorData } from "./hooks/useSensorData";
import {
  Header, SummaryBar, SensorCard,
  AlertToast, MoistureStatusBadge, InfectionBanner,
} from "./components";

export default function App() {
  const {
    values, histories,
    moistureStatus, alerts, time,
    overallStatus, connectionStatus, lastUpdated,
    infection, dismissAlert,
  } = useSensorData();

  return (
    <div style={{
      minHeight: "100vh", background: "#05080f",
      fontFamily: "'Space Grotesk', sans-serif",
      padding: "24px", boxSizing: "border-box",
    }}>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background:
          "radial-gradient(ellipse 60% 40% at 20% 10%, rgba(14,165,233,0.05) 0%, transparent 60%)," +
          "radial-gradient(ellipse 50% 35% at 80% 80%, rgba(167,139,250,0.05) 0%, transparent 60%)",
      }} />

      <AlertToast alerts={alerts} onDismiss={dismissAlert} />

      <div style={{ position: "relative", maxWidth: "1400px", margin: "0 auto" }}>

        <Header time={time} connectionStatus={connectionStatus} lastUpdated={lastUpdated} />

        {/* ── Infection prediction banner ── */}
        <InfectionBanner infection={infection} />

        <SummaryBar overallStatus={overallStatus} time={time} sensorCount={SENSORS.length} />

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px", marginBottom: "16px",
        }}>
          {SENSORS.map((sensor, i) => (
            <SensorCard
              key={sensor.key}
              sensor={sensor}
              value={values[sensor.key]}
              history={histories[sensor.key]}
              index={i}
            />
          ))}
        </div>

        <MoistureStatusBadge status={moistureStatus} />

        <motion.footer
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          style={{
            marginTop: "24px", textAlign: "center",
            color: "#1e293b", fontSize: "11px",
            fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em",
          }}
        >
          IoT SMART BAND · FRACTURE HEALING MONITOR · POWERED BY PUSHER REALTIME
        </motion.footer>
      </div>
    </div>
  );
}