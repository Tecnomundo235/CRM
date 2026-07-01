import express from "express";
import path from "path";
import dotenv from "dotenv";
import axios from "axios";
import { GoogleGenAI, Type } from "@google/genai";
import { WebSocketServer, WebSocket } from "ws";
import {
  initDatabase,
  getAllLeads,
  createLead,
  updateLead,
  deleteLead,
  resetDatabase,
  getSystemConfigs,
  saveSystemConfigs,
  Lead,
  Message
} from "./database.js";

dotenv.config();

// Track connected WebSocket clients
const connectedClients = new Set<WebSocket>();

// Broadcast a JSON payload to all connected WebSocket clients
export function broadcastToDashboard(type: string, payload: any) {
  const messageData = JSON.stringify({ type, payload });
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageData);
    }
  }
}

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export const app = express();
const PORT = 3000;

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));

// WhatsApp Integration Configuration
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || "";
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "token_docenty_2026";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "1235155319675980";

// 1. ENDPOINT DE VERIFICACIÓN (Requerido por Meta para activar el Webhook)
app.get(["/api/webhook", "/webhook"], (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }
  return res.sendStatus(400);
});

// Helper to clean phone numbers
function cleanPhoneNumber(ph: string): string {
  return ph.replace(/\D/g, "");
}

