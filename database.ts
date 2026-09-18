import { MongoClient, Db } from "mongodb";
import fs from "fs";
import path from "path";

// Types
export interface Message {
  sender: "bot" | "client";
  text: string;
  timestamp: string;
  isReceipt?: boolean;
  receiptData?: {
    isValid: boolean;
    status: "APPROVED" | "REJECTED" | "PENDING";
    monto: string;
    referencia: string;
    banco: string;
    fecha: string;
    analisis: string;
    imageUrl?: string;
  };
  isAudio?: boolean;
  audioData?: {
    base64: string;
    mimeType: string;
  };
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: "prospect" | "interested" | "payment_sent" | "approved" | "expired";
  plan: "monthly" | "annual";
  assignedRef: string;
  notes: string;
  createdAt: string;
  messages: Message[];
  isPaused?: boolean;
  premiumCode?: string;
}

export interface BankDetails {
  banco: string;
  cuenta: string;
  beneficiario: string;
}

export interface MetaWhatsAppConfig {
  phoneNumberId: string;
  wabaId: string;
  verifyToken: string;
  accessToken: string;
  businessPhone: string;
  activeProvider: "meta" | "evolution";
}

export interface SystemConfigs {
  botSystemPrompt: string;
  bankDetails: BankDetails;
  premiumCodes: string[];
  metaConfig?: MetaWhatsAppConfig;
}

// Initial demo leads
const DEFAULT_LEADS: Lead[] = [];

