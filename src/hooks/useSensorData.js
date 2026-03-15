import { useState, useEffect, useCallback } from "react";
import Pusher from "pusher-js";
import { SENSORS } from "../constants/sensors";
import { PUSHER_CONFIG, PUSHER_CHANNEL, PUSHER_EVENT } from "../constants/pusher";
import { predictInfection } from "../utils/infectionEngine";

const HISTORY_LENGTH = 50;

export function useSensorData() {
  const [values, setValues] = useState(() =>
    Object.fromEntries(SENSORS.map((s) => [s.key, s.baseVal]))
  );
  const [histories, setHistories] = useState(() =>
    Object.fromEntries(SENSORS.map((s) => [s.key, [s.baseVal]]))
  );
  // Track when each sensor last received fresh data
  const [sensorTimestamps, setSensorTimestamps] = useState(() =>
    Object.fromEntries(SENSORS.map((s) => [s.key, null]))
  );
  const [moistureStatus, setMoistureStatus]   = useState(null);
  const [alerts, setAlerts]                   = useState([]);
  const [time, setTime]                       = useState(() => new Date().toLocaleTimeString());
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [lastUpdated, setLastUpdated]         = useState(null);
  const [infection, setInfection]             = useState(null);

  const dismissAlert = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const processPayload = useCallback((data) => {
    const newValues      = {};
    const newTimestamps  = {};
    const now            = Date.now();

    SENSORS.forEach((s) => {
      const raw = data[s.key];
      if (raw === undefined || raw === null) return;
      const v = s.transform ? s.transform(raw) : parseFloat(raw);
      if (isNaN(v)) return;
      newValues[s.key]     = v;
      newTimestamps[s.key] = now;
    });

    if (data.moistureStatus !== undefined) {
      setMoistureStatus(parseInt(data.moistureStatus));
    }

    setValues((prev) => {
      const merged = { ...prev, ...newValues };

      // Run infection prediction with latest merged values + updated timestamps
      setSensorTimestamps((prevTs) => {
        const mergedTs = { ...prevTs, ...newTimestamps };

        const prediction = predictInfection(merged, {
          bodyTemp: mergedTs.bodyTemp,
          ph:       mergedTs.ph,
          moisture: mergedTs.moisture,
        });
        setInfection(prediction);

        return mergedTs;
      });

      return merged;
    });

    setHistories((h) => {
      const nh = { ...h };
      SENSORS.forEach((s) => {
        if (newValues[s.key] !== undefined)
          nh[s.key] = [...(h[s.key] || []).slice(-(HISTORY_LENGTH - 1)), newValues[s.key]];
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

    channel.bind(PUSHER_EVENT, (data) => {
      processPayload(data);
    });

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
    values, histories, sensorTimestamps,
    moistureStatus, alerts, time,
    overallStatus, connectionStatus, lastUpdated,
    infection, dismissAlert,
  };
}