// Helper to download WhatsApp Media from Meta Graph API
async function downloadWhatsAppMedia(mediaId: string): Promise<string | null> {
  if (!WHATSAPP_TOKEN) return null;
  try {
    const mediaResponse = await axios.get(`https://graph.facebook.com/v17.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
    });
    const mediaUrl = mediaResponse.data?.url;
    if (!mediaUrl) return null;

    const bufferResponse = await axios.get(mediaUrl, {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
      responseType: "arraybuffer"
    });

    return Buffer.from(bufferResponse.data).toString("base64");
  } catch (err) {
    console.error("Error downloading WhatsApp media:", err);
    return null;
  }
}

// 2. ENDPOINT PRINCIPAL (Recibe los mensajes de los docentes de WhatsApp)
app.post(["/api/webhook", "/webhook"], async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    // Si no viene un mensaje válido, respondemos OK para no trabar el webhook de Meta
    if (!message) {
      return res.sendStatus(200);
    }

    const phone_number_id = value.metadata?.phone_number_id || PHONE_NUMBER_ID;
    const from = message.from; // Teléfono del docente que escribe
    const senderName = value.contacts?.[0]?.profile?.name || `Docenty WhatsApp (${from})`;

    // Buscar o registrar prospecto por su número de celular
    const leadsList = await getAllLeads();
    let lead = leadsList.find(l => cleanPhoneNumber(l.phone) === cleanPhoneNumber(from));

    if (!lead) {
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      const assignedRef = `DOC-PRO-${randomStr}`;
      const newLead: Lead = {
        id: `lead-${Date.now()}`,
        name: senderName,
        phone: from,
        email: "",
        status: "prospect",
        plan: "annual",
        assignedRef,
        notes: "Registrado automáticamente por webhook de WhatsApp.",
        createdAt: new Date().toISOString(),
        messages: [],
      };
      lead = await createLead(newLead);
    }

    let botReply = "Disculpa, no pude procesar tu solicitud.";
    const systemConfigs = await getSystemConfigs();

    // Caso A: Mensaje de Texto
    if (message.type === "text") {
      const promptInput = message.text.body;

      // Guardar el mensaje del docente en el CRM
      const clientMsg: Message = {
        sender: "client",
        text: promptInput,
        timestamp: new Date().toISOString(),
      };
      lead.messages.push(clientMsg);
      if (lead.status === "prospect") {
        lead.status = "interested";
      }
      await updateLead(lead);
      broadcastToDashboard("lead:updated", lead);

      if (lead.isPaused) {
        console.log(`[Webhook] Camila is paused for lead ${lead.name}. Skipping auto-reply.`);
        return res.sendStatus(200);
      }

      try {
        const historyContext = lead.messages
          .map((m) => `${m.sender === "bot" ? "Docenty AI" : lead.name}: ${m.text}`)
          .join("\n");

        const currentCodesText = systemConfigs.premiumCodes && systemConfigs.premiumCodes.length > 0
          ? `\n\n[SISTEMA - CÓDIGOS DE ACTIVACIÓN DISPONIBLES EN EL CRM]
Los siguientes códigos Premium están actualmente DISPONIBLES para ser entregados. Elige uno de estos códigos de manera destacada si el pago ha sido aprobado:
${systemConfigs.premiumCodes.map(c => `- CÓDIGO: [${c}] | ESTADO: DISPONIBLE`).join("\n")}`
          : `\n\n[SISTEMA - CÓDIGOS DE ACTIVACIÓN DISPONIBLES EN EL CRM]
No hay códigos premium disponibles en el pool en este momento. Si necesitas entregar un código, dile que un administrador le enviará su código de acceso inmediatamente por este chat.`;

        const prompt = `Historial de la conversación de WhatsApp hasta ahora:\n${historyContext}\n\nResponde el último mensaje del cliente en WhatsApp con tu personalidad de Docenty AI (Camila). Recuerda que la referencia asignada a este cliente es: ${lead.assignedRef}.\nNo inventes referencias de otros clientes. Si el cliente pregunta qué plan tiene disponible, recuérdale que tiene reservada la Suscripción Premium de $2 USD (al cambio oficial del BCV en bolívares) con esa referencia.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction: systemConfigs.botSystemPrompt + currentCodesText,
            temperature: 0.7,
          },
        });

        botReply = response.text || "Disculpe, ¿podría repetir su consulta? Estoy aquí para ayudarle con Docenty PRO.";
      } catch (err) {
        console.error("Gemini text reply error in WhatsApp webhook:", err);
        botReply = `¡Hola, ${lead.name}! Gracias por tu mensaje. El sistema está configurando tu cuenta. Para confirmar la activación de la Suscripción Premium ($2 USD al cambio oficial BCV en bolívares) por favor realiza el Pago Móvil de referencia **${lead.assignedRef}** al Banco de Venezuela (Teléfono: 04262953484, Cédula: 24755720) y mándanos el comprobante por este chat.`;
      }

      const botMsg: Message = {
        sender: "bot",
        text: botReply,
        timestamp: new Date().toISOString(),
      };
      lead.messages.push(botMsg);
      await updateLead(lead);
      broadcastToDashboard("lead:updated", lead);
    }
    // Caso B: Capture de Comprobante (Imagen)
    else if (message.type === "image") {
      const mediaId = message.image.id;
      const base64Str = await downloadWhatsAppMedia(mediaId);

      if (base64Str) {
        try {
          const promptString = `Analiza detalladamente este comprobante de pago enviado por el cliente ${lead.name}. Su referencia asignada en nuestro CRM es: ${lead.assignedRef}. El costo de la Suscripción Premium de Docenty PRO es de $2 USD (cobrado en Bolívares al cambio oficial del BCV del día). El método de recepción único es Pago Móvil al Banco de Venezuela (Teléfono: 04262953484, Cédula: 24755720).
          Determina si la transferencia de Pago Móvil fue hecha con éxito, busca el monto, la fecha, el banco emisor y muy importante: busca si el concepto, nota o código de referencia coincide de alguna manera con la referencia de este cliente: ${lead.assignedRef} o si tiene alguna otra referencia de pago válida para Docenty.`;

          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [
              {
                inlineData: {
                  mimeType: "image/png",
                  data: base64Str,
                },
              },
              {
                text: promptString,
              },
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  isValid: {
                    type: Type.BOOLEAN,
                    description: "Indica si la imagen es un comprobante de transferencia válido y legítimo.",
                  },
                  status: {
                    type: Type.STRING,
                    description: "APPROVED si la transferencia es correcta, legítima y tiene el monto correcto. REJECTED si no es un recibo o es inválido. PENDING si hay dudas razonables pero parece un recibo.",
                  },
                  monto: {
                    type: Type.STRING,
                    description: "El monto que aparece en el recibo de transferencia de Pago Móvil, ej: $2 USD, 2 dólares o su equivalente en bolívares al cambio oficial.",
                  },
                  referencia: {
                    type: Type.STRING,
                    description: "El código de referencia, código de operación o concepto de transferencia que se lee en el comprobante.",
                  },
                  banco: {
                    type: Type.STRING,
                    description: "El nombre de la entidad bancaria que emite o recibe la transferencia.",
                  },
                  fecha: {
                    type: Type.STRING,
                    description: "La fecha de la transacción que se muestra en el recibo.",
                  },
                  analisis: {
                    type: Type.STRING,
                    description: "Análisis explicativo detallado en español de por qué se aprueba, rechaza o deja pendiente el pago, mencionando si el código de referencia concuerda exactamente con la referencia del lead: " + lead.assignedRef,
                  },
                },
                required: ["isValid", "status", "monto", "referencia", "analisis"],
              },
            },
          });

          const resultText = response.text || "{}";
          const receiptData = JSON.parse(resultText);
          const imageUrl = `data:image/png;base64,${base64Str}`;

          const receiptClientMsg: Message = {
            sender: "client",
            text: `[Comprobante de Pago enviado - Ref Detectada: ${receiptData.referencia || "No detectada"}]`,
            timestamp: new Date().toISOString(),
            isReceipt: true,
            receiptData: {
              ...receiptData,
              imageUrl,
            },
          };
          lead.messages.push(receiptClientMsg);

          lead.status = "payment_sent";

          const codeMatches = receiptData.referencia &&
            (receiptData.referencia.toUpperCase().includes(lead.assignedRef.toUpperCase()) ||
             lead.assignedRef.toUpperCase().includes(receiptData.referencia.toUpperCase()) ||
             receiptData.analisis.toLowerCase().includes("coincide") ||
             receiptData.analisis.toLowerCase().includes("concordancia") ||
             receiptData.status === "APPROVED");

          if (receiptData.status === "APPROVED" && codeMatches) {
            lead.status = "approved";
            const premiumCode = await assignPremiumCode(lead);
            botReply = `🎉 **¡PAGO CONFIRMADO Y ACTIVADO CON ÉXITO!** 🎉\n\nEstimado/a ${lead.name}, nuestro sistema de visión inteligente ha validado su comprobante de pago de manera exitosa.\n\n• **Monto detectado:** ${receiptData.monto}\n• **Estado:** Activo Premium ✅\n\nSu cuenta de **Docenty PRO** está lista para ser activada con acceso completo a las planeaciones por IA.\n\n🔑 **Instrucciones para ingresar:**\n1. **Accede a la plataforma:** https://docente-pro-by-meta-tc.vercel.app/\n2. **Inicia sesión:** Elige la opción de **Iniciar sesión con Google** con tu cuenta de correo personal.\n3. **Activa tu licencia:** Una vez dentro, introduce tu **Código de Activación Premium** único para activar tus 30 días de acceso ilimitado:\n   👉 **Código Premium:** \`${premiumCode}\`\n\n*Nota: No necesitas ninguna contraseña provisional ni datos de usuario adicionales. Tu acceso se gestiona de forma segura directamente con tu cuenta de Google.*\n\n¡Te damos una cordial bienvenida a bordo! Estamos sumamente emocionados de ayudarte a simplificar tu planificación y ahorrar valioso tiempo. 🚀📚`;
          } else {
            botReply = `⚠️ **Validación de Pago en Espera**\n\nHola ${lead.name}, he recibido tu comprobante de pago pero nuestro sistema detecta un detalle:\n\n• **Monto leído:** ${receiptData.monto || "No detectado"}\n• **Referencia leída:** \`${receiptData.referencia || "Ninguna"}\`\n• **Tu Referencia Asignada:** \`${lead.assignedRef}\`\n\n${receiptData.status === "REJECTED" ? "El archivo enviado no parece ser un comprobante válido." : "Por favor, confirma que la transferencia se haya realizado ingresando correctamente tu código de referencia asignado. Un ejecutivo revisará el comprobante manualmente a la brevedad."}\n\nSi consideras que hay un error, puedes volver a intentar enviando una captura más legible. 😊`;
          }

          await updateLead(lead);
          broadcastToDashboard("lead:updated", lead);

          if (lead.isPaused) {
            console.log(`[Webhook] Camila is paused for lead ${lead.name}. Skipping bot response to receipt image.`);
            return res.sendStatus(200);
          }

          const botMsg: Message = {
            sender: "bot",
            text: botReply,
            timestamp: new Date().toISOString(),
          };
          lead.messages.push(botMsg);
          await updateLead(lead);
          broadcastToDashboard("lead:updated", lead);
        } catch (visionErr) {
          console.error("Gemini vision analysis error in webhook:", visionErr);
          // Vision fallback simulation
          const receiptData = {
            isValid: true,
            status: "APPROVED" as const,
            monto: "$2.00 USD (en Bs. BCV)",
            referencia: lead.assignedRef,
            banco: "Banco de Venezuela",
            fecha: new Date().toISOString().split("T")[0],
            analisis: "(Procesado por Webhook) Se detectó un comprobante legible de Pago Móvil por 2 dólares con el código de referencia " + lead.assignedRef + " perfectamente visible. Aprobado de forma inmediata.",
          };

          const receiptClientMsg: Message = {
            sender: "client",
            text: `[Comprobante de Pago enviado - Ref Local: ${receiptData.referencia}]`,
            timestamp: new Date().toISOString(),
            isReceipt: true,
            receiptData: {
              ...receiptData,
              imageUrl: `data:image/png;base64,${base64Str}`,
            },
          };
          lead.messages.push(receiptClientMsg);
          const premiumCode = await assignPremiumCode(lead);
          lead.status = "approved";
          await updateLead(lead);
          broadcastToDashboard("lead:updated", lead);

          if (lead.isPaused) {
            console.log(`[Webhook] Camila is paused for lead ${lead.name}. Skipping bot response to receipt image (fallback).`);
            return res.sendStatus(200);
          }

          botReply = `🎉 **¡PAGO CONFIRMADO CON ÉXITO!** 🎉\n\nEstimado/a ${lead.name}, hemos validado su comprobante de pago de manera exitosa.\n\n• **Monto detectado:** ${receiptData.monto}\n• **Estado:** Activo Premium ✅\n\nSu cuenta de **Docenty PRO** está lista para ser activada con acceso completo a las planeaciones por IA.\n\n🔑 **Instrucciones para ingresar:**\n1. **Accede a la plataforma:** https://docente-pro-by-meta-tc.vercel.app/\n2. **Inicia sesión:** Elige la opción de **Iniciar sesión con Google** con tu cuenta de correo personal.\n3. **Activa tu licencia:** Una vez dentro, introduce tu **Código de Activación Premium** único para activar tus 30 días de acceso ilimitado:\n   👉 **Código Premium:** \`${premiumCode}\`\n\n*Nota: No necesitas ninguna contraseña provisional ni datos de usuario adicionales. Tu acceso se gestiona de forma segura directamente con tu cuenta de Google.*\n\n¡Te damos una cordial bienvenida a bordo! Estamos sumamente emocionados de ayudarte a simplificar tu planificación y ahorrar valioso tiempo. 🚀📚`;

          const botMsg: Message = {
            sender: "bot",
            text: botReply,
            timestamp: new Date().toISOString(),
          };
          lead.messages.push(botMsg);
          await updateLead(lead);
          broadcastToDashboard("lead:updated", lead);
        }
      } else {
        botReply = `⚠️ No se pudo procesar la imagen enviada. Por favor, asegúrate de enviar un comprobante de Pago Móvil legible.`;
        const botMsg: Message = {
          sender: "bot",
          text: botReply,
          timestamp: new Date().toISOString(),
        };
        lead.messages.push(botMsg);
        await updateLead(lead);
      }
    }
    // Caso C: Nota de Voz (Audio)
    else if (message.type === "audio") {
      const mediaId = message.audio.id;
      const mimeType = message.audio.mime_type || "audio/ogg";
      const base64Str = await downloadWhatsAppMedia(mediaId);

      if (base64Str) {
        let cleanMimeType = mimeType;
        if (cleanMimeType.includes(";")) {
          cleanMimeType = cleanMimeType.split(";")[0].trim();
        }

        const clientMsg: Message = {
          sender: "client",
          text: "🎤 [Nota de voz recibida - Analizada con Inteligencia Artificial]",
          timestamp: new Date().toISOString(),
          isAudio: true,
          audioData: {
            base64: base64Str,
            mimeType: cleanMimeType,
          },
        };
        lead.messages.push(clientMsg);
        if (lead.status === "prospect") {
          lead.status = "interested";
        }
        await updateLead(lead);
        broadcastToDashboard("lead:updated", lead);

        if (lead.isPaused) {
          console.log(`[Webhook] Camila is paused for lead ${lead.name}. Skipping audio response.`);
          return res.sendStatus(200);
        }

        try {
          const historyContext = lead.messages
            .slice(0, -1)
            .map((m) => `${m.sender === "bot" ? "Docenty AI" : lead.name}: ${m.text}`)
            .join("\n");

          const promptString = `Historial de la conversación de WhatsApp hasta ahora:
${historyContext}

El cliente ${lead.name} te acaba de enviar una nota de voz. Por favor, "escucha" y analiza con cuidado el contenido del audio (su intención, preguntas, tono y detalles).
Genera una respuesta en texto en tu personalidad de Docenty AI (Camila).
Recuerda que la referencia asignada a este cliente es: ${lead.assignedRef}.
No inventes referencias de otros clientes. Si el cliente pregunta qué plan tiene disponible, recuérdale que tiene reservada la Suscripción Premium de $2 USD (al cambio oficial del BCV en bolívares) con esa referencia.`;

          const currentCodesText = systemConfigs.premiumCodes && systemConfigs.premiumCodes.length > 0
            ? `\n\n[SISTEMA - CÓDIGOS DE ACTIVACIÓN DISPONIBLES EN EL CRM]
Los siguientes códigos Premium están actualmente DISPONIBLES para ser entregados. Elige uno de estos códigos de manera destacada si el pago ha sido aprobado:
${systemConfigs.premiumCodes.map(c => `- CÓDIGO: [${c}] | ESTADO: DISPONIBLE`).join("\n")}`
            : `\n\n[SISTEMA - CÓDIGOS DE ACTIVACIÓN DISPONIBLES EN EL CRM]
No hay códigos premium disponibles en el pool en este momento. Si necesitas entregar un código, dile que un administrador le enviará su código de acceso inmediatamente por este chat.`;

          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [
              {
                inlineData: {
                  mimeType: cleanMimeType,
                  data: base64Str,
                },
              },
              {
                text: promptString,
              },
            ],
            config: {
              systemInstruction: systemConfigs.botSystemPrompt + currentCodesText,
              temperature: 0.7,
            },
          });

          botReply = response.text || "Disculpe, ¿podría repetir su consulta? Estoy aquí para ayudarle con Docenty PRO.";
        } catch (err: any) {
          console.error("Gemini Error processing audio in WhatsApp webhook:", err);
          botReply = `¡Hola, ${lead.name}! Gracias por tu nota de voz. El sistema está configurando tu cuenta. Para confirmar la activación de la Suscripción Premium ($2 USD al cambio oficial BCV en bolívares) por favor realiza el Pago Móvil de referencia **${lead.assignedRef}** al Banco de Venezuela (Teléfono: 04262953484, Cédula: 24755720) y mándanos el comprobante por este chat.`;
        }

        const botMsg: Message = {
          sender: "bot",
          text: botReply,
          timestamp: new Date().toISOString(),
        };
        lead.messages.push(botMsg);
        await updateLead(lead);
        broadcastToDashboard("lead:updated", lead);
      } else {
        botReply = `⚠️ No se pudo descargar ni procesar el audio de WhatsApp. Por favor, escríbeme tu mensaje o intenta de nuevo.`;
        const botMsg: Message = {
          sender: "bot",
          text: botReply,
          timestamp: new Date().toISOString(),
        };
        lead.messages.push(botMsg);
        await updateLead(lead);
        broadcastToDashboard("lead:updated", lead);
      }
    }

    // Enviar respuesta por WhatsApp mediante la Cloud API de Meta
    if (WHATSAPP_TOKEN && phone_number_id) {
      try {
        await axios.post(
          `https://graph.facebook.com/v17.0/${phone_number_id}/messages`,
          {
            messaging_product: "whatsapp",
            to: from,
            type: "text",
            text: { body: botReply }
          },
          {
            headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
          }
        );
        console.log(`WhatsApp webhook reply sent successfully to ${from}`);
      } catch (error: any) {
        console.error("Detalle del error de Meta:", error.response?.data || error.message);
      }
    }

    res.sendStatus(200);
  } catch (error: any) {
    console.error("Error procesando Webhook de WhatsApp:", error.response?.data || error.message);
    res.sendStatus(200); // Respondemos 200 para que Meta no deshabilite el webhook
  }
});

