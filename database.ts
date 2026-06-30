import { MongoClient, Db } from "mongodb";

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
}

export interface BankDetails {
  banco: string;
  cuenta: string;
  beneficiario: string;
}

export interface SystemConfigs {
  botSystemPrompt: string;
  bankDetails: BankDetails;
}

// Initial demo leads
const DEFAULT_LEADS: Lead[] = [
  {
    id: "lead-1",
    name: "Dra. María Gómez",
    phone: "+58 412 123 4567",
    email: "maria.gomez@educacion.edu.ve",
    status: "interested",
    plan: "annual",
    assignedRef: "DOC-PRO-M4G8",
    notes: "Profesora de Primaria en Caracas. Tiene un caos con Excel para registrar la asistencia y notas de 35 alumnos. Interesada en la suscripción premium.",
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    messages: [
      {
        sender: "client",
        text: "Hola, vi su anuncio de Docenty PRO. Enseño en primaria y estoy cansada de llevar todo en plantillas de Excel de asistencia. ¿Esto me puede ayudar?",
        timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
      },
      {
        sender: "bot",
        text: "¡Hola, Dra. María! Un gusto saludarla. 😊 Absolutamente, Docenty PRO fue diseñado precisamente para eliminar ese caos de Excel. \n\nCon nuestra plataforma podrá:\n• Registrar asistencias en dos clics desde cualquier dispositivo.\n• Centralizar calificaciones de forma visual y ordenada.\n• Generar reportes automáticos para padres y directores.\n\n¿Le gustaría automatizar estos reportes y ahorrar hasta 10 horas de trabajo administrativo a la semana? 📊✨",
        timestamp: new Date(Date.now() - 2.9 * 3600000).toISOString(),
      },
      {
        sender: "client",
        text: "Sí, me interesa mucho. ¿Qué costo tiene para mí?",
        timestamp: new Date(Date.now() - 2.8 * 3600000).toISOString(),
      },
      {
        sender: "bot",
        text: "¡Excelente decisión, María! Para profesores individuales, la suscripción de **Docenty PRO** es de solo **2 DÓLARES** al año, cobrados estrictamente en Bolívares (Bs.) calculados al cambio oficial del Banco Central de Venezuela (BCV).\n\nPara adquirir el plan, puede realizar un Pago Móvil a nuestros datos:\n\n🏦 **Banco de Venezuela**\n• Teléfono: **04262953484**\n• Cédula: **24755720**\n• Concepto/Referencia: **DOC-PRO-M4G8** (Muy importante para la confirmación de su cuenta).\n\nUna vez realizado, solo envíeme por aquí una captura de pantalla o comprobante de su Pago Móvil y nuestro sistema inteligente activará su cuenta de inmediato. ¿Le parece bien? 👍💼",
        timestamp: new Date(Date.now() - 2.7 * 3600000).toISOString(),
      },
    ],
  },
  {
    id: "lead-2",
    name: "Prof. Carlos Ruiz",
    phone: "+58 414 765 4321",
    email: "carlos.ruiz@colegio.edu.ve",
    status: "prospect",
    plan: "annual",
    assignedRef: "DOC-PRO-C9R2",
    notes: "Profesor de Física en bachillerato en Maracaibo. Preocupado por la creación de exámenes y planeaciones didácticas. Quiere saber si la IA lo ayuda con eso.",
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    messages: [
      {
        sender: "client",
        text: "Buenas tardes, ¿Docenty PRO me sirve para armar exámenes de Física? Es lo que más tiempo me quita los fines de semana.",
        timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
      },
      {
        sender: "bot",
        text: "¡Buenas tardes, Profesor Carlos! Qué gusto conversar con usted. 🧪 ¡Por supuesto que sí! Docenty PRO tiene un generador automático de material didáctico y exámenes impulsado por Inteligencia Artificial.\n\nSolo tiene que indicar el tema (por ejemplo, 'Leyes de Newton' o 'Termodinámica'), el nivel de sus alumnos y el tipo de preguntas que desea (opción múltiple, desarrollo, etc.). La plataforma le creará un examen estructurado y su rúbrica de calificación en segundos. ⚡\n\n¿Se imagina recuperar sus fines de semana libres?",
        timestamp: new Date(Date.now() - 4.9 * 3600000).toISOString(),
      },
    ],
  },
  {
    id: "lead-3",
    name: "Prof. Ana Beltrán",
    phone: "+58 416 987 6543",
    email: "ana.beltran@academia.edu.ve",
    status: "payment_sent",
    plan: "annual",
    assignedRef: "DOC-PRO-A3B9",
    notes: "Enseña Historia en Valencia. Muy interesada, ya realizó el Pago Móvil pero falta su comprobación de referencia en la captura.",
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    messages: [
      {
        sender: "client",
        text: "Hola, ya realicé el Pago Móvil para el plan de $2. Aquí está mi comprobante.",
        timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),
      },
      {
        sender: "client",
        text: "[Captura de pantalla de Pago Móvil, Referencia: DOC-PRO-A3B9]",
        timestamp: new Date(Date.now() - 0.9 * 3600000).toISOString(),
        isReceipt: true,
        receiptData: {
          isValid: true,
          status: "PENDING",
          monto: "$2.00 USD (en Bs. BCV)",
          referencia: "DOC-PRO-A3B9",
          banco: "Banco de Venezuela",
          fecha: "2026-06-24",
          analisis: "Comprobante de Pago Móvil recibido. Esperando validación de imagen automática por la IA de Camila.",
        },
      },
    ],
  },
  {
    id: "lead-4",
    name: "Prof. Jorge Herrera",
    phone: "+58 424 555 4444",
    email: "jorge.herrera@escuela.edu.ve",
    status: "approved",
    plan: "annual",
    assignedRef: "DOC-PRO-J8H4",
    notes: "Adquirió la suscripción de $2 USD por Pago Móvil. Aprobado automáticamente y súper contento con la plataforma.",
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    messages: [
      {
        sender: "client",
        text: "Hola, quiero probar el plan de 2 dólares por Pago Móvil para ver cómo me va.",
        timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
      },
      {
        sender: "bot",
        text: "¡Hola Jorge! Excelente elección para probar. 😊 Los datos para realizar tu Pago Móvil de $2 USD (al cambio oficial de la tasa BCV del día) son:\n🏦 **Banco de Venezuela**\n• Teléfono: **04262953484**\n• Cédula: **24755720**\n• Referencia: **DOC-PRO-J8H4**\n\nEn cuanto realices tu Pago Móvil envíame la captura de pantalla por aquí para activarte de inmediato.",
        timestamp: new Date(Date.now() - 2.8 * 3600000).toISOString(),
      },
      {
        sender: "client",
        text: "Listo, pago móvil enviado. Te paso el comprobante.",
        timestamp: new Date(Date.now() - 2.5 * 3600000).toISOString(),
      },
      {
        sender: "client",
        text: "[Recibo aprobado: DOC-PRO-J8H4]",
        timestamp: new Date(Date.now() - 2.4 * 3600000).toISOString(),
        isReceipt: true,
        receiptData: {
          isValid: true,
          status: "APPROVED",
          monto: "$2.00 USD (en Bs. BCV)",
          referencia: "DOC-PRO-J8H4",
          banco: "Banco de Venezuela",
          fecha: "2026-06-24",
          analisis: "Pago Móvil validado exitosamente. Se encontró concordancia exacta con la referencia DOC-PRO-J8H4 asignada al cliente.",
        },
      },
      {
        sender: "bot",
        text: "🎉 **¡PAGO CONFIRMADO CON ÉXITO!** 🎉\n\nProfesor Jorge, he validado su comprobante de inmediato con la referencia **DOC-PRO-J8H4**.\n\nHemos creado su cuenta premium en Docenty PRO.\n\n🔑 **Datos de acceso:**\n• **Plataforma:** https://app.docenty.pro\n• **Usuario:** jorge.herrera@escuela.edu.ve\n• **Contraseña temporal:** Docenty2026!\n\n¡Bienvenido a la nueva era de la educación sin papeleo! Si tiene alguna otra duda, estaré aquí para asistirle por WhatsApp 🤖📚",
        timestamp: new Date(Date.now() - 2.3 * 3600000).toISOString(),
      },
    ],
  },
];

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
- **Saludo Inicial**: Cuando un usuario inicie la conversación o salude por primera vez, utiliza siempre este saludo exacto con tono sumamente amable:
  "¡Hola! ¿Cómo estás? Es un gusto saludarte. Soy Camila, la asistente virtual de META TC. Me dedico a ayudar a los docentes a simplificar su carga administrativa y a potenciar proyectos digitales con inteligencia artificial. ¿Te gustaría que te brinde información sobre Docenty PRO o ya estás listo para realizar tu activación hoy mismo? ¡Estoy aquí para ayudarte en lo que necesites!"
