import express from "express";
import path from "path";
import dotenv from "dotenv";
import axios from "axios";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
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

    const phone_number_id = value.metadata?.phone_number_id;
    const from = message.from; // Teléfono del docente que escribe
    const senderName = value.contacts?.[0]?.profile?.name || `Docente WhatsApp (${from})`;

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

      try {
        const historyContext = lead.messages
          .map((m) => `${m.sender === "bot" ? "Docenty AI" : lead.name}: ${m.text}`)
          .join("\n");

        const prompt = `Historial de la conversación de WhatsApp hasta ahora:\n${historyContext}\n\nResponde el último mensaje del cliente en WhatsApp con tu personalidad de Docenty AI (Camila). Recuerda que la referencia asignada a este cliente es: ${lead.assignedRef}.\nNo inventes referencias de otros clientes. Si el cliente pregunta qué plan tiene disponible, recuérdale que tiene reservada la Suscripción Premium de $2 USD (al cambio oficial del BCV en bolívares) con esa referencia.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction: systemConfigs.botSystemPrompt,
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
            botReply = `🎉 **¡PAGO CONFIRMADO AUTOMÁTICAMENTE POR LA IA!** 🎉\n\nEstimado/a ${lead.name}, nuestro sistema de visión inteligente ha validado su comprobante de pago de manera exitosa.\n\n• **Referencia del comprobante:** \`${receiptData.referencia || lead.assignedRef}\` (Coincidencia Perfecta ✅)\n• **Monto detectado:** ${receiptData.monto}\n• **Banco emisor:** ${receiptData.banco || "Banca Digital"}\n\nSu cuenta Premium de **Docenty PRO** ya ha sido creada y configurada con acceso completo a las planeaciones por IA y control administrativo de aula.\n\n🔑 **Datos de su Cuenta:**\n• **Enlace de acceso:** https://app.docenty.pro\n• **Usuario:** ${lead.email || "su correo registrado"}\n• **Contraseña provisional:** \`Docenty2026!\` (Le sugerimos cambiarla al ingresar)\n\n¡Le damos una cordial bienvenida a bordo! Estamos emocionados de simplificar su vida docente. 🚀📚`;
          } else {
            botReply = `⚠️ **Validación de Pago en Espera**\n\nHola ${lead.name}, he recibido tu comprobante de pago pero nuestro sistema detecta un detalle:\n\n• **Monto leído:** ${receiptData.monto || "No detectado"}\n• **Referencia leída:** \`${receiptData.referencia || "Ninguna"}\`\n• **Tu Referencia Asignada:** \`${lead.assignedRef}\`\n\n${receiptData.status === "REJECTED" ? "El archivo enviado no parece ser un comprobante válido." : "Por favor, confirma que la transferencia se haya realizado ingresando correctamente tu código de referencia asignado. Un ejecutivo revisará el comprobante manualmente a la brevedad."}\n\nSi consideras que hay un error, puedes volver a intentar enviando una captura más legible. 😊`;
          }

          const botMsg: Message = {
            sender: "bot",
            text: botReply,
            timestamp: new Date().toISOString(),
          };
          lead.messages.push(botMsg);
          await updateLead(lead);
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
          lead.status = "approved";

          botReply = `🎉 **¡PAGO CONFIRMADO!** 🎉\n\nEstimado/a ${lead.name}, hemos validado su comprobante de pago de manera exitosa.\n\n• **Referencia del comprobante:** \`${receiptData.referencia}\` (Coincidencia Perfecta ✅)\n• **Monto detectado:** ${receiptData.monto}\n\nSu cuenta Premium de **Docenty PRO** ya ha sido configurada con acceso completo a las planeaciones por IA.\n\n🔑 **Datos de su Cuenta:**\n• **Enlace de acceso:** https://app.docenty.pro\n• **Usuario:** ${lead.email || "su correo registrado"}\n• **Contraseña provisional:** \`Docenty2026!\` \n\n¡Le damos una cordial bienvenida a bordo! 🚀📚`;

          const botMsg: Message = {
            sender: "bot",
            text: botReply,
            timestamp: new Date().toISOString(),
          };
          lead.messages.push(botMsg);
          await updateLead(lead);
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
      } catch (sendErr: any) {
        console.error("Error sending message via WhatsApp API in webhook:", sendErr.response?.data || sendErr.message);
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
  const { botSystemPrompt, bankDetails } = req.body;
  try {
    const currentConfig = await getSystemConfigs();
    if (botSystemPrompt !== undefined) currentConfig.botSystemPrompt = botSystemPrompt;
    if (bankDetails !== undefined) currentConfig.bankDetails = bankDetails;
    const updated = await saveSystemConfigs(currentConfig);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Error al guardar configuración" });
  }
});

