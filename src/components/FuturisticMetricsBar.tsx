import React from "react";
import {
  Users,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  Sparkles,
  Zap,
  Video,
  Radio,
  Flame,
  ArrowUpRight,
} from "lucide-react";
import { motion } from "motion/react";

interface FuturisticMetricsBarProps {
  totalLeads: number;
  activeSubscribers: number;
  pendingPayments: number;
  potentialArr: number;
  conversionRate: number;
  socialReelMode: boolean;
  onToggleSocialReelMode: () => void;
}

export const FuturisticMetricsBar: React.FC<FuturisticMetricsBarProps> = ({
  totalLeads,
  activeSubscribers,
  pendingPayments,
  potentialArr,
  conversionRate,
  socialReelMode,
  onToggleSocialReelMode,
}) => {
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Top Cyber Status & Reel Mode Switch */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[11px] font-mono font-semibold tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            <span className="uppercase">Docenty AI • Piloto Automático Activo</span>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-mono text-zinc-500">
            // TELEMETRÍA EN VIVO
          </span>
        </div>

        {/* Video / Social Creator recording mode switch */}
        <button
          onClick={onToggleSocialReelMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer border ${
            socialReelMode
              ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-black border-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.4)] animate-pulse"
              : "bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border-zinc-800 hover:border-zinc-700"
          }`}
          title="Modo pantalla para grabar videos de redes sociales (TikTok, Reels, Shorts)"
        >
          <Video className="h-3.5 w-3.5" />
          <span>{socialReelMode ? "🔴 Modo Grabación ON" : "Modo Video Redes"}</span>
        </button>
      </div>

      {/* Dynamic Ticker Tape when Reel Mode is Active (High Impact for Mobile Recordings) */}
      {socialReelMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden rounded-xl bg-gradient-to-r from-teal-950/80 via-zinc-900/90 to-emerald-950/80 border border-teal-500/40 p-2 text-xs font-mono text-teal-300 shadow-[0_0_25px_rgba(13,148,136,0.25)] flex items-center gap-2"
        >
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px] font-bold shrink-0">
            <Radio className="h-3 w-3 animate-spin" />
            FEED VIVO
          </div>
          <div className="overflow-x-auto whitespace-nowrap scrollbar-none flex gap-6 text-[11px] font-medium text-zinc-200">
            <span className="flex items-center gap-1 text-emerald-400">
              <Zap className="h-3 w-3" /> Auto-cierre con Camila: +${potentialArr} USD facturados
            </span>
            <span className="text-zinc-500">•</span>
            <span className="flex items-center gap-1 text-teal-300">
              <Flame className="h-3 w-3" /> Conversión: {conversionRate}% con IA Vision OCR
            </span>
            <span className="text-zinc-500">•</span>
            <span className="flex items-center gap-1 text-amber-300">
              <Sparkles className="h-3 w-3" /> Meta Cloud API Oficial +58 426-2953484
            </span>
          </div>
        </motion.div>
      )}

      {/* Futuristic Metric Cards Grid (Mobile Horizontal Carousel / Responsive Bento) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        {/* Card 1: ARR / Recurrente */}
        <div className={`cyber-card relative overflow-hidden rounded-2xl p-3.5 sm:p-4 transition-all duration-300 ${
          socialReelMode ? "border-teal-500/50 shadow-[0_0_25px_rgba(13,148,136,0.2)]" : ""
        }`}>
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-teal-500 via-emerald-400 to-transparent"></div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
              Ingresos ARR
            </span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight">
              ${potentialArr}
            </span>
            <span className="text-[10px] font-mono text-teal-400 font-bold">USD</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-emerald-400">
            <ArrowUpRight className="h-3 w-3" />
            <span>Cobros validados</span>
          </div>
        </div>

        {/* Card 2: Total Leads */}
        <div className="cyber-card relative overflow-hidden rounded-2xl p-3.5 sm:p-4 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-transparent"></div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
              Leads Totales
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight">
              {totalLeads}
            </span>
            <span className="text-[10px] font-mono text-zinc-400">docentes</span>
          </div>
          <div className="mt-2 text-[10px] text-zinc-400 truncate">
            {activeSubscribers} premium • {totalLeads - activeSubscribers} embudo
          </div>
        </div>

        {/* Card 3: Conversion Rate */}
        <div className="cyber-card relative overflow-hidden rounded-2xl p-3.5 sm:p-4 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-transparent"></div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
              Tasa de Cierre
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-display font-extrabold text-emerald-400 tracking-tight">
              {conversionRate}%
            </span>
            <span className="text-[10px] font-mono text-emerald-500 font-bold">IA</span>
          </div>
          {/* Visual Mini Progress Bar */}
          <div className="mt-2 w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(conversionRate, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Card 4: Activos Premium */}
        <div className="cyber-card relative overflow-hidden rounded-2xl p-3.5 sm:p-4 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-teal-400 to-transparent"></div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
              Premium Act.
            </span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-display font-extrabold text-teal-400 tracking-tight">
              {activeSubscribers}
            </span>
            <span className="text-[10px] font-mono text-zinc-400">cuentas</span>
          </div>
          <div className="mt-2 text-[10px] text-teal-300/80 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400 inline-block"></span>
            <span>Claves activadas</span>
          </div>
        </div>

        {/* Card 5: Pendientes de Validación (Pulsing if > 0) */}
        <div className={`col-span-2 sm:col-span-1 cyber-card relative overflow-hidden rounded-2xl p-3.5 sm:p-4 transition-all duration-300 ${
          pendingPayments > 0
            ? "border-amber-500/40 bg-gradient-to-br from-amber-950/20 to-zinc-900/90 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
            : ""
        }`}>
          <div className={`absolute top-0 left-0 right-0 h-[2px] ${
            pendingPayments > 0 ? "bg-gradient-to-r from-amber-400 to-orange-400 animate-pulse" : "bg-zinc-700"
          }`}></div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
              Por Validar
            </span>
            <div className={`p-1.5 rounded-lg border ${
              pendingPayments > 0
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse"
                : "bg-zinc-800/40 text-zinc-500 border-zinc-700/40"
            }`}>
              <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl sm:text-2xl font-display font-extrabold tracking-tight ${
              pendingPayments > 0 ? "text-amber-400" : "text-zinc-400"
            }`}>
              {pendingPayments}
            </span>
            <span className="text-[10px] font-mono text-zinc-400">comprobantes</span>
          </div>
          <div className="mt-2 text-[10px] text-zinc-400">
            {pendingPayments > 0 ? (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block animate-ping"></span>
                Revisión requerida
              </span>
            ) : (
              <span className="text-zinc-500">Al día sin pendientes</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