- **Reglas de Tono**:
  * Sé cálida y paciente, no apresures al usuario con los datos de pago en el primer mensaje.
  * Si el usuario muestra dudas o preguntas, primero explica de manera clara y profesional los beneficios de Docenty PRO (automatización de notas, asistencia, reportes rápidos, etc.) antes de mencionar el proceso de pago.
  * Mantén la profesionalidad en todo momento, pero con una cercanía y calidez humana que invite a continuar con la conversación.

[MÓDULO DE VALIDACIÓN DE PAGOS Y ENTREGA DE CÓDIGOS]
Protocolo de Recepción de Captures (Comprobantes):
Cuando un usuario envíe un comprobante (capture de pago), realiza lo siguiente:
1. **Extracción**: Analiza el capture para identificar: el Banco (debe ser Banco de Venezuela), el Número de Referencia, la Fecha y el Monto ($2 USD al cambio oficial del BCV).
2. **Verificación**: Compara la información extraída con los datos de mi cuenta oficial: Banco de Venezuela | Titular: Reymon Castillo | Cédula: 24755720 | Teléfono: 04262953484.
3. **Entrega**: Si el comprobante es válido, revisa la siguiente lista de Códigos de Activación Disponibles, elige uno que esté DISPONIBLE, entrégaselo al cliente de manera destacada y indícale explícitamente en tu respuesta que ese código ahora pasa al estado de "USADO" para que el administrador pueda auditarlo.

