import React, { useState } from "react";
import {
  X,
  User,
  Phone,
  Mail,
  Copy,
  Check,
  CreditCard,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  Clock,
  ExternalLink,
  CircleCheck,
  BookOpen,
} from "lucide-react";
import { motion } from "motion/react";
import { Lead } from "../types";

interface MobileLeadDetailDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onGoToChat: (leadId: string) => void;
  onApprovePayment: (leadId: string) => void;
  onSimulateReceipt: (lead: Lead) => void;
  approvingLeadId: string | null;
}

export const MobileLeadDetailDrawer: React.FC<MobileLeadDetailDrawerProps> = ({
  lead,
  onClose,
  onGoToChat,
  onApprovePayment,
  onSimulateReceipt,
  approvingLeadId,
}) => {
  if (!lead) return null;

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 280 }}
        className="w-full max-w-lg bg-[#0e1117] border-t sm:border border-zinc-800/90 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4 text-white relative"
      >
        {/* Drag handle for mobile gesture aesthetic */}
        <div className="w-12 h-1.5 bg-zinc-700/80 rounded-full mx-auto mb-2 sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-zinc-900 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold text-lg font-display">
              {lead.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base text-white">{lead.name}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 font-bold uppercase">
                  Docenty PRO
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">{lead.phone}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lead Identity Badges & Ref */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-3">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">
              Código Asignado
            </span>
            <div className="flex items-center justify-between">
              <code className="text-xs font-mono font-bold text-teal-400">{lead.assignedRef}</code>
              <button
                onClick={() => copyToClipboard(lead.assignedRef, "ref")}
                className="text-zinc-500 hover:text-teal-400 p-1 transition cursor-pointer"
              >
                {copiedField === "ref" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-3">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">
              Estado Actual
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
              lead.status === "approved"
                ? "text-emerald-400 bg-emerald-500/10"
                : lead.status === "payment_sent"
                ? "text-amber-400 bg-amber-500/10"
                : "text-teal-400 bg-teal-500/10"
            }`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {lead.status === "approved" ? "Activo Premium" : lead.status === "payment_sent" ? "Pago Recibido" : "En Embudo"}
            </span>
          </div>
        </div>

        {/* Pain points / Notes */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-1.5">
          <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-teal-400" />
            <span>Perfil & Necesidades del Docente</span>
          </h4>
          <p className="text-xs text-zinc-400 leading-relaxed italic">
            {lead.notes || "Sin notas registradas. El cliente interactúa activamente con el agente Camila en WhatsApp."}
          </p>
        </div>

        {/* Conversation stats */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <MessageSquare className="h-4 w-4 text-teal-400" />
            <span>Mensajes en chat: <strong className="text-white font-mono">{lead.messages.length}</strong></span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            {lead.isPaused ? "⚠️ Modo Humano (IA Pausada)" : "🤖 Camila IA Activa"}
          </span>
        </div>

        {/* Quick action buttons for demo video / social presentation */}
        <div className="space-y-2 pt-2 border-t border-zinc-800/80">
          <button
            onClick={() => {
              onClose();
              onGoToChat(lead.id);
            }}
            className="w-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-teal-950/50 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Abrir Conversación WhatsApp en Vivo</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onClose();
                onSimulateReceipt(lead);
              }}
              className="bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 font-semibold text-xs py-2.5 rounded-xl border border-zinc-700/60 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CreditCard className="h-3.5 w-3.5 text-teal-400" />
              <span>Simular Pago</span>
            </button>

            {lead.status !== "approved" ? (
              <button
                onClick={() => {
                  onApprovePayment(lead.id);
                  onClose();
                }}
                disabled={approvingLeadId === lead.id}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40"
              >
                <CircleCheck className="h-3.5 w-3.5" />
                <span>Aprobar Cuenta</span>
              </button>
            ) : (
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-center justify-center gap-1.5 text-xs text-emerald-300 font-semibold py-2.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Plan Verificado</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