const DEFAULT_CONFIG: SystemConfigs = {
  botSystemPrompt: `Eres Camila, la asistente virtual y especialista en atención al cliente de R-LTC. Tu arquitecto y creador es Reymon Castillo (también conocido como Antonio Castillo; son la misma persona).

[PERSONALIDAD Y TONO DE ATENCIÓN]
- Sé sumamente empática, cálida y cercana, como una asesora real de atención al cliente por WhatsApp. 
- Evita sonar como un menú automatizado rígido. Conecta primero con la necesidad del usuario, escucha su situación (especialmente si es un docente abrumado por el papeleo) y guíalo con naturalidad.
- Usa frases conversacionales fluidas ("Entiendo perfectamente", "Claro que sí, te ayudo con eso", "¿Te ha pasado que...?"). Mantén los mensajes ágiles, redactados en párrafos cortos o viñetas sencillas, ideales para lectura rápida en teléfono móvil.

[BASE DE CONOCIMIENTOS: ¿QUÉ ES DOCENTY PRO?]
Docenty PRO es una plataforma web inteligente de gestión y asistencia pedagógica creada en Venezuela por Reymon Castillo. 
- Qué hace: Integra IA calibrada específicamente para el sistema educativo venezolano (Maternal, Preescolar, Primaria y Media General), transformando semanas de papeleo administrativo en minutos con unos pocos clics.
- Qué dolores resuelve: Salva a los docentes de las 15-25 horas mensuales perdidas redactando diagnósticos o proyectos a mano. Acaba con el bloqueo creativo y cumple con los formatos formales del Ministerio de Educación (PPA, ejes integradores, áreas de formación).
- Módulos principales que puedes mencionar de forma natural según lo que el cliente necesite:
  * Generador de PPA (Proyectos Pedagógicos de Aula) con IA en menos de 2 minutos.
  * Módulo especializado para Maternal y Educación Inicial.
  * Planificador pedagógico diario y semanal, gestión de matrícula de estudiantes y control de asistencia digital.
  * Generador automático de boletines e informes descriptivos (Reports) listos para entregar.
  * Camila (Asistente IA con voz y chat en vivo para recomendaciones metodológicas).
  * Red de Afiliados ("Ganar Dinero") para que los docentes generen ingresos extras recomendando la herramienta.
- Nota de evolución: Anteriormente conocida como "Docente Pro". Si preguntan por el nombre viejo, aclara con naturalidad que evolucionó a Docenty PRO para reflejar su enorme salto en automatización.

[EXPERIENCIA Y PROYECTOS DE R-LTC]
Para generar confianza en proyectos a medida, puedes respaldarte en el trabajo de R-LTC bajo la dirección de Reymon Castillo:
- Bibi Store: Sistema POS con escáner QR y e-commerce.
- R-LTC: Tienda online con asistente de IA integrado.
- Curso Dropshipping: Plataforma educativa para emprendedores.
- Proyectarq: Web corporativa para empresa de arquitectura e interiores.
- Desarrollo Móvil: Apps nativas e híbridas para Android e iOS.
- Stack tecnológico de vanguardia: Python, React, React Native/Flutter, Vercel, Firebase y Tailwind CSS.

[DIRECTRICES DE ENRUTAMIENTO Y FLUJOS LÓGICOS]
Escucha el mensaje del usuario y adapta tu respuesta a uno de estos tres escenarios de forma coherente:

1. FLUJO A: DESARROLLO DIGITAL (Páginas Web, Tiendas, Software, POS)
   - Cuándo se activa: Si piden presupuestos, páginas web, tiendas online o sistemas a medida.
   - RESTRICCIÓN ABSOLUTA: No menciones los $2 USD de Docenty PRO ni envíes datos de Pago Móvil aquí.
   - Cómo actuar: Muestra entusiasmo por su proyecto, felicítalo por buscar digitalizar su negocio y hazle un diagnóstico conversacional rápido con máximo 2 preguntas clave (ej. ¿De qué es tu emprendimiento o empresa y qué funciones principales te gustaría que tuviera?). Aplica el 20% OFF exclusivo para nuevos proyectos de R-LTC.
   - Derivación: Si el cliente busca una atención técnica compleja o hablar directamente con el especialista, despliega la nota interna y proporciónale el WhatsApp de Reymon: 04144783204.

2. FLUJO B: DOCENTY PRO (Plataforma Educativa)
   - Cuándo se activa: Docentes buscando aligerar su carga laboral, consultar funciones pedagógicas o adquirir/activar su cuenta.
   - Cómo actuar: Conecta con su realidad como docente. Valida el peso del papeleo escolar y explícale con empatía cómo Docenty PRO le devolverá su tiempo libre. 
   - Restricción de Cobro: ¡Prohibido arrojar los datos de pago de la nada! Escucha su interés primero. Solo entrégales los datos de Pago Móvil si el docente afirma explícitamente que está listo para pagar o si te pide los datos de transferencia de forma directa.
   - Datos de Pago oficiales: Banco de Venezuela | Titular: Reymon Castillo | Cédula: 24755720 | Teléfono: 04262953484 | Monto: $2.00 USD (al cambio oficial del BCV).

3. FLUJO C: ASUNTOS PERSONALES / CONOCIDOS (FILTRO HUMANO)
   - Cuándo se activa: Saludos informales de amigos, familiares o conocidos ("Epale Reymon", "¿Cómo estás chamo?", etc.) que no tienen relación con ventas o software.
   - Cómo actuar: Responde de forma muy cordial, identifica tu rol de asistente y derívalo de inmediato al canal privado del arquitecto mediante esta plantilla exacta:
     "¡Hola! Qué gusto saludarte. Te comento que soy Camila, la asistente virtual de R-LTC y de Reymon Castillo. Como este es un canal automatizado de atención comercial, para asuntos personales puedes escribirle directamente a su WhatsApp privado haciendo clic en este enlace: https://wa.me/584144783204 ¡Él te atenderá enseguida!"

[REGLAS CRÍTICAS DE CONVERSACIÓN]
- Cero repeticiones robóticas: Revisa el historial. Si ya saludaste o te presentaste en el mensaje anterior, jamás vuelvas a decir "Soy Camila..." ni repitas saludos acartonados. Continúa la charla como una persona real.
- Saludo Inicial (Únicamente para el primer contacto genérico de un usuario nuevo):
  "¡Hola! ¿Cómo estás? Es un gusto saludarte. Soy Camila, la asistente virtual de R-LTC. Me encantaría conocerte un poco más. ¿Cuál es el motivo de tu consulta hoy? ¿Eres docente buscando simplificar tu carga de planificación escolar con Docenty PRO, o te gustaría recibir información sobre nuestros servicios de desarrollo digital?"
- Protocolo de Validación de Pagos (Docenty PRO):
  1. Verifica que el comprobante sea del Banco de Venezuela, con la referencia, fecha correcta y el equivalente a $2 USD al BCV a nombre de Reymon Castillo (Cédula: 24755720 / Teléfono: 04262953484).
  2. Si es válido, entrégale de manera destacada un código disponible de la lista interna del CRM e indícale que pase a estado 'USADO'.
  3. Instrucción clave de acceso: Recuérdale con claridad que **no necesita contraseñas ni usuarios provisionales**. Solo debe ingresar con su cuenta de Google en https://docente-pro-by-meta-tc.vercel.app/ y colocar su código Premium de 30 días.
  4. Si el pago es falso o erróneo: "Tu pago no pudo ser verificado con los datos oficiales. Por favor, verifica que el Pago Móvil se haya realizado al Banco de Venezuela (04262953484) y vuelve a intentar. Si consideras que es un error, contacta al arquitecto al 04144783204".

[MÓDULO DE NOTIFICACIÓN INTERNA]
Si un cliente de negocios o educación solicita hablar con el creador/arquitecto, muestra esta estructura en el chat antes de dar su número:
  [NOTA PARA REYMON CASTILLO]
  Cliente: [Nombre o Teléfono]
  Motivo de Consulta: [Breve resumen]
  Estado de Compra: [Pendiente o Interesado nuevo]
  Referencia asignada: [Código si aplica]

[CIERRE Y RESTRICCIONES]
- Post-activación Docenty PRO: "¡Excelente! Tu acceso ya está activo. Para nosotros es fundamental mejorar cada día, ¿te gustaría dejarnos algún comentario sobre tu experiencia con el proceso de activación de Docenty PRO?"
- Nunca inventes URLs, claves de acceso o plataformas que no existan.
- Mantén siempre la premisa de que Reymon y Antonio Castillo son la misma persona.`,
  bankDetails: {
    banco: "Banco de Venezuela",
    cuenta: "04262953484",
    beneficiario: "24755720",
  },
  premiumCodes: [
    "META-ZLKN-25C8",
    "META-D39K-U161",
    "META-5SLA-X73P",
    "META-H92Z-6KU3"
  ],
  metaConfig: {
    phoneNumberId: process.env.META_PHONE_NUMBER_ID || "1221464777727895",
    wabaId: process.env.META_WABA_ID || "2562659904236968",
    verifyToken: process.env.META_VERIFY_TOKEN || "docenty_pro_secure_verify_2026",
    accessToken: process.env.META_WA_TOKEN || "EAAbipQWNwwsBSiKZChy8QdP2dHyK1ztEpIHHonMxHGQlpeDuR66oEAayl4wovF7MfEFKDqr2KHbZBOMbGKZBZAX4Emyt2VLjg9BWQCbDijl5nu8MZBRaaShvJcvaz3Wwdwm3DTwn1Y3ij2UerM3IXlVVFtGZCHQfOzl0RV3Vrs772xFVCaZCjsus1FMv7yOgckBaAZDZD",
    businessPhone: "+58 426-2953484",
    activeProvider: "meta",
  }
};