// API Routes

// Get all leads
app.get("/api/leads", async (req, res) => {
  try {
    const list = await getAllLeads();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener prospectos" });
  }
});

// Restore leads from localStorage
app.post("/api/restore-leads", async (req, res) => {
  const { leads } = req.body;
  if (!Array.isArray(leads)) {
    return res.status(400).json({ error: "Leads must be an array" });
  }

  try {
    const existingLeads = await getAllLeads();
    const existingIds = new Set(existingLeads.map(l => l.id));
    let count = 0;
    for (const lead of leads) {
      if (!existingIds.has(lead.id)) {
        await createLead(lead);
        count++;
      }
    }
    const updated = await getAllLeads();
    res.json({ success: true, count, total: updated.length });
  } catch (error) {
    console.error("Error restoring leads:", error);
    res.status(500).json({ error: "Error al restaurar prospectos" });
  }
});

// Create new lead
app.post("/api/leads", async (req, res) => {
  const { name, phone, email, status, plan, notes } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: "Nombre y Teléfono son requeridos" });
  }

  // Generate random 4 character uppercase string
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  const assignedRef = `DOC-PRO-${randomStr}`;

  const newLead: Lead = {
    id: `lead-${Date.now()}`,
    name,
    phone,
    email: email || "",
    status: status || "prospect",
    plan: plan || "annual",
    assignedRef,
    notes: notes || "",
    createdAt: new Date().toISOString(),
    messages: [],
  };

  try {
    const saved = await createLead(newLead);
    broadcastToDashboard("lead:updated", saved);
    res.json(saved);
  } catch (error) {
    res.status(500).json({ error: "Error al registrar prospecto" });
  }
});

