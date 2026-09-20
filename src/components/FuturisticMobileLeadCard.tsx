import React, { useState } from "react";
import {
  MessageCircle,
  CircleCheck,
  Trash2,
  Copy,
  Check,
  CreditCard,
  Sparkles,
  ChevronRight,
  Clock,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { Lead } from "../types";

interface FuturisticMobileLeadCardProps {
  lead: Lead;
  onSelectLead: (leadId: string) => void;
  onApprovePayment: (leadId: string) => void;
  onDeleteLead: (leadId: string, e: React.MouseEvent) => void;
  onOpenDetails: (lead: Lead) => void;
  approvingLeadId: string | null;
}

export const FuturisticMobileLeadCard: React.FC<FuturisticMobileLeadCardProps> = ({
  lead,
  onSelectLead,
  onApprovePayment,
  onDeleteLead,
  onOpenDetails,
  approvingLeadId,
}) => {
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const lastMsg = lead.messages && lead.messages.length > 0 
    ? lead.messages[lead.messages.length - 1] 
    : null;

  const handleCopy = (text: string, type: "ref" | "phone", e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    if (type === "ref") {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  // Status configuration
  const statusStyles = {
    approved: {
      bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
      dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
      label: "Activo Premium",
      icon: ShieldCheck,
    },
    payment_sent: {
      bg: "bg-amber-500/15 border-amber-500/30 text-amber-300 animate-pulse",
      dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]",
      label: "Pago Recibido",
      icon: CreditCard,
    },
    interested: {
      bg: "bg-teal-500/15 border-teal-500/30 text-teal-300",
      dot: "bg-teal-400",
      label: "Interesado",
      icon: Sparkles,
    },
    prospect: {
      bg: "bg-zinc-800/60 border-zinc-700/50 text-zinc-400",
      dot: "bg-zinc-500",
      label: "Prospecto",
      icon: Clock,
    },
    expired: {
      bg: "bg-rose-500/15 border-rose-500/30 text-rose-300",
      dot: "bg-rose-400",
      label: "Vencido",
      icon: Clock,
    },
  };

  const statusConfig = statusStyles[lead.status] || statusStyles.prospect;
  const StatusIcon = statusConfig.icon;

  return (
    <div
      onClick={() => onSelectLead(lead.id)}
      className={`cyber-card rounded-2xl p-4 transition-all duration-300 relative overflow-hidden group active:scale-[0.99] cursor-pointer ${
        lead.status === "payment_sent" 
          ? "border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.12)]" 
          : lead.status === "approved"
          ? "border-emerald-500/30"
          : "hover:border-teal-500/30"
      }`}
    >
      {/* Top Accent Line */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${
        lead.status === "approved"
          ? "bg-gradient-to-r from-emerald-500 to-teal-400"
          : lead.status === "payment_sent"
          ? "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 animate-pulse"
          : "bg-gradient-to-r from-teal-500/50 to-transparent"
      }`} />

      {/* Card Header: Avatar, Name, Phone & Status Badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar with Glow Ring */}
          <div className="relative shrink-0">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/80 flex items-center justify-center text-teal-300 font-bold text-sm shadow-md uppercase font-display">
              {lead.name.substring(0, 2)}
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#09090b] ${statusConfig.dot}`} />
          </div>

          <div className="min-w-0">
            <h4 className="font-display font-bold text-sm text-white truncate group-hover:text-teal-300 transition">
              {lead.name}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
              <span className="font-mono text-[11px] text-zinc-300">{lead.phone}</span>
              <button
                type="button"
                onClick={(e) => handleCopy(lead.phone, "phone", e)}
                className="p-1 hover:text-teal-300 text-zinc-500 transition cursor-pointer"
                title="Copiar número"
              >
                {copiedPhone ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Status Pill Badge */}
        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 shrink-0 ${statusConfig.bg}`}>
          <StatusIcon className="h-3 w-3" />
          <span>{statusConfig.label}</span>
        </div>
      </div>

      {/* Plan & Assigned Code Row */}
      <div className="flex items-center justify-between bg-zinc-950/60 border border-zinc-800/80 rounded-xl px-3 py-2 text-xs mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-mono text-zinc-500 font-bold">Ref:</span>
          <code className="text-[11px] font-mono font-bold text-teal-400 bg-teal-950/50 border border-teal-800/40 px-1.5 py-0.5 rounded">
            {lead.assignedRef}
          </code>
          <button
            type="button"
            onClick={(e) => handleCopy(lead.assignedRef, "ref", e)}
            className="text-zinc-500 hover:text-teal-400 transition cursor-pointer p-0.5"
            title="Copiar código para comprobante"
          >
            {copiedRef ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>

        <div className="text-[11px] font-medium text-zinc-300 flex items-center gap-1">
          <span className="text-teal-400 font-bold">Docenty PRO</span>
          <span className="text-zinc-500">($2 USD)</span>
        </div>
      </div>

      {/* Last Message Bubble Preview */}
      {lastMsg ? (
        <div className="bg-zinc-900/60 border border-zinc-800/60 p-2.5 rounded-xl text-xs text-zinc-300 mb-3 flex items-start gap-2">
          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded shrink-0 font-mono ${
            lastMsg.sender === "bot"
              ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
              : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
          }`}>
            {lastMsg.sender === "bot" ? "Camila IA" : "Docente"}
          </span>
          <p className="truncate text-zinc-300 text-xs flex-1">
            {lastMsg.text}
          </p>
        </div>
      ) : (
        <div className="text-xs text-zinc-500 italic mb-3 flex items-center gap-1.5 px-1">
          <Clock className="h-3.5 w-3.5" />
          <span>Sin mensajes registrados todavía</span>
        </div>
      )}

      {/* Interactive Quick Actions Bar for Mobile (Ergonomic Touch Targets) */}
      <div
        className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          {/* Quick detail sheet trigger */}
          <button
            type="button"
            onClick={() => onOpenDetails(lead)}
            className="text-[11px] font-medium text-zinc-400 hover:text-white px-2.5 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 transition flex items-center gap-1 cursor-pointer"
            title="Ver ficha completa y notas"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Ficha</span>
          </button>

          {/* Delete button */}
          <button
            type="button"
            onClick={(e) => onDeleteLead(lead.id, e)}
            className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition cursor-pointer"
            title="Eliminar lead"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Approve Button (If pending or not approved) */}
          {lead.status !== "approved" && (
            <button
              type="button"
              onClick={() => onApprovePayment(lead.id)}
              disabled={approvingLeadId === lead.id}
              className={`text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md disabled:opacity-50 ${
                lead.status === "payment_sent"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse"
                  : "bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/50"
              }`}
              title="Aprobar pago de $2 USD"
            >
              <CircleCheck className="h-3.5 w-3.5" />
              <span>{approvingLeadId === lead.id ? "Aprobando..." : "Aprobar"}</span>
            </button>
          )}

          {/* Chat Button */}
          <button
            type="button"
            onClick={() => onSelectLead(lead.id)}
            className="bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-teal-950/50"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>Chat WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