// In-Memory & File Fallback State (will be used if MONGODB_URI is not set or temporarily down)
let localLeadsStore: Lead[] = [];
let localConfigStore: SystemConfigs = { ...DEFAULT_CONFIG };

// In serverless environments like AWS Lambda / Vercel, process.cwd() is read-only (/var/task).
// Only /tmp is writable for temporary disk persistence.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const STORAGE_DIR = isServerless ? "/tmp" : process.cwd();
const LEADS_FILE = path.join(STORAGE_DIR, "leads_store.json");
const CONFIG_FILE = path.join(STORAGE_DIR, "config_store.json");
const BUNDLED_LEADS_FILE = path.join(process.cwd(), "leads_store.json");
const BUNDLED_CONFIG_FILE = path.join(process.cwd(), "config_store.json");

function loadLocalStores() {
  try {
    let raw = "";
    if (fs.existsSync(LEADS_FILE)) {
      raw = fs.readFileSync(LEADS_FILE, "utf-8");
    } else if (fs.existsSync(BUNDLED_LEADS_FILE)) {
      raw = fs.readFileSync(BUNDLED_LEADS_FILE, "utf-8");
    }
    if (raw) {
      localLeadsStore = JSON.parse(raw);
      console.log(`[CRM Storage] Loaded ${localLeadsStore.length} leads from local store.`);
    } else {
      localLeadsStore = [...DEFAULT_LEADS];
    }
  } catch (err) {
    console.warn("[CRM Storage Warning] Could not load local leads file store:", err);
    localLeadsStore = [...DEFAULT_LEADS];
  }

  try {
    let raw = "";
    if (fs.existsSync(CONFIG_FILE)) {
      raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    } else if (fs.existsSync(BUNDLED_CONFIG_FILE)) {
      raw = fs.readFileSync(BUNDLED_CONFIG_FILE, "utf-8");
    }
    if (raw) {
      localConfigStore = JSON.parse(raw);
      console.log("[CRM Storage] Loaded system configs from local store.");
    } else {
      localConfigStore = { ...DEFAULT_CONFIG };
    }
  } catch (err) {
    console.warn("[CRM Storage Warning] Could not load local configs file store:", err);
    localConfigStore = { ...DEFAULT_CONFIG };
  }
}

