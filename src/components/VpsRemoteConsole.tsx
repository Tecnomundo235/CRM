import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Server,
  Key,
  Lock,
  Copy,
  Check,
  Eye,
  EyeOff,
  Power,
  HardDrive,
  Cpu,
  Activity,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface VpsRemoteConsoleProps {
  defaultIp?: string;
  showToast: (text: string, type: "success" | "error" | "info") => void;
}

export function VpsRemoteConsole({ defaultIp = "165.22.180.160", showToast }: VpsRemoteConsoleProps) {
  // SSH Credentials
  const [host, setHost] = useState(() => localStorage.getItem("docenty_vps_ip") || defaultIp || "165.22.180.160");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("root");
  const [password, setPassword] = useState(() => localStorage.getItem("docenty_vps_pwd") || "");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberPwd, setRememberPwd] = useState(true);
  const [domain, setDomain] = useState(defaultIp);

  // Connection & Execution States
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [serverMetrics, setServerMetrics] = useState<string>("");

  // Task & Auto-Installer States
  const [activeTask, setActiveTask] = useState<"none" | "install" | "deploy">("none");
  const [installing, setInstalling] = useState(false);
  const [installStep, setInstallStep] = useState<string>("Listo para iniciar");
  const [installProgress, setInstallProgress] = useState(0);
  const [installLogs, setInstallLogs] = useState<string>("");
  const [installSuccess, setInstallSuccess] = useState(false);
  const [pm2Online, setPm2Online] = useState(false);

  // Interactive Terminal
  const [customCommand, setCustomCommand] = useState("pm2 status");
  const [executing, setExecuting] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string>(
    "DOCENTY PRO - Consola VPS Remota\nConexión directa vía SSH a tu servidor DigitalOcean.\nSelecciona un comando rápido o pulsa 'Instalar Automáticamente'."
  );

  // Git Deployment
  const [gitRepoUrl, setGitRepoUrl] = useState(() => localStorage.getItem("docenty_vps_git_url") || "");
  const [cloningGit, setCloningGit] = useState(false);

  // UI Accordions
  const [showAdvancedSsh, setShowAdvancedSsh] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<any>(null);

  const handleHostChange = (val: string) => {
    setHost(val);
    setDomain(val);
    localStorage.setItem("docenty_vps_ip", val);
  };

  // Save password preference
  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (rememberPwd) {
      localStorage.setItem("docenty_vps_pwd", val);
    }
  };

  const handleRememberToggle = (checked: boolean) => {
    setRememberPwd(checked);
    if (checked && password) {
      localStorage.setItem("docenty_vps_pwd", password);
    } else {
      localStorage.removeItem("docenty_vps_pwd");
    }
  };

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    showToast("Copiado al portapapeles", "success");
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Test SSH Connection
  const handleTestSsh = async () => {
    if (!password) {
      showToast("Por favor ingresa la contraseña de root del Droplet", "error");
      return;
    }

    setConnecting(true);
    try {
      const res = await fetch("/api/vps/test-ssh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port, username, password }),
      });

      const data = await res.json();
      if (data.ok) {
        setConnected(true);
        setServerMetrics(data.stdout || "");
        setTerminalOutput((prev) => `${prev}\n\n[SSH OK] Conexión establecida con éxito a ${host} (root)\n${data.stdout}`);
        showToast("¡Conexión SSH exitosa con tu Droplet!", "success");
      } else {
        setConnected(false);
        setTerminalOutput((prev) => `${prev}\n\n[SSH ERROR] ${data.error || "Fallo de autenticación"}`);
        showToast(data.error || "No se pudo conectar al Droplet", "error");
      }
    } catch (err: any) {
      setConnected(false);
      showToast("Error conectando con el backend: " + err.message, "error");
    } finally {
      setConnecting(false);
    }
  };

  // Run Custom Command in Terminal
  const handleExecuteCommand = async (cmdToRun?: string) => {
    const cmd = cmdToRun || customCommand;
    if (!cmd.trim()) return;

    if (!password) {
      showToast("Debes ingresar la contraseña de root de tu Droplet primero", "error");
      return;
    }

    setExecuting(true);
    setTerminalOutput((prev) => `${prev}\n\nroot@${host}:~# ${cmd}`);

    try {
      const res = await fetch("/api/vps/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port, username, password, command: cmd }),
      });

      const data = await res.json();
      if (data.ok) {
        setConnected(true);
        const output = data.stdout || data.stderr || "(Comando completado sin salida)";
        setTerminalOutput((prev) => `${prev}\n${output}`);
      } else {
        setTerminalOutput((prev) => `${prev}\n[ERROR]: ${data.error || data.stderr}`);
        showToast(data.error || "Error al ejecutar comando", "error");
      }
    } catch (err: any) {
      setTerminalOutput((prev) => `${prev}\n[EXCEPCIÓN]: ${err.message}`);
    } finally {
      setExecuting(false);
      setTimeout(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  // Launch Automatic Unattended Installation
  const handleStartAutoInstall = async () => {
    if (!password) {
      showToast("Ingresa la contraseña de root del Droplet para instalar", "error");
      return;
    }

    setActiveTask("install");
    setInstalling(true);
    setInstallSuccess(false);
    setInstallProgress(10);
    setInstallStep("Paso 1: Iniciando proceso en segundo plano en el Droplet...");
    setInstallLogs("Conectando e inyectando instalador desasociado (nohup)...");

    try {
      const res = await fetch("/api/vps/install-auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port, username, password, domain }),
      });

      const data = await res.json();
      if (data.ok) {
        setConnected(true);
        showToast("🚀 Instalación iniciada en segundo plano con protección anti-desconexión", "success");
        setTerminalOutput((prev) => `${prev}\n\n[AUTO-INSTALL INICIADO]: Proceso desasociado en la VPS.`);
        startPollingStatus();
      } else {
        setInstalling(false);
        setActiveTask("none");
        setInstallStep("Error al iniciar instalador");
        showToast(data.error || "Error al iniciar instalador", "error");
      }
    } catch (err: any) {
      setInstalling(false);
      setActiveTask("none");
      setInstallStep("Fallo de red");
      showToast("Error de conexión: " + err.message, "error");
    }
  };

  // Deploy Git Code into /var/www/docenty with nohup protection
  const handleDeployGit = async () => {
    if (!gitRepoUrl.trim()) {
      showToast("Ingresa la URL del repositorio Git de Docenty PRO", "error");
      return;
    }
    if (!password) {
      showToast("Ingresa la contraseña de root del Droplet", "error");
      return;
    }
    localStorage.setItem("docenty_vps_git_url", gitRepoUrl);
    setActiveTask("deploy");
    setCloningGit(true);
    setInstallSuccess(false);
    setInstallProgress(10);
    setInstallStep("Paso 1/6: Iniciando despliegue de repositorio Git en segundo plano...");
    setTerminalOutput((prev) => `${prev}\n\n[GIT DEPLOY INICIADO]: Clonando ${gitRepoUrl} en /var/www/docenty...`);
    showToast("Clonando repositorio y levantando PM2 en el Droplet...", "info");

    try {
      const res = await fetch("/api/vps/deploy-git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port, username, password, repoUrl: gitRepoUrl.trim() }),
      });

      const data = await res.json();
      if (data.ok) {
        showToast("🚀 Despliegue iniciado en segundo plano. Monitoreando compilación...", "success");
        startPollingStatus();
      } else {
        showToast(data.error || "Error al iniciar despliegue Git", "error");
        setCloningGit(false);
        setActiveTask("none");
      }
    } catch (err: any) {
      showToast("Error de conexión: " + err.message, "error");
      setCloningGit(false);
      setActiveTask("none");
    }
  };

  // Poll Installation Status & Logs
  const checkStatusOnce = async () => {
    try {
      const res = await fetch("/api/vps/install-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port, username, password }),
      });

      const data = await res.json();
      if (data.ok) {
        setInstallLogs(data.logs || "");
        setPm2Online(data.pm2Online);

        const isDeploy = data.taskType === "DEPLOY" || activeTask === "deploy" || cloningGit;

        if (isDeploy) {
          // Despliegue Git (Clonado, SWAP, NPM install, Vite + esbuild, PM2)
          let prog = 15;
          let stepText = "Iniciando despliegue Git...";

          if (data.logs.includes("[DEPLOY 1/6]")) {
            prog = 20;
            stepText = "Paso 1/6: Obteniendo archivos desde el repositorio GitHub...";
          }
          if (data.logs.includes("[DEPLOY 2/6]")) {
            prog = 35;
            stepText = "Paso 2/6: Verificando y activando memoria SWAP de 2GB (anti-OOM)...";
          }
          if (data.logs.includes("[DEPLOY 3/6]")) {
            prog = 55;
            stepText = "Paso 3/6: Instalando dependencias de Node.js completas...";
          }
          if (data.logs.includes("[DEPLOY 4/6]")) {
            prog = 75;
            stepText = "Paso 4/6: Compilando frontend y backend (Vite + esbuild en progreso)...";
          }
          if (data.logs.includes("[DEPLOY 5/6]")) {
            prog = 90;
            stepText = "Paso 5/6: Levantando servicio en PM2 (docenty-pro)...";
          }
          if (data.logs.includes("[DEPLOY 6/6]")) {
            prog = 95;
            stepText = "Paso 6/6: Verificando servicio HTTP en puerto 3000...";
          }

          if (data.isDeploySuccess && data.pm2Online) {
            prog = 100;
            stepText = "🎉 ¡Docenty PRO clonado, compilado y 100% ONLINE en PM2!";
            setInstallSuccess(true);
            setCloningGit(false);
            setInstalling(false);
            setActiveTask("none");
            stopPollingStatus();
            showToast("🎉 ¡Docenty PRO desplegado y corriendo en PM2!", "success");
          } else if (data.isDeployError) {
            stepText = "❌ Error durante la compilación o arranque en PM2. Revisa el registro abajo.";
            setCloningGit(false);
            setInstalling(false);
            setActiveTask("none");
            stopPollingStatus();
            showToast("Error en la compilación o arranque de PM2", "error");
          } else if (!data.isRunning && !data.isDeploySuccess) {
            // El proceso ya no corre en nohup. ¿Tuvo éxito en el log?
            if (data.logs.includes("DOCENTY_GIT_DEPLOY_SUCCESS")) {
              prog = 100;
              stepText = "🎉 ¡Docenty PRO clonado, compilado y ONLINE en PM2!";
              setInstallSuccess(true);
              setCloningGit(false);
              setInstalling(false);
              setActiveTask("none");
              stopPollingStatus();
            } else {
              stepText = "⚠️ El despliegue se detuvo. Revisa el registro de la consola abajo.";
              setCloningGit(false);
              setInstalling(false);
              setActiveTask("none");
              stopPollingStatus();
            }
          }

          setInstallProgress(prog);
          setInstallStep(stepText);
        } else {
          // Instalador base (Node 20, Nginx, PM2, Firewall, SWAP)
          let prog = 25;
          let stepText = "Instalando paquetes del sistema...";

          if (data.logs.includes("[PASO 1/7]")) {
            prog = 20;
            stepText = "Paso 1/7: Configurando Memoria SWAP de 2GB...";
          }
          if (data.logs.includes("[PASO 2/7]")) {
            prog = 35;
            stepText = "Paso 2/7: Actualizando paquetes e instalando Nginx & Git...";
          }
          if (data.logs.includes("[PASO 3/7]")) {
            prog = 55;
            stepText = "Paso 3/7: Instalando Node.js 20 LTS & PM2...";
          }
          if (data.logs.includes("[PASO 4/7]")) {
            prog = 70;
            stepText = "Paso 4/7: Configurando Firewall UFW (Seguridad)...";
          }
          if (data.logs.includes("[PASO 5/7]")) {
            prog = 80;
            stepText = "Paso 5/7: Configurando directorio /var/www/docenty y credenciales .env...";
          }
          if (data.logs.includes("[PASO 6/7]")) {
            prog = 90;
            stepText = "Paso 6/7: Configurando Proxy Inverso Nginx y WebSockets...";
          }
          if (data.logs.includes("[PASO 7/7]")) {
            prog = 95;
            stepText = "Paso 7/7: Verificando código y servicio PM2...";
          }

          if (data.isInstallSuccess) {
            prog = 100;
            stepText = "🎉 ¡Entorno VPS y Nginx 100% listos! Procede a desplegar con el botón abajo.";
            setInstallSuccess(true);
            setInstalling(false);
            setActiveTask("none");
            stopPollingStatus();
            showToast("¡VPS configurada exitosamente!", "success");
          } else if (!data.isRunning && prog >= 90) {
            prog = 100;
            stepText = "Entorno VPS preparado. Puedes proceder al despliegue.";
            setInstalling(false);
            setActiveTask("none");
            stopPollingStatus();
          }

          setInstallProgress(prog);
          setInstallStep(stepText);
        }
      }
    } catch (e) {
      console.warn("Polling error (normal if network blips):", e);
    }
  };

  const startPollingStatus = () => {
    stopPollingStatus();
    checkStatusOnce();
    pollTimerRef.current = setInterval(checkStatusOnce, 3500);
  };

  const stopPollingStatus = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPollingStatus();
    };
  }, []);

  const manualCurlCommand = `curl -sSL "https://${window.location.host}/deploy.sh" | bash`;
  const manualNohupCommand = `nohup bash -c 'curl -sSL "https://${window.location.host}/deploy.sh" | bash' > /var/log/docenty-install.log 2>&1 & echo "Despliegue iniciado con PID: $!" && sleep 2 && tail -n 30 /var/log/docenty-install.log`;

  return (
    <div className="bg-[#121212]/95 rounded-3xl border border-blue-900/40 p-5 sm:p-7 space-y-6 shadow-2xl">
      {/* Header with Anti-Disconnect Guarantee */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-lg shadow-blue-950/50">
            <Server className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-bold text-lg text-white">
                Vinculación Automática DigitalOcean VPS
              </h3>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Protección Anti-Desconexión para Celular
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Droplet: <span className="font-mono text-zinc-300">1 vCPU • 512 MB • 10 GB</span> — IP: <span className="font-mono text-blue-400 font-bold">{host}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {connected ? (
            <span className="bg-emerald-950/70 border border-emerald-800 text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>SSH Conectado</span>
            </span>
          ) : (
            <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-zinc-500"></span>
              <span>Esperando Clave Root</span>
            </span>
          )}

          {pm2Online && (
            <span className="bg-blue-950/70 border border-blue-800 text-blue-300 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-blue-400" />
              <span>Docenty PRO ONLINE</span>
            </span>
          )}
        </div>
      </div>

      {/* Mobile Advice Banner */}
      <div className="bg-blue-950/30 border border-blue-900/50 p-4 rounded-2xl flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-blue-200">
            ¿Por qué se cerraba la consola al cambiar de pestaña en el celular?
          </p>
          <p className="text-zinc-300 leading-relaxed">
            Los navegadores móviles congelan las pestañas inactivas para ahorrar batería, matando la sesión SSH de DigitalOcean.
            Con este sistema, <strong>Docenty PRO ejecuta la instalación con procesos desacoplados en el fondo del servidor (nohup)</strong>.
            Puedes apagar la pantalla o cambiar de aplicación: <strong>la instalación no se detendrá jamás</strong>.
          </p>
        </div>
      </div>

      {/* Connection Credentials Form */}
      <div className="bg-zinc-900/80 p-4 sm:p-5 rounded-2xl border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-white flex items-center gap-2">
            <Key className="h-4 w-4 text-blue-400" />
            <span>Credenciales de Acceso a tu Droplet</span>
          </h4>
          <span className="text-[10px] text-zinc-400">
            Comunicación encriptada SSL
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400">IP del Droplet DigitalOcean</label>
            <input
              type="text"
              value={host}
              onChange={(e) => handleHostChange(e.target.value)}
              className="w-full bg-black/60 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-blue-500"
              placeholder="165.22.180.160"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400">Usuario SSH</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/60 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-blue-500"
              placeholder="root"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400 flex items-center justify-between">
              <span>Contraseña de root</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-0.5"
              >
                {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span>{showPassword ? "Ocultar" : "Ver"}</span>
              </button>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="Pega aquí la contraseña de root del Droplet"
                className="w-full bg-black/60 border border-blue-900/60 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-blue-500 pr-8"
              />
              <Lock className="h-3.5 w-3.5 text-zinc-500 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 select-none">
            <input
              type="checkbox"
              checked={rememberPwd}
              onChange={(e) => handleRememberToggle(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-0"
            />
            <span>Recordar contraseña en este teléfono (almacenamiento local seguro)</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestSsh}
              disabled={connecting || !password}
              className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-zinc-700 transition flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-initial"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${connecting ? "animate-spin text-blue-400" : ""}`} />
              <span>{connecting ? "Verificando..." : "1. Probar Conexión SSH"}</span>
            </button>

            <button
              type="button"
              onClick={handleStartAutoInstall}
              disabled={installing || !password}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-950/40 flex-1 sm:flex-initial"
            >
              <Play className={`h-4 w-4 ${installing ? "animate-spin" : ""}`} />
              <span>{installing ? "Instalando en Droplet..." : "🚀 2. Instalar Todo Automáticamente (1-Clic)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Installation Progress Widget (Visible during or after installation) */}
      {(installing || installProgress > 0 || installSuccess) && (
        <div className="bg-zinc-900/90 p-5 rounded-2xl border border-blue-900/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${installSuccess ? "bg-emerald-400" : "bg-blue-400 animate-ping"}`}></span>
              <h4 className="font-bold text-sm text-white">Progreso de la Migración a VPS</h4>
            </div>
            <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-800/40">
              {installProgress}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-black/60 rounded-full h-3 overflow-hidden border border-zinc-800 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                installSuccess
                  ? "bg-gradient-to-r from-teal-500 to-emerald-400"
                  : "bg-gradient-to-r from-blue-600 via-indigo-500 to-teal-400"
              }`}
              style={{ width: `${installProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-300">
            <p className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span>{installStep}</span>
            </p>
            {installing && (
              <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />
                Actualizando cada 3s
              </span>
            )}
          </div>

          {/* Log Window */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Registro en vivo (/var/log/docenty-install.log en tu VPS):</span>
              <button
                type="button"
                onClick={checkStatusOnce}
                className="hover:text-white flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Refrescar Registro</span>
              </button>
            </div>
            <pre className="bg-black/90 p-3 rounded-xl border border-zinc-800 text-[11px] font-mono text-zinc-300 max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap select-all">
              {installLogs || "Conectando al proceso del Droplet..."}
            </pre>
          </div>
        </div>
      )}

      {/* Git Deployment / Pull Card (Final Step to Start PM2) */}
      <div className="bg-zinc-900/90 p-5 rounded-2xl border border-emerald-900/40 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div>
              <h4 className="font-bold text-sm text-white">
                Paso Final: Desplegar Código de Docenty PRO y Arrancar PM2
              </h4>
              <p className="text-[11px] text-zinc-400">
                El entorno base de tu VPS ya está 100% configurado. Solo ingresa tu repositorio de GitHub para clonar e iniciar el CRM.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            type="text"
            value={gitRepoUrl}
            onChange={(e) => setGitRepoUrl(e.target.value)}
            placeholder="https://github.com/tu-usuario/docenty-pro.git"
            className="flex-1 bg-black/60 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-emerald-300 focus:outline-hidden focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={handleDeployGit}
            disabled={cloningGit || executing || !password || !gitRepoUrl.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40 shrink-0"
          >
            <Play className={`h-3.5 w-3.5 ${cloningGit ? "animate-spin" : ""}`} />
            <span>{cloningGit ? "Clonando y Compilando..." : "🚀 Clonar y Levantar PM2"}</span>
          </button>
        </div>
      </div>

      {/* Interactive Web Terminal & Quick Mobile Commands */}
      <div className="bg-black/80 rounded-2xl border border-zinc-800 overflow-hidden space-y-0">
        {/* Terminal Header */}
        <div className="bg-zinc-900/90 px-4 py-3 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold text-white">
              Consola Remota VPS (root@{host})
            </span>
          </div>

          {/* Quick Buttons for Mobile (One-tap execution) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleExecuteCommand("pm2 status")}
              disabled={executing || !password}
              className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1 rounded-lg border border-zinc-700 font-mono transition"
            >
              pm2 status
            </button>
            <button
              type="button"
              onClick={() => handleExecuteCommand("pm2 logs docenty-pro --lines 30")}
              disabled={executing || !password}
              className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1 rounded-lg border border-zinc-700 font-mono transition"
            >
              pm2 logs
            </button>
            <button
              type="button"
              onClick={() => handleExecuteCommand("free -m")}
              disabled={executing || !password}
              className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1 rounded-lg border border-zinc-700 font-mono transition"
            >
              free -m (RAM)
            </button>
            <button
              type="button"
              onClick={() => handleExecuteCommand("nginx -t && systemctl reload nginx")}
              disabled={executing || !password}
              className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1 rounded-lg border border-zinc-700 font-mono transition"
            >
              reload nginx
            </button>
            <button
              type="button"
              onClick={() => setTerminalOutput("")}
              className="text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 px-2 py-1 rounded-lg border border-zinc-800 font-mono"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Terminal Screen Output */}
        <div className="p-4 bg-[#0a0a0c] font-mono text-xs text-emerald-400 max-h-72 overflow-y-auto leading-relaxed whitespace-pre-wrap select-all">
          {terminalOutput}
          <div ref={terminalEndRef} />
        </div>

        {/* Terminal Command Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecuteCommand();
          }}
          className="bg-zinc-900/90 p-2.5 border-t border-zinc-800 flex items-center gap-2"
        >
          <span className="font-mono text-xs text-blue-400 pl-2">#</span>
          <input
            type="text"
            value={customCommand}
            onChange={(e) => setCustomCommand(e.target.value)}
            placeholder="Escribe un comando bash (ej. pm2 restart docenty-pro, df -h, etc.)"
            className="flex-1 bg-transparent text-xs font-mono text-white focus:outline-hidden placeholder-zinc-600"
          />
          <button
            type="submit"
            disabled={executing || !password || !customCommand.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Play className={`h-3 w-3 ${executing ? "animate-spin" : ""}`} />
            <span>{executing ? "Ejecutando..." : "Ejecutar"}</span>
          </button>
        </form>
      </div>

      {/* Alternative: 1-Line Self-Contained Command (In case user prefers cURL in Web Console) */}
      <div className="border-t border-zinc-800/80 pt-4">
        <button
          type="button"
          onClick={() => setShowAdvancedSsh(!showAdvancedSsh)}
          className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center justify-between w-full py-1"
        >
          <span className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-zinc-500" />
            <span>Opción Alternativa: Comando de 1 sola línea para pegar manualmente con nohup</span>
          </span>
          {showAdvancedSsh ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showAdvancedSsh && (
          <div className="mt-3 bg-black/70 p-4 rounded-xl border border-zinc-800 space-y-3 text-xs">
            <p className="text-zinc-400 leading-relaxed">
              Si prefieres entrar directamente a la consola web de DigitalOcean, copia y pega este comando único. Se encarga de todo: <strong>SWAP 2GB, Node.js 20, Nginx, clonar tu repo, compilar y dejar PM2 online</strong>:
            </p>
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-emerald-400">1. Ejecución con visualización en tiempo real:</span>
              <div className="flex items-center gap-2">
                <code className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 font-mono text-[11px] text-emerald-300 flex-1 break-all select-all">
                  {manualCurlCommand}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(manualCurlCommand, "manual_curl")}
                  className="bg-emerald-800 hover:bg-emerald-700 text-white text-xs px-3 py-2.5 rounded-lg shrink-0 flex items-center gap-1 transition cursor-pointer font-bold"
                >
                  {copiedField === "manual_curl" ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedField === "manual_curl" ? "Copiado" : "Copiar"}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-amber-400">2. O con protección anti-cierre (en segundo plano / nohup):</span>
              <div className="flex items-center gap-2">
                <code className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 font-mono text-[11px] text-amber-300 flex-1 break-all select-all">
                  {manualNohupCommand}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(manualNohupCommand, "manual_nohup")}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-3 py-2.5 rounded-lg shrink-0 flex items-center gap-1 transition cursor-pointer"
                >
                  {copiedField === "manual_nohup" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedField === "manual_nohup" ? "Copiado" : "Copiar"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