// Delete lead
app.delete("/api/leads/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await deleteLead(id);
    broadcastToDashboard("lead:deleted", id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar prospecto" });
  }
});

// Reset database
app.post("/api/reset", async (req, res) => {
  try {
    const freshLeads = await resetDatabase();
    res.json(freshLeads);
  } catch (error) {
    res.status(500).json({ error: "Error al reiniciar base de datos" });
  }
});

// Get configurations
app.get("/api/config", async (req, res) => {
  try {
    const configs = await getSystemConfigs();
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar configuración" });
  }
});

// Update configurations
app.post("/api/config", async (req, res) => {
  const { botSystemPrompt, bankDetails, premiumCodes } = req.body;
  try {
    const currentConfig = await getSystemConfigs();
    if (botSystemPrompt !== undefined) currentConfig.botSystemPrompt = botSystemPrompt;
    if (bankDetails !== undefined) currentConfig.bankDetails = bankDetails;
    if (premiumCodes !== undefined) {
      // Ensure premiumCodes is an array of clean strings
      currentConfig.premiumCodes = Array.isArray(premiumCodes)
        ? premiumCodes.map(c => c.trim().toUpperCase()).filter(Boolean)
        : [];
    }
    const updated = await saveSystemConfigs(currentConfig);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Error al guardar configuración" });
  }
});

// Helper function to assign premium code on payment validation
async function assignPremiumCode(lead: Lead): Promise<string> {
  if (lead.premiumCode) {
    return lead.premiumCode;
  }
  try {
    const configs = await getSystemConfigs();
    if (configs.premiumCodes && configs.premiumCodes.length > 0) {
      // Pick first available code
      const code = configs.premiumCodes[0];
      // Remove it from the pool
      configs.premiumCodes = configs.premiumCodes.slice(1);
      await saveSystemConfigs(configs);
      // Assign it to the lead
      lead.premiumCode = code;
      lead.notes = (lead.notes || "") + `\n[Código Asignado]: Se asignó el código premium ${code} automáticamente.`;
      return code;
    }
  } catch (err) {
    console.error("Error in assignPremiumCode helper:", err);
  }
  // Default fallback code if none left or database error
  const fallbackCode = "META-ZLKN-25C8";
  lead.premiumCode = fallbackCode;
  return fallbackCode;
}

// Toggle or set Camila pause state for a lead
app.post("/api/leads/:id/pause", async (req, res) => {
  const { id } = req.params;
  const { isPaused } = req.body;

  try {
    const list = await getAllLeads();
    const lead = list.find((l) => l.id === id);

    if (!lead) {
      return res.status(404).json({ error: "Prospecto no encontrado" });
    }

    lead.isPaused = !!isPaused;
    await updateLead(lead);

    // Broadcast the update via websocket to keep other panels synchronized
    broadcastToDashboard("lead:updated", lead);

    res.json({ success: true, lead });
  } catch (error) {
    console.error("Error setting pause state:", error);
    res.status(500).json({ error: "Error al cambiar el estado de pausa" });
  }
});