function saveLocalLeadsStore() {
  try {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(localLeadsStore, null, 2));
  } catch (err: any) {
    // Non-fatal fallback: localLeadsStore is maintained in-memory
    console.warn("[CRM Storage Warning] Could not persist leads to disk (using in-memory store):", err.message);
  }
}

function saveLocalConfigStore() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(localConfigStore, null, 2));
  } catch (err: any) {
    // Non-fatal fallback: localConfigStore is maintained in-memory
    console.warn("[CRM Storage Warning] Could not persist config to disk (using in-memory store):", err.message);
  }
}

// Load stores on initialization
loadLocalStores();

// Database connection helper
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let isConnecting = false;
let lastMongoErrorTime = 0;
const MONGO_COOLDOWN_MS = 25000; // 25s circuit-breaker to avoid 8-32s timeouts on every request when Atlas is unreachable
const MONGODB_URI = process.env.MONGODB_URI || "";

/**
 * Ensures an active MongoDB database connection.
 * If the connection dropped due to prolonged inactivity (e.g., 1-2 days),
 * it automatically re-establishes the connection without losing data.
 * Implements a circuit-breaker to prevent hanging serverless functions when Atlas firewall blocks IPs.
 */
export async function getDbConnection(): Promise<Db | null> {
  if (!MONGODB_URI) {
    return null;
  }

  // Fast-path: ping existing connection
  if (mongoDb) {
    try {
      await mongoDb.command({ ping: 1 });
      return mongoDb;
    } catch (pingError) {
      console.warn("[MongoDB Audit] Stale or dropped database connection detected during ping. Re-connecting...", pingError);
      mongoDb = null;
    }
  }

  // Circuit-breaker: if Atlas failed recently (e.g., IP not whitelisted or paused), fail fast and use local store
  if (lastMongoErrorTime > 0 && Date.now() - lastMongoErrorTime < MONGO_COOLDOWN_MS) {
    return null;
  }

  // Prevent multiple parallel reconnection attempts
  if (isConnecting) {
    let retries = 0;
    while (isConnecting && retries < 10) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      retries++;
    }
    if (mongoDb) return mongoDb;
    if (lastMongoErrorTime > 0 && Date.now() - lastMongoErrorTime < MONGO_COOLDOWN_MS) {
      return null;
    }
  }

  isConnecting = true;
  try {
    console.log("[MongoDB Audit] Initializing resilient connection to MongoDB Atlas...");
    if (mongoClient) {
      try {
        await mongoClient.close();
      } catch {
        // Ignore close errors on stale client
      }
    }

    mongoClient = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 0,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 3500, // Fail fast in 3.5s instead of 8s
      socketTimeoutMS: 20000,
      connectTimeoutMS: 4000,
    });

    await mongoClient.connect();
    mongoDb = mongoClient.db("docenty_crm");
    lastMongoErrorTime = 0;
    console.log("[MongoDB Audit] MongoDB connection successfully established and verified!");
    return mongoDb;
  } catch (error: any) {
    lastMongoErrorTime = Date.now();
    console.error("[MongoDB Audit ERROR] Failed to connect to MongoDB Atlas:", error.message || error);
    mongoClient = null;
    mongoDb = null;
    return null;
  } finally {
    isConnecting = false;
  }
}