Códigos de Activación Disponibles (Actualizar constantemente):
- CÓDIGO: [META-ZLKN-25C8] | ESTADO: DISPONIBLE
- CÓDIGO: [META-D39K-U161] | ESTADO: DISPONIBLE
- CÓDIGO: [META-5SLA-X73P] | ESTADO: DISPONIBLE
- CÓDIGO: [META-H92Z-6KU3] | ESTADO: DISPONIBLE

Protocolo de Seguridad:
- Si el usuario intenta engañarte con un comprobante falso, monto incorrecto o datos de banco distintos, indícale amablemente: "Tu pago no pudo ser verificado con los datos oficiales. Por favor, verifica que el Pago Móvil se haya realizado al Banco de Venezuela (04262953484) y vuelve a intentar. Si consideras que es un error, contacta al arquitecto al 04144783204".
- Como administrador, Reymon Castillo auditará todas las transacciones. Si detecta un uso indebido de un código, procederá a revocar el acceso manualmente.

[RESTRICCIONES CRÍTICAS]
1. FORMATO DE RESPUESTA: Nunca generes bloques largos de texto. Usa viñetas cortas si debes listar características o proyectos. Los mensajes en WhatsApp deben ser fáciles de leer en una pantalla móvil.
2. ENLACES Y URL: Bajo ninguna circunstancia inventes, supongas o estructures URLs de páginas web o pasarelas de pago que no existan.
3. Sé extremadamente profesional, empática y enfocada en ayudar al usuario.`,
  bankDetails: {
    banco: "Banco de Venezuela",
    cuenta: "04262953484",
    beneficiario: "24755720",
  },
};

// In-Memory Fallback State (will be used if MONGODB_URI is not set)
let localLeadsStore: Lead[] = [...DEFAULT_LEADS];
let localConfigStore: SystemConfigs = { ...DEFAULT_CONFIG };

// Database connection helper
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
const MONGODB_URI = process.env.MONGODB_URI || "";

export async function initDatabase(): Promise<boolean> {
  if (!MONGODB_URI) {
    console.log("No MONGODB_URI environment variable detected. Running in-memory mode.");
    return false;
  }

  try {
    console.log("Connecting to MongoDB Atlas...");
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    mongoDb = mongoClient.db("docenty_crm");
    console.log("Connected to MongoDB successfully!");
    
    // Seed database if it's empty
    const leadsCollection = mongoDb.collection("leads");
    const count = await leadsCollection.countDocuments();
    if (count === 0) {
      console.log("Seeding initial demo leads into MongoDB...");
      await leadsCollection.insertMany(DEFAULT_LEADS);
    }

    const configCollection = mongoDb.collection("configs");
    const configCount = await configCollection.countDocuments();
    if (configCount === 0) {
      console.log("Seeding initial system config into MongoDB...");
      await configCollection.insertOne({ _id: "system_config" as any, ...DEFAULT_CONFIG });
    }

    return true;
  } catch (error) {
    console.error("Failed to connect to MongoDB. Falling back to local in-memory storage.", error);
    mongoClient = null;
    mongoDb = null;
    return false;
  }
}

// Leads DAO functions
export async function getAllLeads(): Promise<Lead[]> {
  if (mongoDb) {
    try {
      const leadsCollection = mongoDb.collection("leads");
      const list = await leadsCollection.find({}).sort({ createdAt: -1 }).toArray();
      // Remove mongo _id to match Lead interface cleanly
      return list.map((item) => {
        const { _id, ...leadData } = item;
        return leadData as Lead;
      });
    } catch (e) {
      console.error("MongoDB error fetching leads, falling back", e);
    }
  }
  return [...localLeadsStore];
}

export async function createLead(lead: Lead): Promise<Lead> {
  if (mongoDb) {
    try {
      const leadsCollection = mongoDb.collection("leads");
      await leadsCollection.insertOne({ ...lead });
      return lead;
    } catch (e) {
      console.error("MongoDB error saving new lead", e);
    }
  }
  localLeadsStore.unshift(lead);
  return lead;
}

export async function updateLead(lead: Lead): Promise<Lead> {
  if (mongoDb) {
    try {
      const leadsCollection = mongoDb.collection("leads");
      await leadsCollection.updateOne({ id: lead.id }, { $set: { ...lead } });
      return lead;
    } catch (e) {
      console.error("MongoDB error updating lead", e);
    }
  }
  localLeadsStore = localLeadsStore.map((l) => (l.id === lead.id ? lead : l));
  return lead;
}

export async function deleteLead(id: string): Promise<boolean> {
  if (mongoDb) {
    try {
      const leadsCollection = mongoDb.collection("leads");
      const result = await leadsCollection.deleteOne({ id });
      return result.deletedCount > 0;
    } catch (e) {
      console.error("MongoDB error deleting lead", e);
    }
  }
  const originalLength = localLeadsStore.length;
  localLeadsStore = localLeadsStore.filter((l) => l.id !== id);
  return localLeadsStore.length < originalLength;
}

export async function resetDatabase(): Promise<Lead[]> {
  if (mongoDb) {
    try {
      const leadsCollection = mongoDb.collection("leads");
      await leadsCollection.deleteMany({});
      await leadsCollection.insertMany(DEFAULT_LEADS);
      
      const configCollection = mongoDb.collection("configs");
      await configCollection.deleteMany({});
      await configCollection.insertOne({ _id: "system_config" as any, ...DEFAULT_CONFIG });
      
      return DEFAULT_LEADS;
    } catch (e) {
      console.error("MongoDB error resetting database", e);
    }
  }
  localLeadsStore = [...DEFAULT_LEADS];
  localConfigStore = { ...DEFAULT_CONFIG };
  return localLeadsStore;
}

// Configs DAO functions
export async function getSystemConfigs(): Promise<SystemConfigs> {
  if (mongoDb) {
    try {
      const configCollection = mongoDb.collection("configs");
      const doc = await configCollection.findOne({ _id: "system_config" as any });
      if (doc) {
        const { _id, ...configData } = doc;
        return configData as SystemConfigs;
      }
    } catch (e) {
      console.error("MongoDB error getting system config", e);
    }
  }
  return { ...localConfigStore };
}

export async function saveSystemConfigs(configs: SystemConfigs): Promise<SystemConfigs> {
  if (mongoDb) {
    try {
      const configCollection = mongoDb.collection("configs");
      await configCollection.updateOne(
        { _id: "system_config" as any },
        { $set: { ...configs } },
        { upsert: true }
      );
      return configs;
    } catch (e) {
      console.error("MongoDB error updating system config", e);
    }
  }
  localConfigStore = { ...configs };
  return localConfigStore;
}