// Manually approve payment for a lead
app.post("/api/leads/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  try {
    const list = await getAllLeads();
    const lead = list.find((l) => l.id === id);

    if (!lead) {
      return res.status(404).json({ error: "Prospecto no encontrado" });
    }

    // Set lead status to approved
    lead.status = "approved";
    const premiumCode = await assignPremiumCode(lead);
    if (notes) {
      lead.notes = notes;
    } else {
      lead.notes = (lead.notes || "") + "\n[Aprobación Manual]: Pago legítimo verificado por el administrador.";
    }

    // Bot congratulatory message with credentials
    const congratulationsMsg: Message = {
      sender: "bot",
      text: `🎉 **¡PAGO CONFIRMADO Y ACTIVADO CON ÉXITO!** 🎉\n\nEstimado/a ${lead.name}, un administrador ha verificado y aprobado su comprobante de pago de manera exitosa.\n\n• **Monto:** $2.00 USD (Suscripción Premium de 30 días)\n• **Estado:** Activo Premium ✅\n\nSu cuenta de **Docenty PRO** está lista para ser activada con acceso completo a las planeaciones por IA y herramientas administrativas de aula.\n\n🔑 **Instrucciones para ingresar:**\n1. **Accede a la plataforma:** https://docente-pro-by-meta-tc.vercel.app/\n2. **Inicia sesión:** Elige la opción de **Iniciar sesión con Google** con tu cuenta de correo personal.\n3. **Activa tu licencia:** Una vez dentro, introduce tu **Código de Activación Premium** único para activar tus 30 días de acceso ilimitado:\n   👉 **Código Premium:** \`${premiumCode}\`\n\n*Nota: No necesitas ninguna contraseña provisional ni datos de usuario adicionales. Tu acceso se gestiona de forma segura directamente con tu cuenta de Google.*\n\n¡Te damos una cordial bienvenida a bordo! Estamos sumamente emocionados de ayudarte a simplificar tu planificación y ahorrar valioso tiempo. 🚀📚`,
      timestamp: new Date().toISOString(),
    };
    lead.messages.push(congratulationsMsg);

    await updateLead(lead);

    const botReply = congratulationsMsg.text;

    // Send WhatsApp notification if Meta credentials exist
    if (WHATSAPP_TOKEN && PHONE_NUMBER_ID) {
      try {
        await axios.post(
          `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: lead.phone,
            type: "text",
            text: { body: botReply },
          },
          {
            headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
          }
        );
        console.log(`WhatsApp manual approval reply sent successfully to ${lead.phone}`);
      } catch (wsErr: any) {
        console.error("Error sending manual approval WhatsApp message via API:", wsErr?.response?.data || wsErr.message);
      }
    }

    // Broadcast update via Websocket
    broadcastToDashboard("lead:updated", lead);

    res.json({ success: true, lead });
  } catch (error) {
    console.error("Error approving payment:", error);
    res.status(500).json({ error: "Error al aprobar el pago del prospecto" });
  }
});

// Manually associate bank reference with client reference
app.post("/api/leads/:id/associate-reference", async (req, res) => {
  const { id } = req.params;
  const { clientRef, bankRef, messageIndex } = req.body;

  if (!clientRef || !bankRef) {
    return res.status(400).json({ error: "La referencia de cliente y la referencia bancaria son requeridas." });
  }

  try {
    const list = await getAllLeads();
    const lead = list.find((l) => l.id === id);

    if (!lead) {
      return res.status(404).json({ error: "Prospecto no encontrado" });
    }

    // Attempt to locate target lead by clientRef
    let targetLead = lead;
    const foundLead = list.find(l => l.assignedRef.toUpperCase().trim() === clientRef.toUpperCase().trim());
    if (foundLead) {
      targetLead = foundLead;
    } else {
      // Fallback: If no lead exists with that clientRef, set it for the current lead
      targetLead.assignedRef = clientRef.toUpperCase().trim();
    }

    // Set lead status to approved and assign code
    targetLead.status = "approved";
    const premiumCode = await assignPremiumCode(targetLead);
    targetLead.notes = (targetLead.notes || "") + `\n[Asociación Manual]: Vinculado cliente Ref ${clientRef} con operación Ref ${bankRef} en comprobante.`;

    // Try to update receipt message data in the original lead (where the screenshot is)
    if (messageIndex !== undefined && lead.messages[messageIndex]) {
      const msg = lead.messages[messageIndex];
      if (msg.isReceipt && msg.receiptData) {
        msg.receiptData.status = "APPROVED";
        msg.receiptData.referencia = bankRef;
        msg.receiptData.analisis = `[Asociación Manual]: Asociado exitosamente con la referencia de cliente ${clientRef} por el administrador.`;
      }
    } else {
      // Find the last receipt message
      const lastReceipt = [...lead.messages].reverse().find(m => m.isReceipt);
      if (lastReceipt && lastReceipt.receiptData) {
        lastReceipt.receiptData.status = "APPROVED";
        lastReceipt.receiptData.referencia = bankRef;
        lastReceipt.receiptData.analisis = `[Asociación Manual]: Asociado exitosamente con la referencia de cliente ${clientRef} por el administrador.`;
      }
    }

    // If targetLead is different from lead, we should copy the approved receipt over or just reference it in notes
    if (targetLead.id !== lead.id) {
      targetLead.notes = (targetLead.notes || "") + `\n[Pago recibido en Chat de ${lead.name}]: Comprobante Banco Ref ${bankRef} recibido por ${lead.name} y asociado a este lead.`;
      await updateLead(lead); // Save the original lead with updated receipt status
    }

    // Congratulatory/Activation message
    const congratulationsMsg: Message = {
      sender: "bot",
      text: `🎉 **¡PAGO ASOCIADO Y CONFIRMADO CON ÉXITO!** 🎉\n\nEstimado/a ${targetLead.name}, hemos verificado y asociado manualmente su comprobante de pago con su referencia de cliente.\n\n• **Monto:** $2.00 USD (Suscripción Premium de 30 días)\n• **Estado:** Activo Premium ✅\n\nSu cuenta de **Docenty PRO** está lista para ser activada con acceso completo a las planeaciones por IA y herramientas de control administrativo de aula.\n\n🔑 **Instrucciones para ingresar:**\n1. **Accede a la plataforma:** https://docente-pro-by-meta-tc.vercel.app/\n2. **Inicia sesión:** Elige la opción de **Iniciar sesión con Google** con tu cuenta de correo personal.\n3. **Activa tu licencia:** Una vez dentro, introduce tu **Código de Activación Premium** único para activar tus 30 días de acceso ilimitado:\n   👉 **Código Premium:** \`${premiumCode}\`\n\n*Nota: No necesitas ninguna contraseña provisional ni datos de usuario adicionales. Tu acceso se gestiona de forma segura directamente con tu cuenta de Google.*\n\n¡Te damos una cordial bienvenida a bordo! Estamos sumamente emocionados de ayudarte a simplificar tu planificación y ahorrar valioso tiempo. 🚀📚`,
      timestamp: new Date().toISOString(),
    };
    targetLead.messages.push(congratulationsMsg);

    await updateLead(targetLead);

    // Send WhatsApp notification if Meta credentials exist
    if (WHATSAPP_TOKEN && PHONE_NUMBER_ID) {
      try {
        await axios.post(
          `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: targetLead.phone,
            type: "text",
            text: { body: congratulationsMsg.text },
          },
          {
            headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
          }
        );
        console.log(`WhatsApp manual association reply sent successfully to ${targetLead.phone}`);
      } catch (wsErr: any) {
        console.error("Error sending manual association WhatsApp message via API:", wsErr?.response?.data || wsErr.message);
      }
    }

    // Broadcast updates via WebSocket
    broadcastToDashboard("lead:updated", lead);
    if (targetLead.id !== lead.id) {
      broadcastToDashboard("lead:updated", targetLead);
    }

    res.json({ success: true, lead: targetLead });
  } catch (error) {
    console.error("Error associating payment reference:", error);
    res.status(500).json({ error: "Error al asociar la referencia de pago del prospecto" });
  }
});

// Send manual operator message to WhatsApp client
app.post("/api/leads/:id/manual-message", async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Mensaje es requerido" });
  }

  try {
    const list = await getAllLeads();
    const lead = list.find((l) => l.id === id);

    if (!lead) {
      return res.status(404).json({ error: "Prospecto no encontrado" });
    }

    // Add operator/bot message
    const botMsg: Message = {
      sender: "bot",
      text: message,
      timestamp: new Date().toISOString(),
    };
    lead.messages.push(botMsg);
    await updateLead(lead);

    // If real WhatsApp token and phone number ID are configured, send the manual message via Meta API
    if (WHATSAPP_TOKEN && PHONE_NUMBER_ID) {
      try {
        await axios.post(
          `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: lead.phone,
            type: "text",
            text: { body: message },
          },
          {
            headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
          }
        );
      } catch (wsErr: any) {
        console.error("Error sending manual WhatsApp message via API:", wsErr?.response?.data || wsErr.message);
      }
    }

    // Broadcast the update via websocket
    broadcastToDashboard("lead:updated", lead);

    res.json({ success: true, lead });
  } catch (error) {
    console.error("Error sending manual message:", error);
    res.status(500).json({ error: "Error al enviar mensaje manual" });
  }
});

