import { useState, useEffect, useCallback } from "react";
import Pusher from "pusher-js";
import { SENSORS } from "../constants/sensors";
import { PUSHER_CONFIG, PUSHER_CHANNEL, PUSHER_EVENT } from "../constants/pusher";
import { predictInfection } from "../utils/infectionEngine";
import { isIdle } from "../utils/idleFilter";

const HISTORY_LENGTH = 50;

// Last known REAL (non-idle) values — only used by infection engine
const realValues     = {};
const realTimestamps = {};

export function useSensorData() {
  const [values, setValues] = useState(() =>
    Object.fromEntries(SENSORS.map((s) => [s.key, s.baseVal]))
  );
  const [histories, setHistories] = useState(() =>
    Object.fromEntries(SENSORS.map((s) => [s.key, [s.baseVal]]))
  );
  const [moistureStatus, setMoistureStatus]     = useState(null);
  const [alerts, setAlerts]                     = useState([]);
  const [time, setTime]                         = useState(() => new Date().toLocaleTimeString());
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [lastUpdated, setLastUpdated]           = useState(null);
  const [infection, setInfection]               = useState(null);

  const dismissAlert = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const processPayload = useCallback((data) => {
    const now       = Date.now();
    const newValues = {};

    // Parse every sensor value from payload — no filtering
    SENSORS.forEach((s) => {
      const raw = data[s.key];
      if (raw === undefined || raw === null) return;
      const v = s.transform ? s.transform(raw) : parseFloat(raw);
      if (!isNaN(v)) newValues[s.key] = v;
    });

    // Separately track real values for infection engine only
    SENSORS.forEach((s) => {
      const v = newValues[s.key];
      if (v === undefined) return;
      const { idle } = isIdle(s.key, v);
      if (!idle) {
        realValues[s.key]     = v;
        realTimestamps[s.key] = now;
      }
    });

    // Update infection engine with real values only
    const prediction = predictInfection(realValues, realTimestamps);
    setInfection(prediction);

    if (data.moistureStatus !== undefined) {
      setMoistureStatus(parseInt(data.moistureStatus));
    }

    // Dashboard gets every value instantly — no delay, no filtering
    setValues((prev) => ({ ...prev, ...newValues }));

    // History also updates with every real reading
    setHistories((h) => {
      const nh = { ...h };
      SENSORS.forEach((s) => {
        if (newValues[s.key] !== undefined) {
          nh[s.key] = [...(h[s.key] || []).slice(-(HISTORY_LENGTH - 1)), newValues[s.key]];
        }
      });
      return nh;
    });

    setTime(new Date().toLocaleTimeString());
    setLastUpdated(
      data.timestamp
        ? new Date(data.timestamp).toLocaleTimeString()
        : new Date().toLocaleTimeString()
    );
    setConnectionStatus("live");
  }, []);

  useEffect(() => {
    const pusher = new Pusher(PUSHER_CONFIG.key, {
      cluster: PUSHER_CONFIG.cluster,
    });

    const channel = pusher.subscribe(PUSHER_CHANNEL);

    pusher.connection.bind("connecting",   () => setConnectionStatus("connecting"));
    pusher.connection.bind("connected",    () => setConnectionStatus("live"));
    pusher.connection.bind("disconnected", () => setConnectionStatus("error"));
    pusher.connection.bind("failed",       () => setConnectionStatus("error"));

    channel.bind(PUSHER_EVENT, (data) => processPayload(data));

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(PUSHER_CHANNEL);
      pusher.disconnect();
    };
  }, [processPayload]);

  const overallStatus = (() => {
    const statuses = SENSORS.map((s) => {
      const v = values[s.key];
      if (v < s.thresholds.low || v > s.thresholds.high) return "critical";
      if (v < s.safe[0] || v > s.safe[1]) return "warning";
      return "good";
    });
    if (statuses.includes("critical")) return "anomaly";
    if (statuses.includes("warning"))  return "warning";
    return "good";
  })();

  return {
    values, histories,
    moistureStatus, alerts, time,
    overallStatus, connectionStatus, lastUpdated,
    infection, dismissAlert,
  };
}