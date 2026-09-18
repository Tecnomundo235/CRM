// ==============================================================================
// Servidor Webhook Independiente de Alta Eficiencia para VPS DigitalOcean
// Diseñado especialmente para Droplet de 512MB RAM (Cero dependencias pesadas)
// Compatible con Cloudflare Tunnel (http://localhost:3000) y Meta Cloud API
// ==============================================================================

const http = require("http");
const https = require("https");
const url = require("url");

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "docenty_pro_secure_verify_2026";
const ACCESS_TOKEN = process.env.META_WA_TOKEN || "EAAbipQWNwwsBSiKZChy8QdP2dHyK1ztEpIHHonMxHGQlpeDuR66oEAayl4wovF7MfEFKDqr2KHbZBOMbGKZBZAX4Emyt2VLjg9BWQCbDijl5nu8MZBRaaShvJcvaz3Wwdwm3DTwn1Y3ij2UerM3IXlVVFtGZCHQfOzl0RV3Vrs772xFVCaZCjsus1FMv7yOgckBaAZDZD";
const PHONE_NUMBER_ID = process.env.META_PHONE_NUM || "1221464777727895";
const WABA_ID = process.env.META_WABA_ID || "2562659904236968";

console.log("------------------------------------------------------------");
console.log("🚀 Iniciando Servidor Webhook Docenty PRO en VPS...");
console.log(`📌 Puerto Local: ${PORT}`);
console.log(`🔑 Verify Token Meta: ${VERIFY_TOKEN}`);
console.log(`📱 Phone Number ID: ${PHONE_NUMBER_ID}`);
console.log("------------------------------------------------------------");

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Verificación oficial de Webhook de Meta (GET /api/webhook o GET /webhook)
  if (req.method === "GET" && (pathname === "/api/webhook" || pathname === "/webhook" || pathname === "/")) {
    const mode = parsedUrl.query["hub.mode"];
    const token = parsedUrl.query["hub.verify_token"];
    const challenge = parsedUrl.query["hub.challenge"];

    if (mode && token) {
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("✅ [Meta Webhook] ¡Verificación exitosa! Retornando challenge a Meta.");
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(challenge);
        return;
      } else {
        console.warn(`❌ [Meta Webhook] Token inválido: "${token}". Esperado: "${VERIFY_TOKEN}"`);
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Forbidden");
        return;
      }
    }

    // Health check si se abre en el navegador
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "online",
      server: "Docenty PRO VPS Webhook Server",
      port: PORT,
      verifyTokenConfigured: VERIFY_TOKEN,
      metaConfigured: Boolean(ACCESS_TOKEN),
      timestamp: new Date().toISOString()
    }, null, 2));
    return;
  }

  // 2. Recepción de mensajes de WhatsApp de Meta (POST /api/webhook)
  if (req.method === "POST" && (pathname === "/api/webhook" || pathname === "/webhook")) {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      // Responder 200 OK inmediatamente a Meta (< 3s)
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "EVENT_RECEIVED" }));

      try {
        const payload = JSON.parse(body);
        console.log("📩 [Mensaje Recibido de WhatsApp]:", JSON.stringify(payload, null, 2));

        // Procesar cambios
        if (payload.entry && payload.entry[0]?.changes) {
          for (const change of payload.entry[0].changes) {
            const value = change.value;
            if (value?.messages && value.messages.length > 0) {
              const msg = value.messages[0];
              const from = msg.from;
              const text = msg.text?.body || "(Multimedia/Audio)";
              const contactName = value.contacts?.[0]?.profile?.name || "Cliente";
              console.log(`💬 De: ${contactName} (+${from}): ${text}`);
            }
          }
        }
      } catch (err) {
        console.error("Error al procesar payload:", err.message);
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor activo en http://0.0.0.0:${PORT}`);
  console.log(`👉 Tu Cloudflare Tunnel ahora recibirá y responderá las verificaciones de Meta.`);
});