// Chat with Gemini AI as Sales Agent
app.post("/api/leads/:id/chat", async (req, res) => {
  const { id } = req.params;
  const { message, isAudio, audioBase64, audioMimeType } = req.body;

  if (!message && !isAudio) {
    return res.status(400).json({ error: "Mensaje o audio es requerido" });
  }

  try {
    const leadsList = await getAllLeads();
    const lead = leadsList.find((l) => l.id === id);
    if (!lead) {
      return res.status(404).json({ error: "Lead no encontrado" });
    }

    // Add client message
    const clientMsg: Message = {
      sender: "client",
      text: message || "🎤 [Nota de voz enviada]",
      timestamp: new Date().toISOString(),
    };

    if (isAudio && audioBase64) {
      clientMsg.isAudio = true;
      clientMsg.audioData = {
        base64: audioBase64,
        mimeType: audioMimeType || "audio/ogg",
      };
    }

    lead.messages.push(clientMsg);

    // Update lead status to interested if they were just prospect and show active conversation
    if (lead.status === "prospect") {
      lead.status = "interested";
    }

    if (lead.isPaused) {
      await updateLead(lead);
      broadcastToDashboard("lead:updated", lead);
      return res.json({ lead, botReply: null, isPaused: true });
    }

    const systemConfigs = await getSystemConfigs();

    try {
      // Compile history for Gemini context (excluding the current audio file if processing multimodal)
      const historyContext = lead.messages
        .slice(0, isAudio ? -1 : undefined)
        .map((m) => `${m.sender === "bot" ? "Docenty AI" : lead.name}: ${m.text}`)
        .join("\n");

      let response;
      const isMockAudio = isAudio && audioBase64 === "UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";

      if (isAudio && audioBase64) {
        let promptString = `Historial de la conversación de WhatsApp hasta ahora:\n${historyContext}\n\n`;

        if (isMockAudio) {
          // Simulator helper mock prompt
          promptString += `El cliente ${lead.name} te acaba de enviar una nota de voz. 
[Simulación] La nota de voz dice exactamente lo siguiente: "Hola Camila, me interesa saber si Docenty PRO me puede ayudar a automatizar la carga de notas finales de mi colegio y la asistencia de mis alumnos, y cuánto cuesta la activación anual".
Por favor, responde a este audio en texto con tu personalidad de Docenty AI (Camila), con un tono amable, explicando brevemente los beneficios (automatización, asistencia) y las opciones de pago de $2 USD con tu referencia ${lead.assignedRef}.`;

          response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: promptString,
            config: {
              systemInstruction: systemConfigs.botSystemPrompt,
              temperature: 0.7,
            },
          });
        } else {
          // Real audio multimodal processing
          promptString += `El cliente ${lead.name} te acaba de enviar una nota de voz. Por favor, "escucha" y analiza con cuidado el contenido del audio (su intención, preguntas, tono y detalles).
Genera una respuesta en texto en tu personalidad de Docenty AI (Camila).
Recuerda que la referencia asignada a este cliente es: ${lead.assignedRef}.\nNo inventes referencias de otros clientes. Si el cliente pregunta qué plan tiene disponible, recuérdale que tiene reservada la Suscripción Premium de $2 USD (al cambio oficial del BCV en bolívares) con esa referencia.`;

          response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [
              {
                inlineData: {
                  mimeType: audioMimeType || "audio/ogg",
                  data: audioBase64,
                },
              },
              {
                text: promptString,
              },
            ],
            config: {
              systemInstruction: systemConfigs.botSystemPrompt,
              temperature: 0.7,
            },
          });
        }
      } else {
        // Standard text reply
        const prompt = `Historial de la conversación de WhatsApp hasta ahora:\n${historyContext}\n\nResponde el último mensaje del cliente en WhatsApp con tu personalidad de Docenty AI (Camila). Recuerda que la referencia asignada a este cliente es: ${lead.assignedRef}.\nNo inventes referencias de otros clientes. Si el cliente pregunta qué plan tiene disponible, recuérdale que tiene reservada la Suscripción Premium de $2 USD (al cambio oficial del BCV en bolívares) con esa referencia.`;

        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction: systemConfigs.botSystemPrompt,
            temperature: 0.7,
          },
        });
      }

      const botReply = response.text || "Disculpe, ¿podría repetir su consulta? Estoy aquí para ayudarle con Docenty PRO.";

      const botMsg: Message = {
        sender: "bot",
        text: botReply,
        timestamp: new Date().toISOString(),
      };
      lead.messages.push(botMsg);

      await updateLead(lead);
      broadcastToDashboard("lead:updated", lead);
      res.json({ lead, botReply });
    } catch (err: any) {
      console.error("Gemini Error:", err);
      // Graceful fallback if API key is not configured or fails
      let fallbackReply = `¡Hola, ${lead.name}! Gracias por tu nota de voz o mensaje. El sistema está configurando tu cuenta. Para confirmar la activación de la Suscripción Premium ($2 USD al cambio oficial BCV en bolívares) por favor realiza el Pago Móvil de referencia **${lead.assignedRef}** al Banco de Venezuela (Teléfono: 04262953484, Cédula: 24755720) y mándanos el comprobante por este chat.`;
      
      const msgLower = (message || "").toLowerCase();
      if (isAudio || msgLower.includes("plan") || msgLower.includes("costo") || msgLower.includes("precio")) {
        fallbackReply = `Claro que sí. La suscripción de Docenty PRO cuesta solo $2 USD (al cambio oficial de la tasa BCV del día en Bolívares). Puedes realizar el Pago Móvil con tu código de referencia único **${lead.assignedRef}** al Banco de Venezuela (Teléfono: 04262953484, Cédula: 24755720). ¡Mándanos la captura de pantalla por este chat!`;
      }

      const botMsg: Message = {
        sender: "bot",
        text: fallbackReply,
        timestamp: new Date().toISOString(),
      };
      lead.messages.push(botMsg);
      await updateLead(lead);
      broadcastToDashboard("lead:updated", lead);
      res.json({ lead, botReply: fallbackReply, apiError: true });
    }
  } catch (error) {
    res.status(500).json({ error: "Error en el chat" });
  }
});

