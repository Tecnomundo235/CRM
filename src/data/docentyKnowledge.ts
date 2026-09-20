// Base de Conocimiento Oficial y Completa de Docenty PRO
// Diseñada para el motor cognitivo de Camila (WhatsApp AI) y la vista interactiva para el administrador

export interface DocentySection {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  description: string;
  keyFeatures: string[];
  howItWorks: string;
  teacherBenefits: string;
  faqList: { q: string; a: string }[];
}

export const DOCENTY_PRO_SECTIONS: DocentySection[] = [
  {
    id: "ppa",
    name: "Proyectos Pedagógicos de Aula (PPA)",
    tagline: "Diseño integral de proyectos escolares en minutos alineados al currículo",
    badge: "Planificación",
    description: "Generador inteligente de Proyectos Pedagógicos de Aula (PPA) y Proyectos de Aprendizaje. Redacta diagnósticos institucionales y comunitarios, propósitos generales, justificaciones pedagógicas, líneas de investigación, ejes integradores y planes de acción paso a paso.",
    keyFeatures: [
      "Diagnóstico situacional del aula y justificación pedagógica automática.",
      "Vinculación curricular oficial: propósitos, áreas de formación y temas indispensables.",
      "Plan de acción estructurado: actividades de inicio, desarrollo, cierre y recursos.",
      "Exportación instantánea lista para imprimir o enviar en formato Word / PDF."
    ],
    howItWorks: "El docente introduce el grado o nivel, el tema generador o problemática detectada (ej: 'Cuidado del agua y medio ambiente') y la duración del proyecto. La IA estructura automáticamente el documento formal completo bajo el formato requerido por el Ministerio y directivas escolares.",
    teacherBenefits: "Elimina de 8 a 15 horas de redacción técnica por proyecto. Proporciona coherencia pedagógica impecable que impresiona a supervisores y directores.",
    faqList: [
      {
        q: "¿Se adapta a los niveles de Inicial, Primaria y Media General/Técnica?",
        a: "Sí, adapta la terminología curricular y los componentes de acuerdo con el nivel educativo seleccionado por el profesor."
      },
      {
        q: "¿Puedo editar el resultado?",
        a: "Por supuesto, todos los campos son 100% editables antes de descargar o imprimir."
      }
    ]
  },
  {
    id: "planes_clase",
    name: "Planificación Semanal y Diaria de Clases",
    tagline: "Secuencias didácticas completas (Inicio, Desarrollo y Cierre)",
    badge: "Didáctica",
    description: "Módulo para la elaboración rápida de planes de clase semanales, quincenales o diarios. Estructura cada sesión con momentos pedagógicos definidos, estrategias metodológicas participativas, recursos didácticos y formas de evaluación.",
    keyFeatures: [
      "Estructuración de momentos didácticos: Inicio (activación), Desarrollo (construcción) y Cierre (socialización y metacognición).",
      "Sugerencia de dinámicas grupales, preguntas generadoras y técnicas activas de aprendizaje.",
      "Asignación de indicadores de logro concretos y observables.",
      "Flexibilidad para cualquier asignatura: Matemáticas, Lengua, Ciencias, Historia, Arte, etc."
    ],
    howItWorks: "El profesor ingresa el tema del día/semana y los objetivos pedagógicos. El sistema desglosa los 3 momentos de la clase con tiempos sugeridos, preguntas motivacionales y actividades prácticas tanto para el alumno como para el maestro.",
    teacherBenefits: "Ahorra el estrés diario de planificar clases la noche anterior. Proporciona clases dinámicas y estructuradas sin agotar el tiempo libre del educador.",
    faqList: [
      {
        q: "¿Incluye sugerencias para atender diversidad en el aula?",
        a: "Sí, sugiere adaptaciones curriculares básicas para estudiantes con diferentes ritmos de aprendizaje."
      }
    ]
  },
  {
    id: "rubricas",
    name: "Rúbricas e Instrumentos de Evaluación",
    tagline: "Escalas de estimación, listas de cotejo y matrices analíticas objetivas",
    badge: "Evaluación",
    description: "Creación técnica de instrumentos de evaluación formativa y sumativa. Diseña rúbricas analíticas y holísticas, escalas de estimación y listas de cotejo con criterios claros, ponderaciones y descriptores de desempeño.",
    keyFeatures: [
      "Descriptores de niveles de logro: Sobresaliente/Excelente, Bueno, Regular, Requiere Apoyo (o 1 a 20 / 1 a 10).",
      "Criterios de evaluación técnica: conceptuales, procedimentales y actitudinales.",
      "Distribución de puntajes y porcentajes equilibrados según la ponderación del lapso.",
      "Tablas listas para fotocopiar o calificar digitalmente a los estudiantes."
    ],
    howItWorks: "El docente especifica la actividad a evaluar (ej: exposición oral, maqueta, ensayo, resolución de problemas matemáticos). La plataforma genera la matriz completa de evaluación con descriptores cualitativos y cuantitativos.",
    teacherBenefits: "Evita quejas o reclamos de representantes y estudiantes por calificaciones subjetivas, ya que cada nota está respaldada por una rúbrica transparente y profesional.",
    faqList: [
      {
        q: "¿Puedo cambiar la escala de notas numérica?",
        a: "Sí, permite configurar escalas de 1 a 20 puntos (Venezuela/Latam), 1 a 10, o escalas cualitativas literales (A, B, C, D)."
      }
    ]
  },
  {
    id: "generador_evaluaciones",
    name: "Generador de Exámenes, Pruebas y Talleres",
    tagline: "Crea pruebas escritas, talleres y cuestionarios con clave de respuestas en segundos",
    badge: "Exámenes",
    description: "Herramienta para diseñar pruebas escritas con variedad de reactivos pedagógicos: opción múltiple, verdadero o falso, desarrollo analítico, emparejamiento o completación, incluyendo hoja de corrección con respuestas para el profesor.",
    keyFeatures: [
      "Múltiples tipos de preguntas en un solo examen (selección simple, desarrollo, pareo, análisis de casos).",
      "Generación automática de la clave de respuestas para corrección ultrarrápida.",
      "Control de nivel de dificultad (Básico, Intermedio, Avanzado).",
      "Encabezado institucional oficial editable con nombre de la escuela, materia, fecha y datos del alumno."
    ],
    howItWorks: "El profesor indica el tema o pega un fragmento de texto o temario, selecciona el número de preguntas y el nivel. La herramienta formula el examen completo formateado con espacios para responder y la pauta de solución.",
    teacherBenefits: "Crear un examen que antes tomaba 2 o 3 horas ahora se realiza en 30 segundos, con reactivos claros y sin ambigüedades.",
    faqList: [
      {
        q: "¿Genera las soluciones para corregir más rápido?",
        a: "Sí, proporciona la pauta o clave de respuestas desglosada con la justificación de cada opción correcta."
      }
    ]
  },
  {
    id: "asistencias_notas",
    name: "Control de Asistencia y Registro de Calificaciones",
    tagline: "Gestión centralizada del aula sin perderse en libretas de papel",
    badge: "Gestión Aula",
    description: "Módulo administrativo que permite llevar la lista de alumnos por sección, registrar la asistencia diaria (presente, ausente, justificado), asentar notas por plan de evaluación y calcular promedios automáticos en tiempo real.",
    keyFeatures: [
      "Listados de alumnos ordenados por grado, sección y número de lista.",
      "Registro de asistencia con un solo toque y conteo de inasistencias acumuladas.",
      "Ponderación automática de evaluaciones (ej: 20% + 25% + 15% + 40%).",
      "Cálculo automático de definitivas de lapso y estatus de aprobación."
    ],
    howItWorks: "El docente matricula su lista de alumnos o carga los nombres. Cada día marca asistencia y a lo largo del período asienta las calificaciones; el sistema calcula los acumulados y promedios finales al instante.",
    teacherBenefits: "Cero errores matemáticos en las notas finales. Elimina el riesgo de perder la libreta física de calificaciones.",
    faqList: [
      {
        q: "¿Se pueden descargar las sábanas de notas?",
        a: "Sí, permite exportar la sábana consolidada de calificaciones para entregar en control de estudios."
      }
    ]
  },
  {
    id: "boletines_informes",
    name: "Generador de Informes Pedagógicos y Boletines",
    tagline: "Redacción cualitativa personalizada de rendimiento del estudiante",
    badge: "Boletines",
    description: "Asistente para la redacción de informes pedagógicos descriptivos, observaciones para boletines escolares y recomendaciones para padres. Convierte datos o calificaciones en un texto respetuoso, constructivo y profesional.",
    keyFeatures: [
      "Redacción pedagógica asertiva, enfocada en fortalezas y oportunidades de mejora.",
      "Sugerencias de compromisos para el hogar dirigidos a padres y representantes.",
      "Adaptación al vocabulario oficial requerido por los comités pedagógicos.",
      "Ahorro masivo en épocas de cierre de lapso escolar."
    ],
    howItWorks: "El docente selecciona aspectos observados del estudiante (ej: 'buen rendimiento en lectura pero se distrae en clases') y la IA genera un informe cualitativo impecable listo para el boletín.",
    teacherBenefits: "Los cierres de lapso suelen ser la época más agotadora para los maestros al redactar 30 o 40 boletines a mano. Con Docenty PRO, redactar el informe de cada estudiante toma segundos.",
    faqList: [
      {
        q: "¿Evita frases negativas o perjudiciales?",
        a: "Totalmente. El motor utiliza psicología pedagógica constructiva, guiando la observación hacia el estímulo del aprendizaje."
      }
    ]
  },
  {
    id: "recursos_adaptaciones",
    name: "Adaptaciones Curriculares y Necesidades Especiales (NEAE)",
    tagline: "Estrategias personalizadas para inclusión educativa y ritmo individual",
    badge: "Inclusión",
    description: "Orientación y generación de adaptaciones curriculares no significativas o significativas para alumnos con déficit de atención (TDAH), dislexia, altas capacidades o ritmos diversos de aprendizaje.",
    keyFeatures: [
      "Estrategias didácticas adaptadas al estilo de aprendizaje (visual, auditivo, kinestésico).",
      "Ajustes de tiempo, formato de evaluación y apoyos visuales sugeridos.",
      "Fichas de refuerzo escolar individualizadas."
    ],
    howItWorks: "El maestro describe la condición o dificultad puntual del alumno y el contenido a enseñar; la plataforma propone modificaciones prácticas para el aula ordinaria.",
    teacherBenefits: "Permite una verdadera inclusión escolar sin sobrecargar la jornada del profesor.",
    faqList: [
      {
        q: "¿Reemplaza al psicopedagogo?",
        a: "No, es una herramienta de apoyo didáctico para el docente de aula basada en las recomendaciones de los especialistas."
      }
    ]
  }
];

