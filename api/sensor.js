import Pusher from "pusher";

const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID,
  key:     process.env.PUSHER_KEY,
  secret:  process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS:  true,
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-device-secret");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  const deviceSecret = req.headers["x-device-secret"];
  if (deviceSecret !== process.env.DEVICE_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const body = req.body;
  if (!body) return res.status(400).json({ error: "Empty body" });

  // ── Keep-alive ping from dashboard — return immediately, skip Pusher ──
  if (body.ping === true) {
    return res.status(200).json({ ok: true, pong: true });
  }

  const { humidity, envTemp, bodyTemp, moisture, moistureStatus, ph } = body;

  if (humidity === undefined && envTemp === undefined && bodyTemp === undefined) {
    return res.status(400).json({ error: "No sensor data found in body" });
  }

  const payload = {
    humidity:       parseFloat(humidity)      || null,
    envTemp:        parseFloat(envTemp)       || null,
    bodyTemp:       parseFloat(bodyTemp)      || null,
    moisture:       parseFloat(moisture)      || null,
    moistureStatus: parseInt(moistureStatus)  ?? null,
    ph:             parseFloat(ph)            || null,
    timestamp:      new Date().toISOString(),
  };

  try {
    await pusher.trigger("smartband", "sensor-update", payload);
    console.log("Pushed:", payload);
    return res.status(200).json({ ok: true, payload });
  } catch (err) {
    console.error("Pusher error:", err);
    return res.status(500).json({ error: "Pusher trigger failed" });
  }
}