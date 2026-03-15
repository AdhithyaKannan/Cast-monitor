import { useState, useEffect, useCallback, useRef } from "react";
import Pusher from "pusher-js";
import { SENSORS } from "../constants/sensors";
import { PUSHER_CONFIG, PUSHER_CHANNEL, PUSHER_EVENT } from "../constants/pusher";
import { predictInfection } from "../utils/infectionEngine";
import { filterIdleValues } from "../utils/idleFilter";

const HISTORY_LENGTH = 50;

// Tracks the last REAL (non-idle) value per sensor key
// Used by infection engine — only real readings count
const lastRealValues = {};
const lastRealTimestamps = {};

export function useSensorData() {
  const [values, setValues] = useState(() =>
    Object.fromEntries(SENSORS.map((s) => [s.key, s.baseVal]))
  );
  const [histories, setHistories] = useState(() =>
    Object.fromEntries(SENSORS.map((s) => [s.key, [s.baseVal]]))
  );
  // Which sensors are currently showing a held (non-real) value
  const [heldSensors, setHeldSensors] = useState({});
  const [sensorTimestamps, setSensorTimestamps] = useState(() =>
    Object.fromEntries(SENSORS.map((s) => [s.key, null]))
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
    const now        = Date.now();
    const rawValues  = {};

    // Parse all sensor values from payload
    SENSORS.forEach((s) => {
      const raw = data[s.key];
      if (raw === undefined || raw === null) return;
      const v = s.transform ? s.transform(raw) : parseFloat(raw);
      if (!isNaN(v)) rawValues[s.key] = v;
    });

    // Filter out idle readings — keep last known real value for idle sensors
    const { filtered, skipped } = filterIdleValues(rawValues, lastRealValues);

    if (skipped.length > 0) {
      console.log("[IdleFilter] Skipped:", skipped);
    }

    // Track which sensors got real vs held values
    const newHeld = {};
    const newTimestamps = {};

    SENSORS.forEach((s) => {
      const incomingRaw   = rawValues[s.key];
      const incomingIsIdle = skipped.some(sk => sk.startsWith(s.key));

      if (!incomingIsIdle && incomingRaw !== undefined) {
        // Real reading — update lastRealValues and timestamp
        lastRealValues[s.key]     = filtered[s.key];
        lastRealTimestamps[s.key] = now;
        newHeld[s.key]            = false;
        newTimestamps[s.key]      = now;
      } else if (lastRealValues[s.key] !== undefined) {
        // Idle reading — holding last real value
        newHeld[s.key]       = true;
        newTimestamps[s.key] = lastRealTimestamps[s.key] || null;
      }
    });

    if (data.moistureStatus !== undefined) {
      setMoistureStatus(parseInt(data.moistureStatus));
    }

    // Update displayed values
    setValues((prev) => {
      const merged = { ...prev };
      Object.keys(filtered).forEach((k) => {
        if (filtered[k] !== undefined) merged[k] = filtered[k];
      });

      // Run infection prediction using ONLY real sensor timestamps
      const prediction = predictInfection(merged, lastRealTimestamps);
      setInfection(prediction);

      return merged;
    });

    setHistories((h) => {
      const nh = { ...h };
      SENSORS.forEach((s) => {
        // Only add to history if it was a real reading (not held)
        const isHeld = newHeld[s.key];
        if (!isHeld && filtered[s.key] !== undefined) {
          nh[s.key] = [...(h[s.key] || []).slice(-(HISTORY_LENGTH - 1)), filtered[s.key]];
        }
      });
      return nh;
    });

    setHeldSensors((prev) => ({ ...prev, ...newHeld }));
    setSensorTimestamps((prev) => ({ ...prev, ...newTimestamps }));
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
    values, histories, heldSensors,
    moistureStatus, alerts, time,
    overallStatus, connectionStatus, lastUpdated,
    infection, dismissAlert,
  };
}