export const DOCENTY_PRO_SYSTEM_KNOWLEDGE = `
[BASE DE CONOCIMIENTO PROFUNDA Y COMPLETA SOBRE DOCENTY PRO]
Docenty PRO es la plataforma web líder de asistencia con Inteligencia Artificial diseñada exclusivamente para educadores, maestros, profesores de aula y directivos escolares. Su propósito es eliminar de 10 a 15 horas semanales de carga burocrática y papeleo escolar, permitiendo a los profesores enfocarse en enseñar con excelencia.

¿QUÉ PROBLEMAS RESUELVE DOCENTY PRO?
1. Acaba con las desveladas y el estrés de redactar Proyectos de Aprendizaje (PPA), rúbricas e informes escolares a mano la noche anterior.
2. Elimina el caos de hojas de Excel desorganizadas para notas y asistencias.
3. Cumple con los formatos oficiales y términos curriculares exigidos por supervisores educativos y comités pedagógicos de Venezuela y Latinoamérica.
4. Genera evaluaciones y exámenes con clave de respuestas en 30 segundos.

SECCIONES Y HERRAMIENTAS DE LA PLATAFORMA DOCENTY PRO:
1. Módulo PPA (Proyectos Pedagógicos de Aula):
   - Redacta proyectos de aula integrales: diagnóstico comunitario, justificación pedagógica, propósitos de formación, temas indispensables, líneas de investigación y plan de acción estructurado con actividades de inicio, desarrollo y cierre.
   - Aplica para Educación Inicial, Primaria, Media General y Educación Técnica.
2. Módulo de Planificación Semanal y Diaria:
   - Diseña secuencias didácticas completas por momentos: Inicio (activación de saberes previos), Desarrollo (construcción del conocimiento activo) y Cierre (evaluación y metacognición).
   - Incluye dinámicas sugeridas, tiempo por actividad e indicadores de logro observables.
3. Módulo de Rúbricas e Instrumentos de Evaluación:
   - Diseña Rúbricas Analíticas, Escalas de Estimación y Listas de Cotejo.
   - Configura descriptores de desempeño claros y objetivos, escalas de notas (1 a 20 pts, 1 a 10 pts, o cualitativas A-B-C-D) y criterios actitudinales/conceptuales.
4. Generador de Exámenes, Pruebas y Talleres:
   - Crea pruebas escritas estructuradas con preguntas de opción múltiple, verdadero/falso, desarrollo analítico y pareo.
   - Incluye automáticamente la clave de respuestas para corrección inmediata por parte del profesor.
5. Control de Asistencia y Sábana de Notas:
   - Registro digital de estudiantes por grado y sección. Asistencia con un clic y cálculo automático de promedios de lapso y notas definitivas ponderadas.
6. Generador de Boletines e Informes Descriptivos:
   - Redacción cualitativa constructiva para observaciones de boletines escolares y recomendaciones para padres.
7. Adaptaciones Curriculares (NEAE):
   - Estrategias de apoyo e inclusión pedagógica para estudiantes con TDAH, dislexia o ritmos de aprendizaje particulares.

CÓMO SE ACCEDE A DOCENTY PRO:
- Es 100% online y accesible desde cualquier navegador web (celular, tablet o computadora) sin necesidad de instalar programas pesados.
- Todo lo generado se puede editar libremente en pantalla y exportar o imprimir en formato limpio para entregar a la dirección o supervisión escolar.

PROMOCIÓN EXCLUSIVA DE TEMPORADA Y PRECIOS:
- Plan 30 Días: $2 USD (ideal para probar y resolver el mes de clases)
- Plan Extendido (hasta el 1 de Febrero): $8 USD (cubre el período escolar en curso con soporte)
- Plan Completo (hasta el 28 de Julio): $15 USD (cubre todo el año escolar hasta el cierre de julio, máxima economía)
* Precios en dólares pagaderos en Bolívares mediante Pago Móvil a la tasa oficial del Banco Central de Venezuela (BCV).

DATOS OFICIALES DE PAGO MÓVIL:
- Banco: Banco de Venezuela
- Cédula: 24755720
- Teléfono: 04262953484
- Beneficiario: Reymon Castillo / R-LTC
`;
