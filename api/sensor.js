// ─────────────────────────────────────────────────────────────────────────────
//  Vercel Serverless Function — /api/sensor
//
//  Receives HTTP POST from NodeMCU with sensor data,
//  then broadcasts it in real-time via Pusher to all
//  connected dashboard clients.
//
//  ENV VARIABLES (set in Vercel dashboard → Settings → Environment Variables):
//    PUSHER_APP_ID      ← App ID from Pusher dashboard
//    PUSHER_KEY         ← Key from Pusher dashboard
//    PUSHER_SECRET      ← Secret from Pusher dashboard
//    PUSHER_CLUSTER     ← Cluster e.g. "ap2"
//    DEVICE_SECRET      ← Any random string, must match NodeMCU code
// ─────────────────────────────────────────────────────────────────────────────

import Pusher from "pusher";

const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID,
  key:     process.env.PUSHER_KEY,
  secret:  process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS:  true,
});

export default async function handler(req, res) {
  // Allow OPTIONS preflight (CORS)
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-device-secret");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Simple auth — NodeMCU must send a secret header
  const deviceSecret = req.headers["x-device-secret"];
  if (deviceSecret !== process.env.DEVICE_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Parse body
  const body = req.body;
  if (!body) {
    return res.status(400).json({ error: "Empty body" });
  }

  // Expected fields from NodeMCU:
  // { humidity, envTemp, bodyTemp, moisture, moistureStatus, ph }
  const {
    humidity,
    envTemp,
    bodyTemp,
    moisture,
    moistureStatus,
    ph,
  } = body;

  // Validate we have at least some values
  if (
    humidity === undefined &&
    envTemp  === undefined &&
    bodyTemp === undefined
  ) {
    return res.status(400).json({ error: "No sensor data found in body" });
  }

  const payload = {
    humidity:      parseFloat(humidity)      || null,
    envTemp:       parseFloat(envTemp)       || null,
    bodyTemp:      parseFloat(bodyTemp)      || null,
    moisture:      parseFloat(moisture)      || null,  // raw 0-1023
    moistureStatus: parseInt(moistureStatus) ?? null,  // 0 or 1
    ph:            parseFloat(ph)            || null,
    timestamp:     new Date().toISOString(),
  };

  try {
    // Broadcast to all dashboard subscribers instantly
    await pusher.trigger("smartband", "sensor-update", payload);
    console.log("Pushed:", payload);
    return res.status(200).json({ ok: true, payload });
  } catch (err) {
    console.error("Pusher error:", err);
    return res.status(500).json({ error: "Pusher trigger failed" });
  }
}