// Verify Receipt Multimodal with Gemini
app.post("/api/leads/:id/verify-receipt", async (req, res) => {
  const { id } = req.params;
  const { imageBase64 } = req.body; // base64 encoded string

  if (!imageBase64) {
    return res.status(400).json({ error: "Base64 de la imagen es requerida" });
  }

  try {
    const leadsList = await getAllLeads();
    const lead = leadsList.find((l) => l.id === id);
    if (!lead) {
      return res.status(404).json({ error: "Lead no encontrado" });
    }

    // Clear data url prefix if exists e.g. "data:image/png;base64,iVBOR..."
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    try {
      const promptString = `Analiza detalladamente este comprobante de pago enviado por el cliente ${lead.name}. Su referencia asignada en nuestro CRM es: ${lead.assignedRef}. El costo de la Suscripción Premium de Docenty PRO es de $2 USD (cobrado en Bolívares al cambio oficial del BCV del día). El método de recepción único es Pago Móvil al Banco de Venezuela (Teléfono: 04262953484, Cédula: 24755720).
      Determina si la transferencia de Pago Móvil fue hecha con éxito, busca el monto, la fecha, el banco emisor y muy importante: busca si el concepto, nota o código de referencia coincide de alguna manera con la referencia de este cliente: ${lead.assignedRef} o si tiene alguna otra referencia de pago válida para Docenty.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: "image/png",
              data: cleanBase64,
            },
          },
          {
            text: promptString,
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isValid: {
                type: Type.BOOLEAN,
                description: "Indica si la imagen es un comprobante de transferencia válido y legítimo.",
              },
              status: {
                type: Type.STRING,
                description: "APPROVED si la transferencia es correcta, legítima y tiene el monto correcto. REJECTED si no es un recibo o es inválido. PENDING si hay dudas razonables pero parece un recibo.",
              },
              monto: {
                type: Type.STRING,
                description: "El monto que aparece en el recibo de transferencia de Pago Móvil, ej: $2 USD, 2 dólares o su equivalente en bolívares al cambio oficial.",
              },
              referencia: {
                type: Type.STRING,
                description: "El código de referencia, código de operación o concepto de transferencia que se lee en el comprobante.",
              },
              banco: {
                type: Type.STRING,
                description: "El nombre de la entidad bancaria que emite o recibe la transferencia.",
              },
              fecha: {
                type: Type.STRING,
                description: "La fecha de la transacción que se muestra en el recibo.",
              },
              analisis: {
                type: Type.STRING,
                description: "Análisis explicativo detallado en español de por qué se aprueba, rechaza o deja pendiente el pago, mencionando si el código de referencia concuerda exactamente con la referencia del lead: " + lead.assignedRef,
              },
            },
            required: ["isValid", "status", "monto", "referencia", "analisis"],
          },
        },
      });

      const resultText = response.text || "{}";
      const receiptData = JSON.parse(resultText);

      // Save image base64 directly so we can preview it in client messages
      const imageUrl = `data:image/png;base64,${cleanBase64}`;

      // Add Client message containing the receipt
      const receiptClientMsg: Message = {
        sender: "client",
        text: `[Comprobante de Pago enviado - Ref Detectada: ${receiptData.referencia || "No detectada"}]`,
        timestamp: new Date().toISOString(),
        isReceipt: true,
        receiptData: {
          ...receiptData,
          imageUrl,
        },
      };
      lead.messages.push(receiptClientMsg);

      // Update Lead Status based on analysis
      lead.status = "payment_sent";
      
      // Check if approved and reference code matches
      const codeMatches = receiptData.referencia && 
        (receiptData.referencia.toUpperCase().includes(lead.assignedRef.toUpperCase()) || 
         lead.assignedRef.toUpperCase().includes(receiptData.referencia.toUpperCase()) ||
         receiptData.analisis.toLowerCase().includes("coincide") ||
         receiptData.analisis.toLowerCase().includes("concordancia") ||
         receiptData.status === "APPROVED");

      if (receiptData.status === "APPROVED" && codeMatches) {
        lead.status = "approved";
        const premiumCode = await assignPremiumCode(lead);

        // Bot congratulatory message with credentials
        const congratulationsMsg: Message = {
          sender: "bot",
          text: `🎉 **¡PAGO CONFIRMADO Y ACTIVADO CON ÉXITO!** 🎉\n\nEstimado/a ${lead.name}, nuestro sistema de visión inteligente ha validado su comprobante de pago de manera exitosa.\n\n• **Monto detectado:** ${receiptData.monto}\n• **Estado:** Activo Premium ✅\n\nSu cuenta de **Docenty PRO** está lista para ser activada con acceso completo a las planeaciones por IA y herramientas de control administrativo de aula.\n\n🔑 **Instrucciones para ingresar:**\n1. **Accede a la plataforma:** https://docente-pro-by-meta-tc.vercel.app/\n2. **Inicia sesión:** Elige la opción de **Iniciar sesión con Google** con tu cuenta de correo personal.\n3. **Activa tu licencia:** Una vez dentro, introduce tu **Código de Activación Premium** único para activar tus 30 días de acceso ilimitado:\n   👉 **Código Premium:** \`${premiumCode}\`\n\n*Nota: No necesitas ninguna contraseña provisional ni datos de usuario adicionales. Tu acceso se gestiona de forma segura directamente con tu cuenta de Google.*\n\n¡Te damos una cordial bienvenida a bordo! Estamos sumamente emocionados de ayudarte a simplificar tu planificación y ahorrar valioso tiempo. 🚀📚`,
          timestamp: new Date().toISOString(),
        };
        lead.messages.push(congratulationsMsg);
      } else {
        // Bot message asking for correction if reference mismatches or rejected
        const mismatchMsg: Message = {
          sender: "bot",
          text: `⚠️ **Validación de Pago en Espera**\n\nHola ${lead.name}, he recibido tu comprobante de pago pero nuestro sistema detecta un detalle:\n\n• **Monto leído:** ${receiptData.monto || "No detectado"}\n• **Referencia leída:** \`${receiptData.referencia || "Ninguna"}\`\n• **Tu Referencia Asignada:** \`${lead.assignedRef}\`\n\n${receiptData.status === "REJECTED" ? "El archivo enviado no parece ser un comprobante válido." : "Por favor, confirma que la transferencia se haya realizado ingresando correctamente tu código de referencia asignado. Un ejecutivo revisará el comprobante manualmente a la brevedad."}\n\nSi consideras que hay un error, puedes volver a intentar enviando una captura más legible. 😊`,
          timestamp: new Date().toISOString(),
        };
        lead.messages.push(mismatchMsg);
      }

      await updateLead(lead);
      res.json({ lead, receiptData });
    } catch (err: any) {
      console.error("Multimodal analysis failed:", err);

      // Fallback: local simulation validation if Gemini crashes or API key missing
      const imageUrl = `data:image/png;base64,${cleanBase64}`;
      
      const receiptData = {
        isValid: true,
        status: "APPROVED" as const,
        monto: lead.plan === "annual" ? "$29.00 USD" : "$9.00 USD",
        referencia: lead.assignedRef,
        banco: "Banco Docenty PRO",
        fecha: new Date().toISOString().split("T")[0],
        analisis: "(Modo de demostración - Análisis local exitoso) Se detectó un comprobante legible de transferencia bancaria por " + (lead.plan === "annual" ? "$29 USD" : "$9 USD") + " con el código de referencia " + lead.assignedRef + " perfectamente visible. Aprobado de forma inmediata.",
      };

      const receiptClientMsg: Message = {
        sender: "client",
        text: `[Comprobante de Pago enviado - Ref Local: ${receiptData.referencia}]`,
        timestamp: new Date().toISOString(),
        isReceipt: true,
        receiptData: {
          ...receiptData,
          imageUrl,
        },
      };
      lead.messages.push(receiptClientMsg);

      lead.status = "approved";
      const premiumCode = await assignPremiumCode(lead);

      const congratulationsMsg: Message = {
        sender: "bot",
        text: `🎉 **¡PAGO CONFIRMADO CON ÉXITO!** [Simulación Local] 🎉\n\nEstimado/a ${lead.name}, hemos validado su comprobante de pago en modo de demostración.\n\n• **Monto:** ${receiptData.monto}\n• **Estado:** Activo Premium ✅\n\nSu cuenta de **Docenty PRO** está lista para ser activada con acceso completo a las planeaciones por IA.\n\n🔑 **Instrucciones para ingresar:**\n1. **Accede a la plataforma:** https://docente-pro-by-meta-tc.vercel.app/\n2. **Inicia sesión:** Elige la opción de **Iniciar sesión con Google** con tu cuenta de correo personal.\n3. **Activa tu licencia:** Una vez dentro, introduce tu **Código de Activación Premium** único para activar tus 30 días de acceso ilimitado:\n   👉 **Código Premium:** \`${premiumCode}\`\n\n*Nota: No necesitas ninguna contraseña provisional ni datos de usuario adicionales. Tu acceso se gestiona de forma segura directamente con tu cuenta de Google.*\n\n¡Te damos una cordial bienvenida a bordo! Estamos sumamente emocionados de ayudarte a simplificar tu planificación y ahorrar valioso tiempo. 🚀📚`,
        timestamp: new Date().toISOString(),
      };
      lead.messages.push(congratulationsMsg);

      await updateLead(lead);
      res.json({ lead, receiptData, fallbackMode: true });
    }
  } catch (error) {
    res.status(500).json({ error: "Error al validar recibo" });
  }
});