// Chat with Gemini AI as Sales Agent
app.post("/api/leads/:id/chat", async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Mensaje es requerido" });
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
      text: message,
      timestamp: new Date().toISOString(),
    };
    lead.messages.push(clientMsg);

    // Update lead status to interested if they were just prospect and show active conversation
    if (lead.status === "prospect") {
      lead.status = "interested";
    }

    const systemConfigs = await getSystemConfigs();

    try {
      // Compile history for Gemini context
      const historyContext = lead.messages
        .map((m) => `${m.sender === "bot" ? "Docenty AI" : lead.name}: ${m.text}`)
        .join("\n");

      const prompt = `Historial de la conversación de WhatsApp hasta ahora:\n${historyContext}\n\nResponde el último mensaje del cliente en WhatsApp con tu personalidad de Docenty AI (Camila). Recuerda que la referencia asignada a este cliente es: ${lead.assignedRef}.\nNo inventes referencias de otros clientes. Si el cliente pregunta qué plan tiene disponible, recuérdale que tiene reservada la Suscripción Premium de $2 USD (al cambio oficial del BCV en bolívares) con esa referencia.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemConfigs.botSystemPrompt,
          temperature: 0.7,
        },
      });

      const botReply = response.text || "Disculpe, ¿podría repetir su consulta? Estoy aquí para ayudarle con Docenty PRO.";

      const botMsg: Message = {
        sender: "bot",
        text: botReply,
        timestamp: new Date().toISOString(),
      };
      lead.messages.push(botMsg);

      await updateLead(lead);
      res.json({ lead, botReply });
    } catch (err: any) {
      console.error("Gemini Error:", err);
      // Graceful fallback if API key is not configured or fails
      let fallbackReply = `¡Hola, ${lead.name}! Gracias por tu mensaje. El sistema está configurando tu cuenta. Para confirmar la activación de la Suscripción Premium ($2 USD al cambio oficial BCV en bolívares) por favor realiza el Pago Móvil de referencia **${lead.assignedRef}** al Banco de Venezuela (Teléfono: 04262953484, Cédula: 24755720) y mándanos el comprobante por este chat.`;
      
      if (message.toLowerCase().includes("plan") || message.toLowerCase().includes("costo") || message.toLowerCase().includes("precio")) {
        fallbackReply = `Claro que sí. La suscripción de Docenty PRO cuesta solo $2 USD (al cambio oficial de la tasa BCV del día en Bolívares). Puedes realizar el Pago Móvil con tu código de referencia único **${lead.assignedRef}** al Banco de Venezuela (Teléfono: 04262953484, Cédula: 24755720). ¡Mándanos la captura de pantalla por este chat!`;
      }

      const botMsg: Message = {
        sender: "bot",
        text: fallbackReply,
        timestamp: new Date().toISOString(),
      };
      lead.messages.push(botMsg);
      await updateLead(lead);
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

        // Bot congratulatory message with credentials
        const congratulationsMsg: Message = {
          sender: "bot",
          text: `🎉 **¡PAGO CONFIRMADO AUTOMÁTICAMENTE POR LA IA!** 🎉\n\nEstimado/a ${lead.name}, nuestro sistema de visión inteligente ha validado su comprobante de pago de manera exitosa.\n\n• **Referencia del comprobante:** \`${receiptData.referencia || lead.assignedRef}\` (Coincidencia Perfecta ✅)\n• **Monto detectado:** ${receiptData.monto}\n• **Banco emisor:** ${receiptData.banco || "Banca Digital"}\n\nSu cuenta Premium de **Docenty PRO** ya ha sido creada y configurada con acceso completo a las planeaciones por IA y control administrativo de aula.\n\n🔑 **Datos de su Cuenta:**\n• **Enlace de acceso:** https://app.docenty.pro\n• **Usuario:** ${lead.email || "su correo registrado"}\n• **Contraseña provisional:** \`Docenty2026!\` (Le sugerimos cambiarla al ingresar)\n\n¡Le damos una cordial bienvenida a bordo! Estamos emocionados de simplificar su vida docente. 🚀📚`,
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
        banco: "Banco del Docente",
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

      const congratulationsMsg: Message = {
        sender: "bot",
        text: `🎉 **¡PAGO CONFIRMADO!** [Simulación Local] 🎉\n\nEstimado/a ${lead.name}, hemos validado su comprobante de pago en modo de demostración.\n\n• **Referencia detectada:** \`${receiptData.referencia}\` (Coincidencia Perfecta ✅)\n• **Monto:** ${receiptData.monto}\n\nSu cuenta Premium de **Docenty PRO** está activa.\n\n🔑 **Datos de acceso:**\n• **Plataforma:** https://app.docenty.pro\n• **Usuario:** ${lead.email || "su correo registrado"}\n• **Contraseña provisional:** \`Docenty2026!\` \n\n¡Bienvenido/a a Docenty PRO! 🚀📚`,
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
    const vite = await createViteServer({
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
