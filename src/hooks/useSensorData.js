import { useState, useEffect, useRef, useCallback } from "react";
import Pusher from "pusher-js";
import { SENSORS } from "../constants/sensors";
import { PUSHER_CONFIG, PUSHER_CHANNEL, PUSHER_EVENT } from "../constants/pusher";
import { AnomalyDetector } from "../utils/AnomalyDetector";

const HISTORY_LENGTH = 50;
const detector = new AnomalyDetector(40, 2.5);

export function useSensorData() {
  const [values, setValues] = useState(() =>
    Object.fromEntries(SENSORS.map((s) => [s.key, s.baseVal]))
  );
  const [histories, setHistories] = useState(() =>
    Object.fromEntries(SENSORS.map((s) => [s.key, [s.baseVal]]))
  );
  const [anomalies, setAnomalies] = useState(() =>
    Object.fromEntries(SENSORS.map((s) => [s.key, false]))
  );
  const [confidences, setConfidences] = useState(() =>
    Object.fromEntries(SENSORS.map((s) => [s.key, 0]))
  );
  const [moistureStatus, setMoistureStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [time, setTime] = useState(() => new Date().toLocaleTimeString());
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [lastUpdated, setLastUpdated] = useState(null);

  const alertIdRef = useRef(0);

  const dismissAlert = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Process incoming sensor payload from Pusher
  const processPayload = useCallback((data) => {
    // data shape: { humidity, envTemp, bodyTemp, moisture, ph, moistureStatus, timestamp }
    const newValues = {};
    const newAnomalies = {};
    const newConfidences = {};
    const freshAlerts = [];

    SENSORS.forEach((s) => {
      const raw = data[s.key];
      if (raw === undefined || raw === null) return;
      const v = s.transform ? s.transform(raw) : parseFloat(raw);
      if (isNaN(v)) return;

      newValues[s.key] = v;
      detector.feed(s.key, v);
      newAnomalies[s.key] = detector.isAnomaly(s.key, v);
      newConfidences[s.key] = detector.getConfidence(s.key);

      if (newAnomalies[s.key]) {
        freshAlerts.push({
          id: ++alertIdRef.current,
          sensorKey: s.key,
          label: s.label,
          message: `Value ${v}${s.unit} — AI anomaly detected`,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    });

    if (data.moistureStatus !== undefined) {
      setMoistureStatus(parseInt(data.moistureStatus));
    }

    setValues((prev) => ({ ...prev, ...newValues }));
    setHistories((h) => {
      const nh = { ...h };
      SENSORS.forEach((s) => {
        if (newValues[s.key] !== undefined)
          nh[s.key] = [...(h[s.key] || []).slice(-(HISTORY_LENGTH - 1)), newValues[s.key]];
      });
      return nh;
    });
    setAnomalies((prev) => ({ ...prev, ...newAnomalies }));
    setConfidences((prev) => ({ ...prev, ...newConfidences }));
    setTime(new Date().toLocaleTimeString());
    setLastUpdated(data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString());
    setConnectionStatus("live");

    if (freshAlerts.length) {
      setAlerts((a) => [...a, ...freshAlerts].slice(-4));
      const ids = freshAlerts.map((fa) => fa.id);
      setTimeout(() => setAlerts((a) => a.filter((al) => !ids.includes(al.id))), 6000);
    }
  }, []);

  useEffect(() => {
    detector.warmup(SENSORS, 20);

    // Initialise Pusher
    const pusher = new Pusher(PUSHER_CONFIG.key, {
      cluster: PUSHER_CONFIG.cluster,
    });

    const channel = pusher.subscribe(PUSHER_CHANNEL);

    // Connection state handlers
    pusher.connection.bind("connecting", () => setConnectionStatus("connecting"));
    pusher.connection.bind("connected",  () => setConnectionStatus("live"));
    pusher.connection.bind("disconnected", () => setConnectionStatus("error"));
    pusher.connection.bind("failed",     () => setConnectionStatus("error"));

    // Listen for sensor data
    channel.bind(PUSHER_EVENT, (data) => {
      processPayload(data);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(PUSHER_CHANNEL);
      pusher.disconnect();
    };
  }, [processPayload]);

  const anyAnomaly = Object.values(anomalies).some(Boolean);
  const allGood = SENSORS.every((s) => !anomalies[s.key]);
  const overallStatus = anyAnomaly ? "anomaly" : allGood ? "good" : "warning";

  return {
    values, histories, anomalies, confidences,
    moistureStatus, alerts, time,
    overallStatus, connectionStatus, lastUpdated,
    dismissAlert,
  };
}