export async function checkDbHealth(): Promise<{
  status: "connected" | "disconnected" | "in_memory";
  mode: "mongodb" | "local_json";
  uriConfigured: boolean;
  pingMs?: number;
  error?: string;
}> {
  if (!MONGODB_URI) {
    return {
      status: "in_memory",
      mode: "local_json",
      uriConfigured: false,
    };
  }

  const startTime = Date.now();
  const db = await getDbConnection();
  if (db) {
    return {
      status: "connected",
      mode: "mongodb",
      uriConfigured: true,
      pingMs: Date.now() - startTime,
    };
  } else {
    return {
      status: "disconnected",
      mode: "local_json",
      uriConfigured: true,
      error: "MongoDB connection is unreachable. Falling back to local store.",
    };
  }
}

export async function initDatabase(): Promise<boolean> {
  if (!MONGODB_URI) {
    console.log("[CRM Storage] No MONGODB_URI environment variable detected. Running in local JSON storage mode.");
    return false;
  }

  try {
    const db = await getDbConnection();
    if (!db) return false;

    const configCollection = db.collection("configs");
    const configCount = await configCollection.countDocuments();
    let isNewDb = false;
    if (configCount === 0) {
      isNewDb = true;
      console.log("[CRM Storage] Seeding initial system config into MongoDB...");
      await configCollection.insertOne({ _id: "system_config" as any, ...DEFAULT_CONFIG });
    }

    const leadsCollection = db.collection("leads");
    const count = await leadsCollection.countDocuments();
    if (count === 0 && isNewDb) {
      console.log("[CRM Storage] Seeding initial demo leads into MongoDB...");
      await leadsCollection.insertMany(DEFAULT_LEADS);
    }

    return true;
  } catch (error) {
    console.error("[CRM Storage ERROR] Database initialization failed:", error);
    return false;
  }
}

// Leads DAO functions
export async function getAllLeads(): Promise<Lead[]> {
  const db = await getDbConnection();
  if (db) {
    try {
      const leadsCollection = db.collection("leads");
      const list = await leadsCollection.find({}).sort({ createdAt: -1 }).toArray();
      return list.map((item) => {
        const { _id, ...leadData } = item;
        return leadData as Lead;
      });
    } catch (e) {
      console.error("[CRM Storage ERROR] Error fetching leads from MongoDB:", e);
    }
  }
  return [...localLeadsStore];
}

export async function createLead(lead: Lead): Promise<Lead> {
  const db = await getDbConnection();
  if (db) {
    try {
      const leadsCollection = db.collection("leads");
      await leadsCollection.insertOne({ ...lead });
      console.log(`[CRM Storage Audit] Lead created in MongoDB: ${lead.id} (${lead.phone})`);
      return lead;
    } catch (e) {
      console.error(`[CRM Storage ERROR] Failed to insert lead ${lead.id} into MongoDB:`, e);
    }
  } else if (MONGODB_URI) {
    console.warn(`[CRM Storage ALERT] MONGODB_URI is set but database connection failed! Storing lead ${lead.id} in local fallback memory.`);
  }

  localLeadsStore.unshift(lead);
  saveLocalLeadsStore();
  return lead;
}

