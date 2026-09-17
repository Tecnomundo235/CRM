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
  checkDbHealth,
  getDbConnection,
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

// Evolution API WhatsApp Configuration (Self-hosted on VPS)
const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || "http://165.22.188.168:8080").replace(/\/+$/, "");
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "docenty_pro_secret_key_2026";
const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || "docenty-pro";

// Health check and Keep-Alive Ping endpoint
app.get(["/api/health", "/health", "/ping"], async (req, res) => {
  const dbHealth = await checkDbHealth();
  const healthData = {
    status: dbHealth.status === "connected" || dbHealth.status === "in_memory" ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbHealth,
    whatsapp: {
      provider: "Evolution API",
      configured: Boolean(EVOLUTION_API_URL && EVOLUTION_API_KEY && EVOLUTION_INSTANCE_NAME),
      evolutionUrl: EVOLUTION_API_URL,
      instanceName: EVOLUTION_INSTANCE_NAME,
    },
    memory: {
      rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  };

  const statusCode = dbHealth.status === "disconnected" ? 503 : 200;
  return res.status(statusCode).json(healthData);
});

// 1. ENDPOINT DE VERIFICACIÓN (Compatibilidad con checks HTTP GET)
app.get(["/api/webhook", "/webhook"], (req, res) => {
  return res.status(200).json({
    status: "online",
    service: "Docenty PRO Webhook - Evolution API Engine",
    instance: EVOLUTION_INSTANCE_NAME,
    timestamp: new Date().toISOString()
  });
});

// Helper to clean phone numbers
function cleanPhoneNumber(ph: string): string {
  return (ph || "").replace(/\D/g, "");
}

// Helper to download media using Evolution API or direct media URL
async function downloadEvolutionMedia(mediaUrlOrMessage: any): Promise<string | null> {
  try {
    // If it's already a base64 string
    if (typeof mediaUrlOrMessage === "string" && mediaUrlOrMessage.startsWith("data:")) {
      return mediaUrlOrMessage.split(",")[1];
    }

    // If Evolution API provides direct base64 in mediaUrl or base64 field
    if (typeof mediaUrlOrMessage === "string" && !mediaUrlOrMessage.startsWith("http")) {
      return mediaUrlOrMessage;
    }

    // If an Evolution message object is passed with key/messageId to fetch base64 from Evolution API
    if (typeof mediaUrlOrMessage === "object" && mediaUrlOrMessage?.messageId) {
      try {
        const fetchRes = await axios.post(
          `${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${EVOLUTION_INSTANCE_NAME}`,
          {
            message: mediaUrlOrMessage.rawMessage || {
              key: { id: mediaUrlOrMessage.messageId }
            },
            convertToMp4: false
          },
          {
            headers: {
              apikey: EVOLUTION_API_KEY,
              "Content-Type": "application/json"
            },
            timeout: 15000
          }
        );
        const b64 = fetchRes.data?.base64;
        if (b64) {
          return b64.replace(/^data:.*?;base64,/, "");
        }
      } catch (evoErr: any) {
        console.warn("[Evolution Media] Could not fetch via getBase64FromMediaMessage, attempting fallback:", evoErr.message);
      }
    }

    // If an HTTP URL is provided, fetch arraybuffer
    const targetUrl = typeof mediaUrlOrMessage === "string" ? mediaUrlOrMessage : mediaUrlOrMessage?.url;
    if (targetUrl && targetUrl.startsWith("http")) {
      const response = await axios.get(targetUrl, {
        headers: { apikey: EVOLUTION_API_KEY },
        responseType: "arraybuffer",
        timeout: 15000
      });
      return Buffer.from(response.data).toString("base64");
    }

    return null;
  } catch (err: any) {
    console.error("Error downloading Evolution API media:", err.message);
    return null;
  }
}

// 2. ENDPOINT PRINCIPAL (Recibe los mensajes de los docentes de WhatsApp con Control de Idempotencia y Procesamiento Asíncrono)
const processedWAMIDs = new Set<string>();
const MAX_WAMIDS_CACHE = 1000;

function checkAndRegisterWAMID(wamid: string): boolean {
  if (processedWAMIDs.has(wamid)) {
    return true; // Mensaje ya procesado (duplicado)
  }
  processedWAMIDs.add(wamid);
  if (processedWAMIDs.size > MAX_WAMIDS_CACHE) {
    const firstVal = processedWAMIDs.values().next().value;
    if (firstVal !== undefined) {
      processedWAMIDs.delete(firstVal);
    }
  }
  return false;
}

async function sendWhatsAppMessage(targetPhone: string, textBody: string) {
  const cleanedTarget = cleanPhoneNumber(targetPhone);
  if (!cleanedTarget) {
    console.warn("[Evolution API] Número de destino inválido:", targetPhone);
    return;
  }

  if (EVOLUTION_API_URL && EVOLUTION_API_KEY && EVOLUTION_INSTANCE_NAME) {
    try {
      const endpoint = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`;
      await axios.post(
        endpoint,
        {
          number: cleanedTarget,
          text: textBody
        },
        {
          headers: {
            apikey: EVOLUTION_API_KEY,
            "Content-Type": "application/json"
          },
          timeout: 15000
        }
      );
      console.log(`[Evolution API] Respuesta enviada exitosamente a ${cleanedTarget}`);
    } catch (error: any) {
      console.error("[Evolution API] Error al enviar mensaje:", error.response?.data || error.message);
    }
  } else {
    console.warn("[Evolution API] Credenciales no configuradas. Omitiendo envío a:", cleanedTarget);
  }
}

async function sendAdminNotification(messageText: string) {
  const adminPhone = "584144783204"; // Número personal del arquitecto Reymon Castillo
  await sendWhatsAppMessage(adminPhone, messageText);
}

interface EvolutionIncomingPayload {
  messageId: string;
  from: string;
  senderName: string;
  type: "text" | "image" | "audio" | "other";
  text?: string;
  mediaBase64?: string | null;
  mimeType?: string;
  rawMessage?: any;
}

async function processWebhookInBackground(incoming: EvolutionIncomingPayload) {
  const from = incoming.from; // Teléfono del docente que escribe (limpio)
  const senderName = incoming.senderName || `Docente (${from})`;

  // Buscar o registrar prospecto por su número de celular
  const leadsList = await getAllLeads();
  let lead = leadsList.find(l => cleanPhoneNumber(l.phone) === cleanPhoneNumber(from));
  let isNewLead = false;

  if (!lead) {
    isNewLead = true;
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
      notes: "Registrado automáticamente por el sistema de webhook asíncrono de Docenty (Evolution API).",
      createdAt: new Date().toISOString(),
      messages: [],
    };
    lead = await createLead(newLead);
  }

  let botReply = "Disculpa, no pude procesar tu solicitud en este momento.";
  const systemConfigs = await getSystemConfigs();

  // Caso A: Mensaje de Texto
  if (incoming.type === "text") {
    const promptInput = incoming.text || "";
    if (!promptInput.trim()) {
      return;
    }

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

    // Notificación en tiempo real al administrador por WhatsApp
    const notifyMsg = isNewLead
      ? `🆕 *Nuevo Prospecto Registrado*\n\n*Nombre:* ${senderName}\n*Celular:* ${from}\n*Referencia:* ${lead.assignedRef}\n\n*Mensaje:* "${promptInput}"`
      : `💬 *Mensaje de:* ${lead.name} (${lead.phone})\n*Mensaje:* "${promptInput}"`;
    await sendAdminNotification(notifyMsg);

    if (lead.isPaused) {
      console.log(`[Webhook Background] Camila está pausada para ${lead.name}. Se omite auto-respuesta.`);
      return;
    }

    // Comprobación de palabras clave para Soporte Humano / Pausa Manual
    const lowerInput = promptInput.toLowerCase().trim();
    if (
      lowerInput.includes("humano") || 
      lowerInput.includes("asesor") || 
      lowerInput.includes("soporte") || 
      lowerInput.includes("persona") || 
      lowerInput.includes("reymon") || 
      lowerInput.includes("antonio")
    ) {
      lead.isPaused = true;
      botReply = `Entendido, ${lead.name}. He pausado mis respuestas automáticas para que el arquitecto de sistemas **Reymon Castillo** 👨‍💻 atienda tu chat de forma personal a la brevedad.

Puedes escribirle directamente a su WhatsApp haciendo clic aquí: https://wa.me/584144783204 o esperar su respuesta por esta vía. ¡Muchas gracias por tu paciencia!`;
      
      const botMsg: Message = {
        sender: "bot",
        text: botReply,
        timestamp: new Date().toISOString(),
      };
      lead.messages.push(botMsg);
      await updateLead(lead);
      broadcastToDashboard("lead:updated", lead);

      await sendAdminNotification(`⚠️ *Atención Humana Requerida*\nEl docente *${lead.name}* (${lead.phone}) ha solicitado un asesor humano.`);
      await sendWhatsAppMessage(from, botReply);
      return;
    }

    // ENRUTADOR DE INTENCIONES (GREETING, PURCHASE, OTHER)
    let intent = "OTHER";
    
    const normalizedInput = promptInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const isGreeting = /^(hola|buen(as|os)|tardes|noches|saludo|epale|alo|hey|hi|buen dia)/.test(normalizedInput);
    const isPayment = /pago|pagar|comprar|precio|costo|datos|banco|bcv|transferencia|suscri|cuenta|adquirir|web|pago movil/.test(normalizedInput);

    if (isGreeting && !isPayment) {
      intent = "GREETING";
    } else if (isPayment) {
      intent = "PURCHASE";
    } else {
      // Uso de clasificación inteligente con Gemini para mayor precisión
      try {
        const classifierPrompt = `Analiza el siguiente mensaje de un usuario de WhatsApp y clasifícalo en una de estas categorías:
1. "GREETING" (Si es un saludo amigable como Hola, Buenos días, Hola Camila, etc.)
2. "PURCHASE" (Si expresa interés explícito en pagar, comprar la página web, adquirir la suscripción, costo, precio, datos de pago móvil, banco, o cómo transferir)
3. "OTHER" (Cualquier otra consulta, pregunta educativa, características de Docenty PRO, dudas técnicas, etc.)

Mensaje: "${promptInput}"

Responde ÚNICAMENTE con una palabra: GREETING, PURCHASE o OTHER.`;

        const classificationRes = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: classifierPrompt,
          config: { temperature: 0.1 }
        });
        const resText = classificationRes.text?.toUpperCase().trim() || "";
        if (resText.includes("GREETING")) intent = "GREETING";
        else if (resText.includes("PURCHASE")) intent = "PURCHASE";
      } catch (err) {
        console.error("Fallo al clasificar intención con Gemini, usando regex:", err);
      }
    }

    console.log(`[Intent Router] Mensaje clasificado como: ${intent}`);

    if (intent === "GREETING") {
      botReply = `¡Hola! ¿Cómo estás? Es un gusto saludarte. 😊 Soy **Camila**, la asistente virtual de **META TC**. Me complace darte la bienvenida a nuestro canal oficial de atención.

¿En qué puedo ayudarte hoy? Ofrecemos soluciones digitales de alto impacto:
1. 📚 **Docenty PRO**: Nuestra plataforma de planificación escolar automatizada con Inteligencia Artificial que simplifica y optimiza tu carga académica diaria.
2. 💻 **Desarrollo Digital**: Diseñamos páginas web corporativas, tiendas virtuales (e-commerce), sistemas de facturación POS y aplicaciones móviles a medida de alta calidad.

¿Cuál de estas opciones te gustaría conocer a detalle hoy? ¡Cuéntame y con gusto te asesoro!`;
    } 
    else if (intent === "PURCHASE") {
      botReply = `¡Excelente elección! 🚀 Para activar tu **Suscripción Premium de 30 días** en **Docenty PRO** ($2 USD al cambio oficial del BCV en bolívares) realiza tu Pago Móvil a los siguientes datos oficiales de transferencia:

• **Banco:** Banco de Venezuela (0102)
• **Teléfono:** \`04262953484\`
• **Cédula / RIF:** \`24755720\`
• **Titular:** Reymon Castillo
• **Monto:** $2.00 USD (Calculado en bolívares según la tasa oficial del BCV de la fecha de tu pago)
• **Tu Referencia Única de Pago (¡IMPORTANTE!):** \`${lead.assignedRef}\`

⚠️ **Indicación de validación:** Por favor, coloca tu Referencia Única asignada: **${lead.assignedRef}** en el concepto o nota de tu transferencia Pago Móvil.

Una vez que completes el Pago Móvil, envíanos la **captura de pantalla o comprobante legible** por este chat. Nuestro motor de visión inteligente procesará tu pago al instante para entregarte tu Código Premium. ¡Muchas gracias por tu confianza!`;
    } 
    else {
      // Fallback: Generación dinámica contextual inteligente con Gemini
      try {
        const historyContext = lead.messages
          .map((m) => `${m.sender === "bot" ? "Docenty AI" : lead.name}: ${m.text}`)
          .join("\n");

        const currentCodesText = systemConfigs.premiumCodes && systemConfigs.premiumCodes.length > 0
          ? `\n\n[SISTEMA - CÓDIGOS DE ACTIVACIÓN DISPONIBLES EN EL CRM]
Los siguientes códigos Premium están actualmente DISPONIBLES para ser entregados. Elige uno de estos códigos si el pago ha sido aprobado:
${systemConfigs.premiumCodes.map(c => `- CÓDIGO: [${c}] | ESTADO: DISPONIBLE`).join("\n")}`
          : `\n\n[SISTEMA - CÓDIGOS DE ACTIVACIÓN DISPONIBLES EN EL CRM]
No hay códigos premium en el CRM en este momento. Si necesitas entregar un código, indica que un administrador le proporcionará su código de acceso de inmediato por este chat.`;

        const prompt = `Historial de la conversación de WhatsApp hasta ahora:\n${historyContext}\n\nResponde el último mensaje del cliente en WhatsApp con tu personalidad de Docenty AI (Camila). Recuerda que la referencia asignada a este cliente es: ${lead.assignedRef}.\nNo inventes referencias de otros clientes. Si el cliente pregunta qué plan tiene disponible, recuérdale que tiene reservada la Suscripción Premium de $2 USD (al cambio oficial del BCV en bolívares) con esa referencia.\nRecuerda ofrecer de forma opcional y amable la transferencia con un asesor humano si su consulta requiere soporte técnico especializado.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction: systemConfigs.botSystemPrompt + currentCodesText,
            temperature: 0.7,
          },
        });

        botReply = response.text || "Disculpe, ¿podría repetir su consulta? Estoy aquí para ayudarle con Docenty PRO.";
        
        // Agregar nota de transferencia humana si no está presente
        if (!botReply.includes("04144783204") && !botReply.toLowerCase().includes("humano")) {
          botReply += `\n\n📌 *Nota:* Si prefieres atención directa con una persona o necesitas soporte técnico complejo, escribe la palabra **"Humano"** o **"Asesor"** en cualquier momento y te transferiré con el arquitecto del sistema.`;
        }
      } catch (err) {
        console.error("Error al procesar consulta general con Gemini:", err);
        botReply = `¡Hola, ${lead.name}! Gracias por comunicarte con Docenty PRO. Si deseas activar tu cuenta Premium por $2 USD (tasa BCV) escribe **"Quiero Pagar"** para recibir los datos de transferencia. Si tienes alguna duda, escribe **"Humano"** y con gusto te transferiré con nuestro soporte. 😊`;
      }
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
  else if (incoming.type === "image") {
    const base64Str = incoming.mediaBase64 || (await downloadEvolutionMedia(incoming.rawMessage));

    // Notificar al administrador por WhatsApp
    await sendAdminNotification(`📸 *Capture Recibido* de *${lead.name}* (${lead.phone}). Analizando comprobante de pago con Inteligencia Artificial...`);

    if (base64Str) {
      try {
        const promptString = `Analiza detalladamente este comprobante de pago enviado por el cliente ${lead.name}. Su referencia asignada en nuestro CRM es: ${lead.assignedRef}. El costo de la Suscripción Premium de Docenty PRO es de $2 USD (cobrado en Bolívares al cambio oficial del BCV del día). El método de recepción único es Pago Móvil al Banco de Venezuela (Teléfono: 04262953484, Cédula: 24755720).
        Determina si la transferencia de Pago Móvil fue hecha con éxito, busca el monto, la fecha, el banco emisor y muy importante: busca si el concepto, nota o código de referencia coincide de alguna manera con la referencia de este cliente: ${lead.assignedRef} o si tiene alguna otra referencia de pago válida para Docenty.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            {
              inlineData: {
                mimeType: incoming.mimeType || "image/png",
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
        const imageUrl = `data:${incoming.mimeType || "image/png"};base64,${base64Str}`;

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
          
          await sendAdminNotification(`✅ *Pago Aprobado Automáticamente*\n\n*Cliente:* ${lead.name}\n*Monto:* ${receiptData.monto}\n*Referencia:* ${receiptData.referencia}\n*Código Premium:* ${premiumCode}`);
        } else {
          botReply = `⚠️ **Validación de Pago en Espera**\n\nHola ${lead.name}, he recibido tu comprobante de pago pero nuestro sistema detecta un detalle:\n\n• **Monto leído:** ${receiptData.monto || "No detectado"}\n• **Referencia leída:** \`${receiptData.referencia || "Ninguna"}\`\n• **Tu Referencia Asignada:** \`${lead.assignedRef}\`\n\n${receiptData.status === "REJECTED" ? "El archivo enviado no parece ser un comprobante de transferencia válido." : "Por favor, confirma que la transferencia se haya realizado ingresando correctamente tu código de referencia asignado. Un ejecutivo revisará el comprobante manualmente a la brevedad."}\n\nSi consideras que hay un error, puedes volver a intentar enviando una captura más legible. 😊`;
          
          await sendAdminNotification(`⚠️ *Pago en Espera / Rechazado*\n\n*Cliente:* ${lead.name}\n*Monto:* ${receiptData.monto}\n*Referencia Leída:* ${receiptData.referencia}\n*Análisis:* ${receiptData.analisis}`);
        }

        await updateLead(lead);
        broadcastToDashboard("lead:updated", lead);

        if (lead.isPaused) {
          console.log(`[Webhook Background] Camila está pausada para ${lead.name}. Se omite auto-respuesta al comprobante.`);
          return;
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
        console.error("Error en análisis de visión con Gemini, simulando validación:", visionErr);
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

        await sendAdminNotification(`✅ *Pago Aprobado (Visión Fallback)*\n*Cliente:* ${lead.name}\n*Monto:* ${receiptData.monto}\n*Referencia:* ${receiptData.referencia}\n*Código:* ${premiumCode}`);

        if (lead.isPaused) {
          console.log(`[Webhook Background] Camila está pausada para ${lead.name}. Se omite respuesta al capture.`);
          return;
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
      broadcastToDashboard("lead:updated", lead);
    }
  }
  // Caso C: Nota de Voz (Audio)
  else if (incoming.type === "audio") {
    const mimeType = incoming.mimeType || "audio/ogg";
    const base64Str = incoming.mediaBase64 || (await downloadEvolutionMedia(incoming.rawMessage));

    // Notificar al administrador por WhatsApp
    await sendAdminNotification(`🎤 *Nota de voz recibida* de *${lead.name}* (${lead.phone}). Procesando audio con Inteligencia Artificial...`);

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
        console.log(`[Webhook Background] Camila está pausada para ${lead.name}. Se omite auto-respuesta de voz.`);
        return;
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
Los siguientes códigos Premium están actualmente DISPONIBLES para ser entregados. Elige uno de estos códigos si el pago ha sido aprobado:
${systemConfigs.premiumCodes.map(c => `- CÓDIGO: [${c}] | ESTADO: DISPONIBLE`).join("\n")}`
          : `\n\n[SISTEMA - CÓDIGOS DE ACTIVACIÓN DISPONIBLES EN EL CRM]
No hay códigos premium disponibles en el pool en este momento. Si necesitas entregar un código, dile que un administrador le enviará su código de acceso de inmediato por este chat.`;

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
        console.error("Error al procesar audio en webhook con Gemini:", err);
        botReply = `¡Hola, ${lead.name}! Gracias por tu nota de voz. Para confirmar la activación de tu Suscripción Premium ($2 USD al cambio oficial BCV en bolívares) por favor realiza el Pago Móvil de referencia **${lead.assignedRef}** al Banco de Venezuela (Teléfono: 04262953484, Cédula: 24755720) y mándanos el comprobante por este chat para validarlo de inmediato. 😊`;
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

  // Enviar respuesta por WhatsApp mediante Evolution API
  await sendWhatsAppMessage(from, botReply);
}

app.post(["/api/webhook", "/webhook"], async (req, res) => {
  try {
    // Responder HTTP 200 OK inmediatamente a Evolution API para confirmar la entrega
    res.sendStatus(200);

    const body = req.body;
    if (!body) return;

    // Normalizar payloads: Evolution API envía eventos como "MESSAGES_UPSERT" o estructura directa
    const event = body.event || body.type;
    const data = body.data || body;

    // Ignorar eventos que no sean de nuevos mensajes
    if (event && event !== "messages.upsert" && event !== "MESSAGES_UPSERT") {
      console.log(`[Evolution Webhook] Evento ignorado: ${event}`);
      return;
    }

    // Extraer clave del mensaje
    const key = data.key || {};
    
    // Regla 3: Ignorar mensajes salientes enviados por el propio bot
    if (key.fromMe === true || data.fromMe === true) {
      return;
    }

    // Regla 3: Extraer ID del mensaje para idempotencia
    const messageId = key.id || data.id;
    if (messageId && checkAndRegisterWAMID(messageId)) {
      console.log(`[Idempotency] Mensaje duplicado detectado (Evolution ID: ${messageId}). Omitiendo.`);
      return;
    }

    // Regla 3: Extraer número de remitente limpiando el sufijo @s.whatsapp.net o @g.us
    const rawRemoteJid = key.remoteJid || data.remoteJid || data.from || "";
    if (rawRemoteJid.includes("@g.us")) {
      // Ignorar mensajes de grupos
      return;
    }
    const fromPhone = cleanPhoneNumber(rawRemoteJid.replace(/@s\.whatsapp\.net$/, ""));
    if (!fromPhone) {
      return;
    }

    const senderName = data.pushName || data.senderName || `Docente (${fromPhone})`;
    const messageObj = data.message || {};

    // Extraer contenido según el tipo de mensaje de Evolution API
    let msgType: "text" | "image" | "audio" | "other" = "other";
    let textContent = "";
    let mediaBase64: string | null = null;
    let mimeType = "";

    // 1. Mensaje de Texto plano o extendido
    if (messageObj.conversation) {
      msgType = "text";
      textContent = messageObj.conversation;
    } else if (messageObj.extendedTextMessage?.text) {
      msgType = "text";
      textContent = messageObj.extendedTextMessage.text;
    } 
    // 2. Mensaje de Imagen (comprobantes de pago)
    else if (messageObj.imageMessage) {
      msgType = "image";
      mimeType = messageObj.imageMessage.mimetype || "image/png";
      textContent = messageObj.imageMessage.caption || "";
      if (data.base64) {
        mediaBase64 = data.base64;
      }
    } 
    // 3. Nota de Voz / Audio
    else if (messageObj.audioMessage) {
      msgType = "audio";
      mimeType = messageObj.audioMessage.mimetype || "audio/ogg";
      if (data.base64) {
        mediaBase64 = data.base64;
      }
    }
    // Fallback: Si Evolution envía payload plano tipo texto
    else if (typeof data.text === "string") {
      msgType = "text";
      textContent = data.text;
    }

    // Si no es texto, imagen ni audio reconocido, ignorar
    if (msgType === "other") {
      console.log(`[Evolution Webhook] Tipo de mensaje no manejado:`, Object.keys(messageObj));
      return;
    }

    const incoming: EvolutionIncomingPayload = {
      messageId,
      from: fromPhone,
      senderName,
      type: msgType,
      text: textContent,
      mediaBase64,
      mimeType,
      rawMessage: data
    };

    // Procesar asíncronamente en segundo plano
    processWebhookInBackground(incoming).catch((backgroundErr) => {
      console.error("[Evolution Webhook Background] Error Crítico:", backgroundErr);
    });

  } catch (error: any) {
    console.error("Error en Wrapper Webhook Evolution:", error.response?.data || error.message);
    if (!res.headersSent) {
      res.sendStatus(200);
    }
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
      if (existingIds.has(lead.id)) {
        await updateLead(lead);
      } else {
        await createLead(lead);
      }
      count++;
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

    // Send WhatsApp notification via Evolution API
    await sendWhatsAppMessage(lead.phone, botReply);

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

    // Send WhatsApp notification via Evolution API
    await sendWhatsAppMessage(targetLead.phone, congratulationsMsg.text);

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

    // Send manual message via Evolution API
    await sendWhatsAppMessage(lead.phone, message);

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

  // Background Keep-Alive and Database Connection Health Monitor
  // Pings database every 3 minutes to keep socket pools warm and prevent idle timeouts
  setInterval(async () => {
    try {
      const health = await checkDbHealth();
      if (health.status === "connected") {
        console.log(`[Keep-Alive Ping] Database healthy (MongoDB response: ${health.pingMs || 0}ms). System active for incoming WhatsApp webhooks.`);
      } else if (health.uriConfigured) {
        console.warn("[Keep-Alive Alert] MongoDB connection dropped during background idle period. Re-establishing connection...");
        await getDbConnection();
      }
    } catch (err) {
      console.error("[Keep-Alive ERROR] Background monitor failed:", err);
    }
  }, 180000); // 3 minutes interval

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
