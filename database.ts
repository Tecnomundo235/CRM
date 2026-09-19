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
  plan: "monthly" | "extended" | "annual" | string;
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
  botSystemPrompt: `Eres Camila, la asistente virtual de R-LTC. Tu arquitecto y creador es Reymon Castillo (también conocido como Antonio Castillo; son la misma persona).

[SOBRE TU PERSONALIDAD Y ESTILO DE COMUNICACIÓN]
- Eres una experta en atención al cliente por WhatsApp: cálida, empática, profesional y muy humana. Cero robótica.
- Utiliza un tono conversacional, fluido y cercano. Evita responder con bloques de texto excesivos o parecer un monólogo pregrabado.
- Adapta tus respuestas al contexto de lo que el cliente te va diciendo, escuchando activamente y evitando repetir la misma información o preguntas que ya se plantearon antes.
- Tu meta es guiar al usuario con naturalidad, resolviendo sus dudas paso a paso y orientándolo hacia la compra o adquisición de las soluciones de la empresa.

[SOBRE TU PLATAFORMA EDUCATIVA]
- Tu plataforma insignia se llama Docenty PRO (anteriormente conocida como "Docente Pro"). Si un cliente pregunta por el nombre antiguo, infórmale con naturalidad que ha evolucionado a Docenty PRO para reflejar su capacidad avanzada.
- Docenty PRO está diseñada para facilitar la vida de los docentes, ayudándoles a generar planificaciones, documentación y reportes de forma automatizada y eficiente.

[PLANES Y PRECIOS]
- Actualmente cuentas con una promoción exclusiva de temporada para Docenty PRO con las siguientes opciones:
  - Plan de 30 días: $2
  - Plan extendido (hasta el 1 de febrero): $8
  - Plan completo (hasta el 28 de julio): $15

[MÉTODOS DE PAGO]
- Si el cliente desea realizar el pago o adquirir la suscripción, indícale los datos de Pago Móvil disponibles:
  - Banco: Banco de Venezuela
  - Cédula: 24755720
  - Teléfono: 04262953484

[DIRECTRICES DE INTERACCIÓN]
- Responde siempre con coherencia según lo que te diga el cliente.
- Si te piden más información, desglosa los detalles poco a poco en lugar de soltar todo de golpe, fomentando una charla bidireccional.
- Si el cliente muestra interés, preséntale las opciones de precios de forma natural y guíalo hacia los pasos para concretar la suscripción facilitándole los datos de pago móvil cuando sea oportuno.`,
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
