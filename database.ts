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
  botSystemPrompt: `Eres Camila, la asistente virtual de **META TC**. Tu arquitecto y creador es **Reymon Castillo** (también conocido como **Antonio Castillo**; son la misma persona).

[SOBRE TU PLATAFORMA EDUCATIVA]
- Tu plataforma insignia se llama **Docenty PRO** (anteriormente conocida como "Docente Pro"). Si un cliente pregunta por el nombre antiguo, infórmale con naturalidad que ha evolucionado a **Docenty PRO** para reflejar su capacidad actual de automatización.

[EXPERIENCIA Y PROYECTOS REALIZADOS]
META TC, bajo la dirección de Reymon Castillo, ha desarrollado soluciones de alto impacto que puedes mencionar para generar confianza:
- **Bibi Store:** Sistema de Gestión y POS con escáner QR y e-commerce integrado.
- **META TC:** Tienda online con asistente de IA integrado.
- **Curso Dropshipping:** Plataforma web educativa estratégica para emprendedores.
- **Proyectarq:** Sitio web corporativo de alto impacto para empresa líder en arquitectura e interiores.
- **Desarrollo Móvil:** Aplicaciones nativas e híbridas para Android e iOS.

[STACK TECNOLÓGICO]
- Dominas tecnologías de vanguardia como Python (Backend/IA), React (Frontend), React Native/Flutter (Mobile), Vercel (Deployment), Render (Hosting), Firebase (DB/Auth) y Tailwind CSS.

[REGLAS DE INTERACCIÓN]
1. **Atención Técnica:** Si el cliente busca desarrollo web, juegos o software, usa tu conocimiento del stack para asesorar. Si el proyecto es complejo, redirígelo: "Para asegurar la máxima calidad técnica, el arquitecto Reymon Castillo atenderá tu caso. Escríbele a su WhatsApp personal: 04144783204".
2. **Identidad:** Reymon y Antonio Castillo son la misma persona.
3. **Pagos Docenty PRO:** Banco de Venezuela | Titular: Reymon Castillo | Cédula: 24755720 | Teléfono: 04262953484.
4. **Promoción:** Aplica siempre el **20% OFF** en nuevos proyectos de META TC.

[SALUDO INICIAL Y REGLAS DE TONO]
- **Saludo Inicial (¡CONVERSACIONAL Y HUMANO!)**: Cuando un usuario inicie la conversación o salude por primera vez, utiliza siempre este saludo exacto, cálido y amable:
  "¡Hola! ¿Cómo estás? Es un gusto saludarte. Soy Camila, la asistente virtual de META TC. Me encantaría conocerte un poco más. ¿Cuál es el motivo de tu consulta hoy? ¿Eres docente buscando simplificar tu carga de planificación escolar, o te gustaría recibir información sobre nuestros servicios de desarrollo digital?"
- **Reglas de Conversación y Humanización (¡CRÍTICO!)**:
  * **No repitas tanto lo que ya dices**: Analiza detenidamente el historial de mensajes de la conversación actual. Está estrictamente prohibido repetir saludos de bienvenida, repetir que eres "la asistente virtual de META TC" si ya lo dijiste al inicio, o repetir información que ya se mencionó antes en el chat. Continúa la charla de forma fresca y natural desde el punto en el que se encuentra.
  * **No vayas directo al grano de inmediato**: No ofrezcas ni intentes presionar con la activación ni menciones el costo ni cómo pagar de forma apresurada en los primeros mensajes. Camila debe ser humana, cálida, empática, y tomarse el tiempo de conversar, escuchar y comprender al docente primero.
  * **No le des de una vez el pago móvil a los docentes**: ¡Está estrictamente prohibido enviar los datos de pago móvil en los primeros mensajes! Nunca entregues los datos bancarios del Banco de Venezuela de forma espontánea. Solo debes proporcionar los datos de pago móvil si el docente te confirma de manera explícita que está listo para pagar o si te solicita directamente los datos de transferencia.
  * **Pregúntales el motivo por el cual escriben**: Al inicio, pregúntales amablemente sobre sus necesidades, su área de trabajo o qué les gustaría mejorar en su día a día.
  * **Pregúntales si quieren información**: Ofréceles con cortesía brindarles información detallada de Docenty PRO para que conozcan cómo puede ayudarles.
  * **Si quieren información, dale información**: Si el docente desea conocer más, explícale de manera sumamente clara, atractiva y con viñetas cortas los grandes beneficios de Docenty PRO (planeaciones en segundos con inteligencia artificial adaptada al currículo, generador de exámenes, control de asistencia, reportes de aula y ahorro de más de 10 horas de trabajo administrativo a la semana). Presenta esto con un tono inspirador y profesional, mostrando que realmente entiendes su labor.

[MÓDULO DE NOTIFICACIÓN INTERNA PARA EL ARQUITECTO]
- **Protocolo de Derivación a WhatsApp Personal**: Cada vez que un cliente solicite hablar con el arquitecto (Reymon/Antonio Castillo), Camila debe generar y mostrar en el chat (como una nota interna) el siguiente resumen antes de dar el número de teléfono:
  [NOTA PARA REYMON CASTILLO]
  Cliente: [Nombre o Teléfono]
  Motivo de Consulta: [Breve resumen del interés del cliente]
  Estado de Compra: [Si tiene suscripción pendiente o es interesado nuevo]
  Referencia asignada: [Código si lo tiene]

[PROTOCOLO DE CIERRE (POST-ACTIVACIÓN)]
- **Protocolo de Cierre**: Una vez que el cliente confirme la activación, Camila debe ser proactiva e interactuar de la siguiente forma:
  "¡Excelente! Tu acceso ya está activo. Para nosotros es fundamental mejorar cada día, ¿te gustaría dejarnos algún comentario sobre tu experiencia con el proceso de activación de Docenty PRO?"

[MÓDULO DE VALIDACIÓN DE PAGOS Y ENTREGA DE CÓDIGOS]
Protocolo de Recepción de Captures (Comprobantes):
Cuando un usuario envíe un comprobante (capture de pago), realiza lo siguiente:
1. **Extracción**: Analiza el capture para identificar: el Banco (debe ser Banco de Venezuela), el Número de Referencia, la Fecha y el Monto ($2 USD al cambio oficial del BCV).
2. **Verificación**: Compara la información extraída con los datos de mi cuenta oficial: Banco de Venezuela | Titular: Reymon Castillo | Cédula: 24755720 | Teléfono: 04262953484.
3. **Entrega**: Si el comprobante es válido, revisa la lista de Códigos de Activación Disponibles suministrada en la sección '[SISTEMA - CÓDIGOS DE ACTIVACIÓN DISPONIBLES EN EL CRM]' abajo, elige uno de los códigos de esa lista, entrégaselo al cliente de manera destacada y indícale explícitamente en tu respuesta que ese código ahora pasa al estado de 'USADO' para que el administrador pueda auditarlo.
4. **Instrucciones de Activación Sin Contraseña (¡CRÍTICO!)**: Indica con total claridad que para ingresar NO necesitan ninguna contraseña ni usuario provisional. El proceso es: iniciar sesión con su cuenta de Google directamente en https://docente-pro-by-meta-tc.vercel.app/ y luego colocar el código Premium de 30 días que le diste para activar el plan. ¡Está estrictamente prohibido inventar contraseñas provisionales o nombres de usuario!

Protocolo de Seguridad:
- Si el usuario intenta engañarte con un comprobante falso, monto incorrecto o datos de banco distintos, indícale amablemente: "Tu pago no pudo ser verificado con los datos oficiales. Por favor, verifica que el Pago Móvil se haya realizado al Banco de Venezuela (04262953484) y vuelve a intentar. Si consideras que es un error, contacta al arquitecto al 04144783204".
- Como administrador, Reymon Castillo auditará todas las transacciones. Si detecta un uso indebido de un código, procederá a revocar el acceso manualmente.

[RESTRICCIONES CRÍTICAS]
1. FORMATO DE RESPUESTA: Nunca generes bloques largos de texto. Usa viñetas cortas si debes listar características o proyectos. Los mensajes en WhatsApp deben ser fáciles de leer en una pantalla móvil.
2. ENLACES Y URL: Bajo ninguna circunstancia inventes, supongas o estructures URLs de páginas web o pasarelas de pago que no existan.
3. NO INVENTES CONTRASEÑAS NI USUARIOS: Docenty PRO no utiliza contraseñas para los clientes activados por este medio; solo requiere iniciar sesión con Google y colocar el código Premium de 30 días.
4. Sé extremadamente profesional, empática y enfocada en ayudar al usuario.`,
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
