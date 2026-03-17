import { useState, useEffect, useCallback } from "react";
import Pusher from "pusher-js";
import { SENSORS } from "../constants/sensors";
import { PUSHER_CONFIG, PUSHER_CHANNEL, PUSHER_EVENT } from "../constants/pusher";
import { predictInfection } from "../utils/infectionEngine";
import { isIdle } from "../utils/idleFilter";

const HISTORY_LENGTH = 50;
const API_URL        = "https://cast-monitor.vercel.app/api/sensor";
const DEVICE_SECRET  = "smartband_secret_2024";

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

    SENSORS.forEach((s) => {
      const raw = data[s.key];
      if (raw === undefined || raw === null) return;
      const v = s.transform ? s.transform(raw) : parseFloat(raw);
      if (!isNaN(v)) newValues[s.key] = v;
    });

    if (Object.keys(newValues).length === 0) return;

    // Update real values for infection engine
    SENSORS.forEach((s) => {
      const v = newValues[s.key];
      if (v === undefined) return;
      const { idle } = isIdle(s.key, v);
      if (!idle) {
        realValues[s.key]     = v;
        realTimestamps[s.key] = now;
      }
    });

    const prediction = predictInfection(realValues, realTimestamps);
    setInfection(prediction);

    if (data.moistureStatus !== undefined && data.moistureStatus !== null) {
      setMoistureStatus(parseInt(data.moistureStatus));
    }

    setValues((prev) => ({ ...prev, ...newValues }));

    setHistories((h) => {
      const nh = { ...h };
      SENSORS.forEach((s) => {
        const v = newValues[s.key];
        if (v !== undefined && !isNaN(v)) {
          nh[s.key] = [...(h[s.key] || []).slice(-(HISTORY_LENGTH - 1)), v];
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
    // ── Keep Vercel function warm ─────────────────────────
    // Pings every 10s so function never goes cold between readings
    const keepWarm = setInterval(() => {
      fetch(API_URL, {
        method:  "POST",
        headers: {
          "Content-Type":    "application/json",
          "x-device-secret": DEVICE_SECRET,
        },
        body: JSON.stringify({ ping: true }),
      }).catch(() => {}); // silently ignore errors
    }, 10000);

    // ── Pusher real-time connection ───────────────────────
    const pusher  = new Pusher(PUSHER_CONFIG.key, { cluster: PUSHER_CONFIG.cluster });
    const channel = pusher.subscribe(PUSHER_CHANNEL);

    pusher.connection.bind("connecting",   () => setConnectionStatus("connecting"));
    pusher.connection.bind("connected",    () => setConnectionStatus("live"));
    pusher.connection.bind("disconnected", () => setConnectionStatus("error"));
    pusher.connection.bind("failed",       () => setConnectionStatus("error"));

    channel.bind(PUSHER_EVENT, (data) => processPayload(data));

    return () => {
      clearInterval(keepWarm);
      channel.unbind_all();
      pusher.unsubscribe(PUSHER_CHANNEL);
      pusher.disconnect();
    };
  }, [processPayload]);

  const overallStatus = (() => {
    const statuses = SENSORS.map((s) => {
      const v = values[s.key];
      if (v === null || v === undefined) return "good";
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