export async function updateLead(lead: Lead): Promise<Lead> {
  const db = await getDbConnection();
  if (db) {
    try {
      const leadsCollection = db.collection("leads");
      await leadsCollection.updateOne({ id: lead.id }, { $set: { ...lead } });
      console.log(`[CRM Storage Audit] Lead updated in MongoDB: ${lead.id} (${lead.messages.length} messages saved)`);
      return lead;
    } catch (e) {
      console.error(`[CRM Storage ERROR] Failed to update lead ${lead.id} in MongoDB:`, e);
    }
  } else if (MONGODB_URI) {
    console.warn(`[CRM Storage ALERT] MONGODB_URI is set but database connection failed! Updating lead ${lead.id} in local fallback memory.`);
  }

  localLeadsStore = localLeadsStore.map((l) => (l.id === lead.id ? lead : l));
  saveLocalLeadsStore();
  return lead;
}

export async function deleteLead(id: string): Promise<boolean> {
  const db = await getDbConnection();
  if (db) {
    try {
      const leadsCollection = db.collection("leads");
      const result = await leadsCollection.deleteOne({ id });
      console.log(`[CRM Storage Audit] Lead deleted from MongoDB: ${id}`);
      return result.deletedCount > 0;
    } catch (e) {
      console.error(`[CRM Storage ERROR] Failed to delete lead ${id} from MongoDB:`, e);
    }
  }

  const originalLength = localLeadsStore.length;
  localLeadsStore = localLeadsStore.filter((l) => l.id !== id);
  saveLocalLeadsStore();
  return localLeadsStore.length < originalLength;
}

export async function resetDatabase(): Promise<Lead[]> {
  const db = await getDbConnection();
  if (db) {
    try {
      const leadsCollection = db.collection("leads");
      await leadsCollection.deleteMany({});
      await leadsCollection.insertMany(DEFAULT_LEADS);
      
      const configCollection = db.collection("configs");
      await configCollection.deleteMany({});
      await configCollection.insertOne({ _id: "system_config" as any, ...DEFAULT_CONFIG });
      
      console.log("[CRM Storage Audit] MongoDB database reset to default state.");
      return DEFAULT_LEADS;
    } catch (e) {
      console.error("[CRM Storage ERROR] Failed to reset MongoDB database:", e);
    }
  }

  localLeadsStore = [...DEFAULT_LEADS];
  localConfigStore = { ...DEFAULT_CONFIG };
  saveLocalLeadsStore();
  saveLocalConfigStore();
  return localLeadsStore;
}

// Configs DAO functions
export async function getSystemConfigs(): Promise<SystemConfigs> {
  const db = await getDbConnection();
  if (db) {
    try {
      const configCollection = db.collection("configs");
      const doc = await configCollection.findOne({ _id: "system_config" as any });
      if (doc) {
        const { _id, ...configData } = doc;
        return configData as SystemConfigs;
      }
    } catch (e) {
      console.error("[CRM Storage ERROR] Failed to fetch system config from MongoDB:", e);
    }
  }
  return { ...localConfigStore };
}

export async function saveSystemConfigs(configs: SystemConfigs): Promise<SystemConfigs> {
  const db = await getDbConnection();
  if (db) {
    try {
      const configCollection = db.collection("configs");
      await configCollection.updateOne(
        { _id: "system_config" as any },
        { $set: { ...configs } },
        { upsert: true }
      );
      console.log("[CRM Storage Audit] System configs updated in MongoDB.");
      return configs;
    } catch (e) {
      console.error("[CRM Storage ERROR] Failed to save system config in MongoDB:", e);
    }
  }

  localConfigStore = { ...configs };
  saveLocalConfigStore();
  return localConfigStore;
}
