import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Send,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Key,
  Globe,
  Phone,
  Layers,
  Sparkles,
  Zap,
  Server,
  Terminal,
  Cpu,
  HardDrive,
  Activity,
} from "lucide-react";
import { SystemConfigs } from "../types";

interface MetaCloudApiViewProps {
  config: SystemConfigs;
  onUpdateConfig: (newConfig: Partial<SystemConfigs>) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export const MetaCloudApiView: React.FC<MetaCloudApiViewProps> = ({
  config,
  onUpdateConfig,
  showToast,
}) => {
  const [metaStatus, setMetaStatus] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // DigitalOcean VPS Droplet State (from user screenshot: 165.22.180.160)
  const [vpsIp, setVpsIp] = useState("165.22.180.160");
  const [pingingVps, setPingingVps] = useState(false);
  const [vpsPingResult, setVpsPingResult] = useState<any>(null);

  // Form states for Meta credentials
  const [phoneNumberId, setPhoneNumberId] = useState(
    config.metaConfig?.phoneNumberId || "1221464777727895"
  );
  const [wabaId, setWabaId] = useState(
    config.metaConfig?.wabaId || "2562659904236968"
  );
  const [verifyToken, setVerifyToken] = useState(
    config.metaConfig?.verifyToken || "docenty_pro_secure_verify_2026"
  );
  const [accessToken, setAccessToken] = useState(
    config.metaConfig?.accessToken ||
      "EAAbipQWNwwsBSiKZChy8QdP2dHyK1ztEpIHHonMxHGQlpeDuR66oEAayl4wovF7MfEFKDqr2KHbZBOMbGKZBZAX4Emyt2VLjg9BWQCbDijl5nu8MZBRaaShvJcvaz3Wwdwm3DTwn1Y3ij2UerM3IXlVVFtGZCHQfOzl0RV3Vrs772xFVCaZCjsus1FMv7yOgckBaAZDZD"
  );
  const [businessPhone, setBusinessPhone] = useState(
    config.metaConfig?.businessPhone || "+58 426-2953484"
  );
  const [activeProvider, setActiveProvider] = useState<"meta" | "evolution">(
    config.activeProvider || config.metaConfig?.activeProvider || "meta"
  );
  const [savingConfig, setSavingConfig] = useState(false);

  // Test message state
  const [testPhone, setTestPhone] = useState("584144783204");
  const [testMessage, setTestMessage] = useState(
    "¡Hola! 👋 Te escribo desde la API Oficial de Meta Cloud de Docenty PRO. Conexión directa y verificada."
  );
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhook`
      : "https://docente-pro-by-meta-tc.vercel.app/api/webhook";

  const productionVercelUrl = "https://docente-pro-by-meta-tc.vercel.app/api/webhook";

  // Check connection on load
  useEffect(() => {
    checkConnection();
    handlePingVps();
  }, []);

  const handlePingVps = async () => {
    setPingingVps(true);
    try {
      const res = await fetch(`/api/vps/ping?ip=${encodeURIComponent(vpsIp)}`);
      const data = await res.json();
      setVpsPingResult(data);
    } catch (err: any) {
      setVpsPingResult({ reachable: false, message: "Error al intentar contactar la IP" });
    } finally {
      setPingingVps(false);
    }
  };

  const checkConnection = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch("/api/meta/status");
      const data = await res.json();
      setMetaStatus(data);
      if (data.active) {
        showToast("Conexión con Meta Graph API exitosa", "success");
      }
    } catch (err: any) {
      console.error("Error al consultar estado de Meta:", err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    showToast(`Copiado al portapapeles: ${text}`, "info");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveMetaConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch("/api/meta/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId,
          wabaId,
          verifyToken,
          accessToken,
          businessPhone,
          activeProvider,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onUpdateConfig({
          activeProvider,
          metaConfig: data.metaConfig,
        });
        showToast("Configuración de Meta guardada correctamente", "success");
        checkConnection();
      } else {
        showToast(data.error || "Error al guardar configuración", "error");
      }
    } catch (err: any) {
      showToast("Error de conexión al guardar configuración", "error");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testPhone) {
      showToast("Ingresa un número de teléfono válido", "error");
      return;
    }
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/meta/test-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: testPhone,
          message: testMessage,
        }),
      });
      const data = await res.json();
      setTestResult(data);
      if (res.ok && data.success) {
        showToast("¡Mensaje de prueba enviado con éxito por Meta!", "success");
      } else {
        showToast(data.error || "No se pudo enviar el mensaje por Meta", "error");
      }
    } catch (err: any) {
      showToast("Error de red al enviar mensaje de prueba", "error");
      setTestResult({ success: false, error: err.message });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-teal-950/80 p-6 sm:p-8 rounded-3xl border border-emerald-800/40 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Oficial Meta WhatsApp Cloud API
              </span>
              <span className="bg-zinc-800/80 text-zinc-300 text-xs font-medium px-2.5 py-1 rounded-full">
                Meta for Developers: DocentyPro
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              Infraestructura Oficial de WhatsApp
            </h2>
            <p className="text-zinc-300 text-sm max-w-2xl leading-relaxed">
              Tu aplicación está conectada directamente con los servidores de Meta. Cero riesgo de baneos, máxima velocidad de respuesta y entrega garantizada para todos los clientes de Docenty PRO.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={checkConnection}
              disabled={checkingStatus}
              className="bg-zinc-800/90 hover:bg-zinc-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-zinc-700 transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 text-emerald-400 ${checkingStatus ? "animate-spin" : ""}`} />
              <span>Verificar Estado en Meta</span>
            </button>
            <a
              href="https://developers.facebook.com/apps/2562659904236968/whatsapp-business/wa-dev-console/"
              target="_blank"
              rel="noreferrer"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-950/40"
            >
              <span>Consola de Meta</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="mt-6 pt-5 border-t border-emerald-900/30 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-emerald-900/40">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${metaStatus?.active ? "bg-emerald-400" : "bg-amber-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${metaStatus?.active ? "bg-emerald-500" : "bg-amber-500"}`}></span>
            </span>
            <span className="text-zinc-300 font-medium">
              Estado Meta API:{" "}
              <strong className={metaStatus?.active ? "text-emerald-400" : "text-amber-400"}>
                {metaStatus?.active ? "Operativo y Verificado ✅" : "Pendiente de Token / Verificación ⚠️"}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-300">
            <Phone className="h-3.5 w-3.5 text-teal-400" />
            <span>Línea: <strong>+58 426-2953484</strong></span>
          </div>

          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-300">
            <Layers className="h-3.5 w-3.5 text-teal-400" />
            <span>Proveedor Activo: <strong className="text-teal-400 uppercase">{activeProvider}</strong></span>
          </div>
        </div>

        {/* Diagnostic Banner if Meta is not active */}
        {metaStatus && !metaStatus.active && (
          <div className="mt-4 bg-amber-950/40 border border-amber-500/40 p-4 rounded-2xl flex items-start gap-3 text-amber-200 text-xs leading-relaxed">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-amber-300 block font-semibold">Diagnóstico de Meta Cloud API:</strong>
              <p>{metaStatus.diagnostic || metaStatus.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Credentials & Webhook Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Webhook Configuration for Meta Portal */}
        <div className="bg-[#121212]/90 p-6 rounded-3xl border border-zinc-800/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-950/50 text-emerald-400 rounded-xl border border-emerald-900/40">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-white">
                  Configuración de Webhook en Meta
                </h3>
                <p className="text-xs text-zinc-400">
                  Copia estos valores en tu panel de Meta for Developers
                </p>
              </div>
            </div>
            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-md border border-emerald-500/20">
              Listo para Pegar
            </span>
          </div>

          <div className="space-y-4">
            {/* Callback URL - Preview */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>URL de devolución de llamada (Callback URL - Actual)</span>
                <span className="text-[10px] text-zinc-500 font-normal">GET y POST</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-emerald-300 w-full select-all focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(webhookUrl, "url_local")}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  {copiedField === "url_local" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedField === "url_local" ? "Copiado" : "Copiar"}</span>
                </button>
              </div>
            </div>

            {/* Callback URL - Vercel Production */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>URL de Producción (Vercel)</span>
                <span className="text-[10px] text-teal-400 font-semibold">Recomendado para Vercel</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={productionVercelUrl}
                  className="bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-teal-300 w-full select-all focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(productionVercelUrl, "url_vercel")}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  {copiedField === "url_vercel" ? <Check className="h-4 w-4 text-teal-400" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedField === "url_vercel" ? "Copiado" : "Copiar"}</span>
                </button>
              </div>
            </div>

            {/* Verify Token */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>Identificador de verificación (Verify Token)</span>
                <span className="text-[10px] text-zinc-500 font-normal">Token de enlace</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={verifyToken}
                  className="bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-amber-300 w-full select-all focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(verifyToken, "token")}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  {copiedField === "token" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedField === "token" ? "Copiado" : "Copiar"}</span>
                </button>
              </div>
            </div>

            {/* Instructions box */}
            <div className="bg-zinc-900/70 p-4 rounded-2xl border border-zinc-800 text-xs text-zinc-300 space-y-2">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                Pasos en Meta for Developers (Consola):
              </p>
              <ol className="list-decimal list-inside space-y-1 text-zinc-400 leading-relaxed text-[11px]">
                <li>Entra en <strong>Meta for Developers</strong> a tu app <strong>DocentyPro</strong>.</li>
                <li>Ve al menú izquierdo: <strong>WhatsApp &gt; Configuración</strong>.</li>
                <li>En la tarjeta <strong>Webhooks</strong>, pulsa <strong>Editar</strong>.</li>
                <li>Pega la <strong>URL de devolución de llamada</strong> y el <strong>Identificador de verificación</strong>.</li>
                <li>Pulsa <strong>Verificar y guardar</strong>.</li>
                <li>En <strong>Campos de webhook</strong>, suscríbete al evento <strong>messages</strong>.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Card 2: Meta App Credentials & Access Token */}
        <div className="bg-[#121212]/90 p-6 rounded-3xl border border-zinc-800/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-950/50 text-teal-400 rounded-xl border border-teal-900/40">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-white">
                  Credenciales de Meta Cloud API
                </h3>
                <p className="text-xs text-zinc-400">
                  Identificadores oficiales de tu cuenta comercial
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveProvider(activeProvider === "meta" ? "evolution" : "meta")}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition cursor-pointer border ${
                  activeProvider === "meta"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}
              >
                {activeProvider === "meta" ? "Proveedor: Meta Oficial ✅" : "Proveedor: Evolution API 🔄"}
              </button>
            </div>
          </div>

          <div className="space-y-3.5">
            {/* Phone Number ID */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">
                Identificador de número de teléfono (Phone Number ID)
              </label>
              <input
                type="text"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="122146477727895"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:border-teal-500 focus:outline-hidden"
              />
            </div>

            {/* WABA ID */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">
                ID de la cuenta de WhatsApp Business (WABA ID)
              </label>
              <input
                type="text"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="2562659904236968"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:border-teal-500 focus:outline-hidden"
              />
            </div>

            {/* Business Phone */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">
                Teléfono de la Empresa Registrado en Meta
              </label>
              <input
                type="text"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                placeholder="+58 426-2953484"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:border-teal-500 focus:outline-hidden"
              />
            </div>

            {/* Access Token */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>Token de Acceso Permanente de Meta (System User Token)</span>
                <span className="text-[10px] text-zinc-500 font-normal">O token temporal de 24h</span>
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="EAA..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:border-teal-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-zinc-500">
                Si está vacío, el servidor usará la variable de entorno <code>META_WA_TOKEN</code>.
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveMetaConfig}
                disabled={savingConfig}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-teal-950/40"
              >
                {savingConfig ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>Guardar y Aplicar Configuración de Meta</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DigitalOcean Droplet Card (from user VPS: 165.22.180.160) */}
      <div className="bg-[#121212]/90 p-6 rounded-3xl border border-blue-900/40 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-950/50 text-blue-400 rounded-xl border border-blue-900/40">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base text-white">
                  Servidor VPS DigitalOcean Droplet
                </h3>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  NYC1 • Ubuntu 24.04
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Droplet: <span className="font-mono text-zinc-300">ubuntu-s-1vcpu-512mb-10gb-nyc1</span> (IP: <span className="font-mono text-blue-400 font-semibold">{vpsIp}</span>)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePingVps}
              disabled={pingingVps}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold px-3.5 py-2 rounded-xl border border-zinc-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className={`h-4 w-4 text-blue-400 ${pingingVps ? "animate-spin" : ""}`} />
              <span>{pingingVps ? "Comprobando..." : "Comprobar Conectividad (Ping)"}</span>
            </button>
            <a
              href="https://cloud.digitalocean.com/droplets"
              target="_blank"
              rel="noreferrer"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Consola DigitalOcean</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Droplet Specifications Badge Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 flex items-center gap-2.5">
            <Cpu className="h-4 w-4 text-teal-400 shrink-0" />
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-semibold">Procesador</p>
              <p className="font-bold text-white">1 vCPU (AMD/Intel)</p>
            </div>
          </div>

          <div className="bg-zinc-900/80 p-3 rounded-2xl border border-amber-900/40 flex items-center gap-2.5">
            <HardDrive className="h-4 w-4 text-amber-400 shrink-0" />
            <div>
              <p className="text-[10px] text-amber-400 uppercase font-semibold">Memoria RAM (512 MB)</p>
              <p className="font-bold text-amber-300">¡Requiere 2GB SWAP!</p>
            </div>
          </div>

          <div className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 flex items-center gap-2.5">
            <HardDrive className="h-4 w-4 text-blue-400 shrink-0" />
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-semibold">Almacenamiento</p>
              <p className="font-bold text-white">10 GB SSD NVMe</p>
            </div>
          </div>

          <div className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 flex items-center gap-2.5">
            <Globe className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-semibold">IPv4 Pública</p>
              <p className="font-bold font-mono text-emerald-300">{vpsIp}</p>
            </div>
          </div>
        </div>

        {/* Ping result status */}
        {vpsPingResult && (
          <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
            vpsPingResult.reachable
              ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300"
              : "bg-amber-950/30 border-amber-800/50 text-amber-300"
          }`}>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${vpsPingResult.reachable ? "bg-emerald-400" : "bg-amber-400"}`}></span>
              <span><strong>Estado VPS:</strong> {vpsPingResult.message} ({vpsPingResult.latencyMs ? `${vpsPingResult.latencyMs}ms` : "Sin respuesta HTTP"})</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">IP: {vpsPingResult.ip}</span>
          </div>
        )}

        {/* Essential 512MB RAM Optimization & Setup Commands */}
        <div className="bg-zinc-900/90 p-4 rounded-2xl border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-xs flex items-center gap-2">
              <Terminal className="h-4 w-4 text-blue-400" />
              <span>Comandos de Inicialización Rápida (Pegar en el Web Console de DigitalOcean)</span>
            </h4>
            <span className="text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40 font-semibold">
              Crucial para 512MB RAM
            </span>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Al tener 512MB de RAM, es fundamental activar memoria SWAP virtual antes de ejecutar Node.js o construir paquetes npm para que el sistema operativo no congele los procesos.
          </p>

          <div className="space-y-2">
            {/* Paso 1: SWAP 2GB */}
            <div className="bg-black/60 p-3 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-zinc-300">Paso 1: Crear e iniciar SWAP de 2GB (Evita caídas de memoria)</span>
                <button
                  type="button"
                  onClick={() => handleCopy(
                    "fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab && sysctl vm.swappiness=10",
                    "cmd_swap"
                  )}
                  className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === "cmd_swap" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedField === "cmd_swap" ? "Copiado" : "Copiar Comando"}</span>
                </button>
              </div>
              <code className="text-[11px] font-mono text-amber-300 block select-all break-all">
                fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' &gt;&gt; /etc/fstab
              </code>
            </div>

            {/* Paso 2: Instalar Node 20 & Nginx */}
            <div className="bg-black/60 p-3 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-zinc-300">Paso 2: Instalar Node.js 20, PM2 y Nginx</span>
                <button
                  type="button"
                  onClick={() => handleCopy(
                    "apt update && apt install -y curl nginx git certbot python3-certbot-nginx && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs && npm install -g pm2",
                    "cmd_node"
                  )}
                  className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === "cmd_node" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedField === "cmd_node" ? "Copiado" : "Copiar Comando"}</span>
                </button>
              </div>
              <code className="text-[11px] font-mono text-blue-300 block select-all break-all">
                apt update && apt install -y curl nginx git && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs && npm install -g pm2
              </code>
            </div>

            {/* Paso 3: Script Completo Automatizado */}
            <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-900/40 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-300">Script Automatizado Incluido en el Proyecto</p>
                <p className="text-[10px] text-zinc-400">
                  Hemos generado el archivo <code className="text-emerald-400">deploy-digitalocean.sh</code> en la raíz del proyecto para que configure automáticamente Nginx, Firewall UFW y PM2.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy("bash deploy-digitalocean.sh", "cmd_script")}
                className="text-[10px] bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer shrink-0"
              >
                {copiedField === "cmd_script" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>Copiar Ejecución</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Test Sandbox: Interactive Live Message Tester */}
      <div className="bg-[#121212]/90 p-6 rounded-3xl border border-zinc-800/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-950/50 text-teal-400 rounded-xl border border-teal-900/40">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">
                Probador en Vivo de Mensajes por Meta Cloud API
              </h3>
              <p className="text-xs text-zinc-400">
                Envía un mensaje de prueba oficial para confirmar la comunicación con WhatsApp
              </p>
            </div>
          </div>
          <span className="bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded-lg font-mono">
            Graph API v21.0
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Número de Teléfono Destino (con código de país)
            </label>
            <input
              type="text"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="584144783204"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:border-teal-500 focus:outline-hidden"
            />
            <p className="text-[10px] text-zinc-500">
              Ejemplo: 584144783204 (Reymon Castillo) o cualquier cliente.
            </p>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Mensaje a Enviar por WhatsApp Oficial
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleSendTestMessage}
                disabled={sendingTest}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md shadow-emerald-950/40"
              >
                {sendingTest ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                <span>{sendingTest ? "Enviando..." : "Enviar Prueba"}</span>
              </button>
            </div>
          </div>
        </div>

        {testResult && (
          <div
            className={`p-4 rounded-2xl border text-xs ${
              testResult.success
                ? "bg-emerald-950/30 border-emerald-800/50 text-emerald-300"
                : "bg-rose-950/30 border-rose-800/50 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-400" />
              )}
              <span>
                {testResult.success
                  ? `¡Mensaje enviado exitosamente a +${testResult.target}!`
                  : "Fallo en el envío por Meta Cloud API"}
              </span>
            </div>
            <pre className="text-[10px] font-mono mt-1 opacity-80 overflow-x-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Comparison: Meta Cloud API vs Evolution API */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900/60 p-5 rounded-2xl border border-emerald-800/30 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <ShieldCheck className="h-4 w-4" />
            <span>Ventajas de la API Oficial de Meta</span>
          </div>
          <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
            <li><strong>Cero riesgo de bloqueo:</strong> Autorizado directamente por Meta y WhatsApp Business.</li>
            <li><strong>Latencia mínima:</strong> Conexión nube directa sin depender de emuladores ni QR.</li>
            <li><strong>Alta disponibilidad:</strong> 99.99% uptime garantizado por la infraestructura de Meta.</li>
            <li><strong>Soporte multimedia:</strong> Descarga y envío nativo de capturas de pago y audios.</li>
          </ul>
        </div>

        <div className="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800 space-y-2">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
            <Layers className="h-4 w-4" />
            <span>Respaldo Automático (Fallback)</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Si en algún momento el Token de Meta caduca o hay mantenimiento en los servidores de Facebook, el sistema automáticamente puede alternar a Evolution API (VPS) para garantizar que ningún cliente de Docenty PRO se quede sin atención.
          </p>
        </div>
      </div>
    </div>
  );
};