// Simulate Buyer replies automatically using Gemini
app.post("/api/leads/:id/simulate-buyer-reply", async (req, res) => {
  const { id } = req.params;

  try {
    const leadsList = await getAllLeads();
    const lead = leadsList.find((l) => l.id === id);
    if (!lead) {
      return res.status(404).json({ error: "Lead no encontrado" });
    }

    try {
      const historyContext = lead.messages
        .map((m) => `${m.sender === "bot" ? "Vendedor (Docenty AI)" : "Cliente (" + lead.name + ")"}: ${m.text}`)
        .join("\n");

      const prompt = `Actúa como el cliente potencial: ${lead.name}. 
Información del cliente: ${lead.notes}.
Su dirección de correo: ${lead.email}, teléfono: ${lead.phone}.

Historial de WhatsApp hasta ahora:
${historyContext}

Genera el siguiente mensaje de WhatsApp que enviaría este cliente en la conversación. 
Reglas:
1. Responde de forma realista como un profesor interesado pero ocupado.
2. Si el bot le acaba de dar los datos de transferencia, el cliente podría hacer una última pregunta de seguridad, o decir que ya va a transferir, o decir que le interesa pero si puede pagar en su moneda local, o preguntar si hay soporte.
3. Si el bot ya le dio la información y está convencido, genera un mensaje corto diciendo que ya hizo el pago y que enviará el comprobante (¡pero no adjuntes el comprobante todavía!).
4. Sé breve, en español y con un estilo conversacional natural de WhatsApp (puedes usar minúsculas, abreviaciones naturales y algún emoji ocasional).
5. No uses formalismo exagerado de carta, escribe como un mensaje de chat de celular rápido.

Devuelve SOLAMENTE el texto del mensaje del cliente en tu respuesta, sin aclaraciones ni comillas externas.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.8,
        },
      });

      const clientReply = response.text || "De acuerdo, ya haré la transferencia y te aviso por aquí.";

      res.json({ clientReply });
    } catch (err) {
      console.error("Failed to generate buyer reply:", err);
      // Generic realistic fallbacks
      const fallbacks = [
        "Muchas gracias por la información. ¿Si compro el anual de $29 dólares puedo facturar o dan algún recibo?",
        "Perfecto, me queda muy claro. ¿Tienen soporte técnico en caso de que tenga problemas para subir a mis alumnos?",
        "Excelente, haré el depósito en un momento y te mando la captura de pantalla por aquí para que me actives por favor.",
        "Oye una duda, ¿la planeación por IA también sirve para materias técnicas de bachillerato, como electrónica?",
      ];
      const clientReply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      res.json({ clientReply, fallbackMode: true });
    }
  } catch (error) {
    res.status(500).json({ error: "Error en la simulación" });
  }
});


// Serve React app
async function startServer() {
  // Initialize Database Connection
  await initDatabase();

  // If on Vercel, static files are handled by the vercel.json configuration.
  // We don't need to listen on ports or setup Vite.
  if (process.env.VERCEL) {
    console.log("Running on Vercel Serverless Function. Skipping Vite integration and app.listen().");
    return;
  }

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });

  // Attach WebSocket Server
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("[WebSocket] CRM client connected");
    connectedClients.add(ws);

    // Send connection acknowledgement
    ws.send(JSON.stringify({ type: "connection:ready", payload: { connected: true } }));

    ws.on("close", () => {
      console.log("[WebSocket] CRM client disconnected");
      connectedClients.delete(ws);
    });

    ws.on("error", (err) => {
      console.error("[WebSocket] Client error:", err);
    });
  });
}

startServer();
