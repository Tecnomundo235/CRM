import React, { useState } from "react";
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  FileText,
  Calendar,
  Award,
  HelpCircle,
  Clock,
  Laptop,
  ArrowRight,
  GraduationCap,
  Copy,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { DOCENTY_PRO_SECTIONS, DocentySection } from "../data/docentyKnowledge";

interface DocentyKnowledgeViewProps {
  onGoToChat?: () => void;
  showToast: (msg: string, type: "success" | "info" | "warning") => void;
}

export const DocentyKnowledgeView: React.FC<DocentyKnowledgeViewProps> = ({
  onGoToChat,
  showToast,
}) => {
  const [selectedSection, setSelectedSection] = useState<DocentySection>(DOCENTY_PRO_SECTIONS[0]);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copiado: ${label}`, "success");
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-zinc-900 to-zinc-950 rounded-3xl border border-teal-800/40 p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-teal-500/20 text-teal-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-teal-500/30 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              Base de Conocimiento de Camila AI
            </span>
            <span className="bg-zinc-800 text-zinc-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              7 Secciones Maestras
            </span>
          </div>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
            Enciclopedia Oficial de Docenty PRO
          </h2>
          <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
            Camila conoce al detalle cada herramienta, sección y proceso pedagógico de Docenty PRO. Si un profesor le pregunta por WhatsApp cómo hacer un PPA, cómo evaluar o cómo generar un examen, Camila le brindará asesoría técnica paso a paso.
          </p>
        </div>
      </div>

      {/* Grid of Sections / Features */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left side: Navigation / List of 7 sections */}
        <div className="lg:col-span-4 space-y-2">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-2 mb-3">
            Módulos de la Plataforma ({DOCENTY_PRO_SECTIONS.length})
          </p>
          <div className="space-y-2">
            {DOCENTY_PRO_SECTIONS.map((sec, idx) => {
              const isSelected = selectedSection.id === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => {
                    setSelectedSection(sec);
                    setOpenFaqIndex(null);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? "bg-teal-950/60 border-teal-500 text-white shadow-lg shadow-teal-950/40"
                      : "bg-[#121212]/80 border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:text-white"
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                      isSelected
                        ? "bg-teal-500 text-zinc-950 font-black"
                        : "bg-zinc-800 text-zinc-400 border border-zinc-700/60"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold truncate">{sec.name}</h4>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
                        {sec.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {sec.tagline}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right side: Detailed section card */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-[#121212]/90 rounded-3xl border border-zinc-800/90 p-6 sm:p-7 shadow-sm space-y-6">
            {/* Header of selected section */}
            <div className="border-b border-zinc-800/80 pb-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="bg-teal-900/60 text-teal-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border border-teal-800/60">
                  {selectedSection.badge}
                </span>
                <button
                  onClick={() =>
                    handleCopy(
                      `${selectedSection.name}\n${selectedSection.description}\nBeneficios: ${selectedSection.teacherBenefits}`,
                      selectedSection.name
                    )
                  }
                  className="text-xs text-zinc-400 hover:text-teal-300 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar Info
                </button>
              </div>
              <h3 className="font-display font-bold text-xl sm:text-2xl text-white">
                {selectedSection.name}
              </h3>
              <p className="text-xs sm:text-sm text-teal-400 mt-1 font-medium">
                {selectedSection.tagline}
              </p>
              <p className="text-xs sm:text-sm text-zinc-300 mt-3 leading-relaxed">
                {selectedSection.description}
              </p>
            </div>

            {/* How it works & Key features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-zinc-900/70 p-4 rounded-2xl border border-zinc-800/70 space-y-2">
                <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Laptop className="h-3.5 w-3.5" />
                  ¿Cómo funciona en la plataforma?
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {selectedSection.howItWorks}
                </p>
              </div>

              <div className="bg-zinc-900/70 p-4 rounded-2xl border border-zinc-800/70 space-y-2">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5" />
                  Beneficio directo para el profesor
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {selectedSection.teacherBenefits}
                </p>
              </div>
            </div>

            {/* Key feature list */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Capacidades y Entregables Clave
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedSection.keyFeatures.map((feat, fIdx) => (
                  <div
                    key={fIdx}
                    className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-850 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-zinc-300 leading-snug">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ Accordion */}
            {selectedSection.faqList.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-teal-400" />
                  Preguntas Frecuentes de Profesores sobre este Módulo
                </h4>
                <div className="space-y-2">
                  {selectedSection.faqList.map((faq, qIdx) => {
                    const isOpen = openFaqIndex === qIdx;
                    return (
                      <div
                        key={qIdx}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden"
                      >
                        <button
                          onClick={() => setOpenFaqIndex(isOpen ? null : qIdx)}
                          className="w-full p-3.5 text-left flex items-center justify-between text-xs font-semibold text-zinc-200 hover:text-white transition cursor-pointer"
                        >
                          <span>{faq.q}</span>
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4 text-teal-400 shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-3.5 pb-3.5 pt-1 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/50">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Pricing & Sales Trigger Card */}
          <div className="bg-gradient-to-r from-teal-950/50 via-zinc-900 to-zinc-900 border border-teal-800/50 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-display font-bold text-sm text-white">
                Promoción Exclusiva Docenty PRO
              </h4>
              <p className="text-xs text-zinc-300">
                Plan 30 días: <strong className="text-teal-300">$2</strong> | Hasta 1 Feb: <strong className="text-teal-300">$8</strong> | Año escolar completo (hasta 28 Jul): <strong className="text-teal-300">$15</strong>
              </p>
              <p className="text-[11px] text-zinc-400">
                Pago Móvil Banco de Venezuela • Cédula 24755720 • Tel: 04262953484
              </p>
            </div>
            {onGoToChat && (
              <button
                onClick={onGoToChat}
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs px-5 py-3 rounded-xl transition flex items-center gap-2 shrink-0 cursor-pointer shadow-lg shadow-teal-950/40"
              >
                <span>Ver Chats en Vivo</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
