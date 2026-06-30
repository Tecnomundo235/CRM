import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  MessageSquare,
  Settings,
  ShieldCheck,
  TrendingUp,
  Plus,
  Trash2,
  Search,
  Image as ImageIcon,
  Mic,
  Square,
  Volume2,
  FileText,
  Send,
  Check,
  CheckCheck,
  AlertCircle,
  RefreshCw,
  Play,
  Sparkles,
  BookOpen,
  ArrowRight,
  CreditCard,
  Upload,
  X,
  ChevronRight,
  CircleCheck,
  AlertTriangle,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Lead, Message, BankDetails, SystemConfigs } from "./types";

export default function App() {
  // Tabs: "crm", "whatsapp", "config", "about"
  const [activeTab, setActiveTab] = useState<"crm" | "whatsapp" | "config" | "about">("crm");
  
  // Leads & Config States
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sendingMsg, setSendingMsg] = useState<boolean>(false);
  const [verifyingReceipt, setVerifyingReceipt] = useState<boolean>(false);
  const [simulatingBuyer, setSimulatingBuyer] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New Lead Form State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
    plan: "annual" as "annual" | "monthly",
    status: "prospect" as any,
  });

  // Settings State
  const [config, setConfig] = useState<SystemConfigs>({
    botSystemPrompt: "",
    bankDetails: { banco: "", cuenta: "", beneficiario: "" },
  });

  // Chat input
  const [chatInput, setChatInput] = useState<string>("");

  // Search & Filter
  const [crmSearch, setCrmSearch] = useState<string>("");
  const [crmFilter, setCrmFilter] = useState<string>("all");

  // Receipt Simulator State
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [receiptSim, setReceiptSim] = useState({
    bank: "Banco de Venezuela",
    refCode: "",
    amount: "2",
  });
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  // Notifications / Feedback
  const [notification, setNotification] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial data
  useEffect(() => {
    fetchLeads();
    fetchConfig();
  }, []);

  // Scroll to bottom on chat changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [leads, selectedLeadId, activeTab]);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/leads");
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
        if (data.length > 0 && !selectedLeadId) {
          setSelectedLeadId(data[0].id);
        }
      }
    } catch (e) {
      console.error("Error fetching leads:", e);
      showToast("Error de conexión con el servidor", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (e) {
      console.error("Error fetching config:", e);
    }
  };

  // Create lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name || !newLeadForm.phone) {
      showToast("Nombre y teléfono son obligatorios", "error");
      return;
    }
    setActionLoading("create");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLeadForm),
      });

      if (res.ok) {
        const newLead = await res.json();
        setLeads((prev) => [newLead, ...prev]);
        setSelectedLeadId(newLead.id);
        setShowCreateModal(false);
        setNewLeadForm({
          name: "",
          phone: "",
          email: "",
          notes: "",
          plan: "annual",
          status: "prospect",
        });
        showToast(`Cliente ${newLead.name} registrado con éxito`);
        setActiveTab("whatsapp"); // Take them directly to simulate
      } else {
        showToast("Error al crear el cliente", "error");
      }
    } catch (e) {
      showToast("Error de conexión", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Delete lead
  const handleDeleteLead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Está seguro de eliminar este prospecto?")) return;
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== id));
        showToast("Prospecto eliminado");
        if (selectedLeadId === id) {
          setSelectedLeadId(null);
        }
      }
    } catch (e) {
      showToast("Error de conexión", "error");
    }
  };

  // Reset database to default
  const handleResetDb = async () => {
    if (!confirm("¿Desea restablecer los leads por defecto? Esto borrará simulaciones actuales.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
        if (data.length > 0) {
          setSelectedLeadId(data[0].id);
        }
        showToast("Base de datos restablecida con datos demo");
      }
    } catch (e) {
      showToast("Error al reiniciar", "error");
    } finally {
      setLoading(false);
    }
  };

  // Update Settings
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading("config");
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        showToast("Configuración del Agente AI guardada con éxito");
      } else {
        showToast("Error al guardar la configuración", "error");
      }
    } catch (e) {
      showToast("Error de conexión", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Recording state and references
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Start microphone recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || "audio/ogg" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64WithPrefix = reader.result as string;
          const cleanBase64 = base64WithPrefix.replace(/^data:audio\/\w+;base64,/, "");
          await handleSendAudioMsg(cleanBase64, audioBlob.type || "audio/ogg");
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks to release the mic
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      showToast("Grabando nota de voz... ¡Habla ahora!", "info");
    } catch (err) {
      console.error("Mic error:", err);
      showToast("Micrófono no disponible o denegado en este iframe.", "error");
    }
  };

  // Stop microphone recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Handle local audio file upload
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64WithPrefix = reader.result as string;
      const cleanBase64 = base64WithPrefix.replace(/^data:audio\/\w+;base64,/, "");
      const mimeType = file.type || "audio/ogg";
      await handleSendAudioMsg(cleanBase64, mimeType);
    };
    reader.readAsDataURL(file);
  };

  // Send audio message to Camila
  const handleSendAudioMsg = async (audioBase64: string, mimeType: string) => {
    if (!selectedLeadId) return;
    setSendingMsg(true);

    try {
      let cleanMimeType = mimeType;
      if (cleanMimeType.includes(";")) {
        cleanMimeType = cleanMimeType.split(";")[0].trim();
      }

      // Prepend audio message to UI
      setLeads((prev) =>
        prev.map((l) => {
          if (l.id === selectedLeadId) {
            return {
              ...l,
              status: l.status === "prospect" ? "interested" : l.status,
              messages: [
                ...l.messages,
                {
                  sender: "client",
                  text: "🎤 [Nota de voz enviada]",
                  timestamp: new Date().toISOString(),
                  isAudio: true,
                  audioData: {
                    base64: audioBase64,
                    mimeType: cleanMimeType,
                  },
                },
              ],
            };
          }
          return l;
        })
      );

      const res = await fetch(`/api/leads/${selectedLeadId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "🎤 [Nota de voz enviada]",
          isAudio: true,
          audioBase64,
          audioMimeType: cleanMimeType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLeads((prev) => prev.map((l) => (l.id === selectedLeadId ? data.lead : l)));
        if (data.apiError) {
          showToast("Demostración: Llave de API ausente, usando agente simulado.", "info");
        } else {
          showToast("Camila procesó tu nota de voz!");
        }
      } else {
        showToast("Error al procesar nota de voz con Camila", "error");
      }
    } catch (err) {
      showToast("Error de conexión", "error");
    } finally {
      setSendingMsg(false);
    }
  };

  // Simulate a preset voice note from client
  const handleSimulatePresetVoiceNote = async () => {
    // 44-byte silent WAV file
    const silentWavBase64 = "UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
    await handleSendAudioMsg(silentWavBase64, "audio/wav");
  };

  // Send message on WhatsApp simulator (as Client/Buyer)
  const handleSendWhatsAppMsg = async (textToSend?: string) => {
    const msgText = textToSend || chatInput;
    if (!msgText.trim() || !selectedLeadId) return;

    setSendingMsg(true);
    if (!textToSend) setChatInput("");

    try {
      // Instantly append customer message in UI for natural feel
      setLeads((prev) =>
        prev.map((l) => {
          if (l.id === selectedLeadId) {
            return {
              ...l,
              status: l.status === "prospect" ? "interested" : l.status,
              messages: [
                ...l.messages,
                {
                  sender: "client",
                  text: msgText,
                  timestamp: new Date().toISOString(),
                },
              ],
            };
          }
          return l;
        })
      );

      const res = await fetch(`/api/leads/${selectedLeadId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msgText }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update the complete lead data (including the bot reply)
        setLeads((prev) => prev.map((l) => (l.id === selectedLeadId ? data.lead : l)));
        if (data.apiError) {
          showToast("Demostración: Llave de API ausente, usando agente simulado.", "info");
        }
      } else {
        showToast("Error al generar respuesta de IA", "error");
      }
    } catch (e) {
      showToast("Error de conexión con el servidor", "error");
    } finally {
      setSendingMsg(false);
    }
  };

  // Automatically simulate a buyer question/objection using Gemini!
  const handleAutoSimulateBuyer = async () => {
    if (!selectedLeadId) return;
    setSimulatingBuyer(true);
    try {
      const res = await fetch(`/api/leads/${selectedLeadId}/simulate-buyer-reply`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.fallbackMode) {
          showToast("Simulación local de objeción", "info");
        }
        // Send this generated text through the chat pipeline
        await handleSendWhatsAppMsg(data.clientReply);
      }
    } catch (e) {
      showToast("Error al simular cliente", "error");
    } finally {
      setSimulatingBuyer(false);
    }
  };

  // Draw receipt on Canvas
  const handleGenerateAndSendReceipt = async () => {
    if (!selectedLeadId) return;
    setVerifyingReceipt(true);
    setShowReceiptModal(false);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 500;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not construct canvas context");

      // Draw Paper Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 400, 500);

      // Bank blue gradient Header
      const gradient = ctx.createLinearGradient(0, 0, 400, 0);
      gradient.addColorStop(0, "#0284c7");
      gradient.addColorStop(1, "#0369a1");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 400, 85);

      // Header Text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px Arial";
      ctx.fillText(receiptSim.bank.toUpperCase(), 20, 35);
      ctx.fillStyle = "#bae0fd";
      ctx.font = "11px Arial";
      ctx.fillText("COMPROBANTE DE TRANSFERENCIA INTERBANCARIA", 20, 55);
      ctx.fillText("OPERACIÓN INTERNET - BANCA ELECTRÓNICA", 20, 70);

      // Draw separator line
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, 100);
      ctx.lineTo(380, 100);
      ctx.stroke();

      // Fields to print
      const fields = [
        { label: "Monto:", value: `$${receiptSim.amount}.00 USD` },
        { label: "Beneficiario:", value: "Docenty S.A.S." },
        { label: "Cuenta Destino:", value: "1200-4560-7890" },
        { label: "Concepto de Pago:", value: receiptSim.refCode },
        { label: "Clave de Rastreo:", value: "TXN-90" + Math.floor(100000 + Math.random() * 899999) },
        { label: "Fecha y Hora:", value: new Date().toISOString().replace("T", " ").substring(0, 19) },
        { label: "Estado del Pago:", value: "APLICADO / EXITOSO" },
      ];

      let y = 135;
      fields.forEach((field) => {
        // Label
        ctx.fillStyle = "#64748b";
        ctx.font = "bold 11px Arial";
        ctx.fillText(field.label, 25, y);

        // Value
        if (field.label === "Concepto de Pago:") {
          ctx.fillStyle = "#0f172a";
          ctx.font = "bold 14px Courier New"; // Make it look like a typed code
          ctx.fillText(field.value, 150, y);
        } else if (field.label === "Monto:") {
          ctx.fillStyle = "#0284c7";
          ctx.font = "bold 15px Arial";
          ctx.fillText(field.value, 150, y);
        } else if (field.label === "Estado del Pago:") {
          ctx.fillStyle = "#16a34a";
          ctx.font = "bold 11px Arial";
          ctx.fillText(field.value, 150, y);
        } else {
          ctx.fillStyle = "#334155";
          ctx.font = "12px Arial";
          ctx.fillText(field.value, 150, y);
        }

        // Underline
        ctx.strokeStyle = "#f1f5f9";
        ctx.beginPath();
        ctx.moveTo(20, y + 10);
        ctx.lineTo(380, y + 10);
        ctx.stroke();

        y += 38;
      });

      // Verification Watermark Seal
      ctx.strokeStyle = "rgba(22, 163, 74, 0.2)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(310, 410, 45, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.fillStyle = "rgba(22, 163, 74, 0.25)";
      ctx.font = "bold 10px Arial";
      ctx.fillText("TRANSF. OK", 282, 405);
      ctx.fillText("SISTEMA BANX", 276, 420);

      const base64Image = canvas.toDataURL("image/png");

      const res = await fetch(`/api/leads/${selectedLeadId}/verify-receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Image }),
      });

      if (res.ok) {
        const data = await res.json();
        setLeads((prev) => prev.map((l) => (l.id === selectedLeadId ? data.lead : l)));
        setValidationResult(data.receiptData);
        if (data.fallbackMode) {
          showToast("Validación simulada exitosamente (Modo Demo)", "info");
        } else {
          showToast("Comprobante validado con IA exitosamente", "success");
        }
      } else {
        showToast("Error en la validación del comprobante", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Error al enviar comprobante", "error");
    } finally {
      setVerifyingReceipt(false);
    }
  };

  // Handle local file upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setUploadedImageBase64(base64);
      // Automatically send the uploaded image
      if (!selectedLeadId) return;
      setVerifyingReceipt(true);
      try {
        const res = await fetch(`/api/leads/${selectedLeadId}/verify-receipt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64 }),
        });

        if (res.ok) {
          const data = await res.json();
          setLeads((prev) => prev.map((l) => (l.id === selectedLeadId ? data.lead : l)));
          setValidationResult(data.receiptData);
          showToast("Imagen subida y analizada con Gemini Vision");
        } else {
          showToast("Error al analizar comprobante", "error");
        }
      } catch (err) {
        showToast("Error de red", "error");
      } finally {
        setVerifyingReceipt(false);
        setUploadedImageBase64(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Find active lead
  const activeLead = leads.find((l) => l.id === selectedLeadId);

  // Statistics calculation
  const totalLeads = leads.length;
  const activeSubscribers = leads.filter((l) => l.status === "approved").length;
  const pendingPayments = leads.filter((l) => l.status === "payment_sent").length;
  const potentialArr = leads.reduce((acc, curr) => {
    // Subscription is $2 USD
    const value = 2;
    return acc + (curr.status === "approved" ? value : 0);
  }, 0);
  
  const conversionRate = totalLeads > 0 
    ? Math.round((activeSubscribers / totalLeads) * 100) 
    : 0;

  // Filter and search leads
  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(crmSearch.toLowerCase()) ||
      l.phone.includes(crmSearch) ||
      (l.email && l.email.toLowerCase().includes(crmSearch.toLowerCase()));

    if (crmFilter === "all") return matchesSearch;
    return matchesSearch && l.status === crmFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800" id="crm-app-root">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 max-w-md ${
              notification.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : notification.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-sky-50 border-sky-200 text-sky-800"
            }`}
          >
            {notification.type === "success" ? (
              <CircleCheck className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            ) : notification.type === "error" ? (
              <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-sky-600 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{notification.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-xs" id="app-header">
        <div className="flex items-center gap-3">
          <div className="bg-sky-600 text-white p-2.5 rounded-xl shadow-md shadow-sky-100 flex items-center justify-center">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-xl tracking-tight text-slate-900">Docenty PRO</h1>
              <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-1.5 py-0.5 rounded">CRM IA</span>
            </div>
            <p className="text-xs text-slate-500">Gestor de WhatsApp & Ventas SaaS en Piloto Automático</p>
          </div>
        </div>

        {/* Top bar controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDb}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-sky-600 bg-slate-100 hover:bg-slate-200/80 px-3 py-2 rounded-lg font-medium transition cursor-pointer"
            title="Restablecer base de datos con leads demo"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reiniciar Demo
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 text-xs text-white bg-sky-600 hover:bg-sky-700 px-3 py-2 rounded-lg font-semibold transition cursor-pointer shadow-md shadow-sky-100"
          >
            <Plus className="h-4 w-4" />
            Nuevo Lead
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between" id="app-sidebar">
          <div className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Módulos</p>
            
            <button
              onClick={() => setActiveTab("crm")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === "crm"
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Embudo CRM Leads</span>
              <span className="ml-auto bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {leads.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("whatsapp")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === "whatsapp"
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Simulador WhatsApp</span>
              {pendingPayments > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {pendingPayments}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("config")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === "config"
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Ajustes del Agente AI</span>
            </button>

            <button
              onClick={() => setActiveTab("about")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === "about"
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>¿Qué es Docenty PRO?</span>
            </button>
          </div>

          {/* Connected Device Card (WhatsApp) */}
          <div className="p-4 border-t border-slate-100">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold text-slate-700 uppercase">WhatsApp Conectado</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-2">
                La IA está escuchando mensajes entrantes de clientes interesados en Docenty PRO.
              </p>
              <div className="text-[10px] font-mono bg-white border border-slate-200 p-1.5 rounded text-slate-600">
                Línea: +1 (555) 234-AI56
              </div>
            </div>
          </div>
        </aside>

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <RefreshCw className="h-8 w-8 text-sky-600 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-500">Cargando base de datos del CRM...</p>
            </div>
          ) : (
            <div className="h-full">
              {/* TAB 1: CRM LEAD MANAGER */}
              {activeTab === "crm" && (
                <div className="p-6 max-w-7xl mx-auto space-y-6">
                  {/* Dashboard Hero stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Leads</p>
                        <h3 className="text-2xl font-display font-bold text-slate-900 mt-1">{totalLeads}</h3>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl text-slate-600">
                        <Users className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasa Conversión</p>
                        <h3 className="text-2xl font-display font-bold text-emerald-600 mt-1">{conversionRate}%</h3>
                      </div>
                      <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Suscritos Activos</p>
                        <h3 className="text-2xl font-display font-bold text-sky-600 mt-1">{activeSubscribers}</h3>
                      </div>
                      <div className="bg-sky-50 p-2.5 rounded-xl text-sky-600">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pendientes de Pago</p>
                        <h3 className="text-2xl font-display font-bold text-amber-500 mt-1">{pendingPayments}</h3>
                      </div>
                      <div className="bg-amber-50 p-2.5 rounded-xl text-amber-500">
                        <CreditCard className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ingreso Anual ARR</p>
                        <h3 className="text-2xl font-display font-bold text-slate-900 mt-1">${potentialArr} USD</h3>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl text-slate-600">
                        <Sparkles className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
                    {/* Search input */}
                    <div className="relative w-full sm:w-80">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre o teléfono..."
                        value={crmSearch}
                        onChange={(e) => setCrmSearch(e.target.value)}
                        className="pl-9 pr-4 py-1.5 w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-sky-500 focus:outline-hidden rounded-lg text-sm transition"
                      />
                    </div>

                    {/* Filter buttons */}
                    <div className="flex gap-1 overflow-x-auto w-full sm:w-auto">
                      {[
                        { id: "all", label: "Todos" },
                        { id: "prospect", label: "Prospectos" },
                        { id: "interested", label: "Interesados" },
                        { id: "payment_sent", label: "Pago Recibido" },
                        { id: "approved", label: "Activos Premium" },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setCrmFilter(tab.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                            crmFilter === tab.id
                              ? "bg-sky-600 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Leads Table/Card View */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="font-display font-bold text-base text-slate-900">Listado de Clientes en Embudo</h3>
                      <span className="text-xs font-semibold text-slate-500">Mostrando {filteredLeads.length} leads</span>
                    </div>

                    {filteredLeads.length === 0 ? (
                      <div className="p-12 text-center">
                        <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-slate-600">No se encontraron prospectos</p>
                        <p className="text-xs text-slate-500 mt-1">Prueba cambiando los filtros o agrega un prospecto nuevo.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                          <thead>
                            <tr className="bg-slate-50/55 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                              <th className="px-6 py-3">Cliente</th>
                              <th className="px-6 py-3">Estado Embudo</th>
                              <th className="px-6 py-3">Plan de Interés</th>
                              <th className="px-6 py-3">Código Ref Unico</th>
                              <th className="px-6 py-3">Último Mensaje</th>
                              <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredLeads.map((lead) => (
                              <tr
                                key={lead.id}
                                onClick={() => {
                                  setSelectedLeadId(lead.id);
                                  setActiveTab("whatsapp");
                                }}
                                className="hover:bg-slate-50/70 transition cursor-pointer group"
                              >
                                <td className="px-6 py-4">
                                  <div className="font-bold text-slate-900">{lead.name}</div>
                                  <div className="text-xs text-slate-500 flex flex-col gap-0.5 mt-0.5">
                                    <span>📱 {lead.phone}</span>
                                    {lead.email && <span>✉️ {lead.email}</span>}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                      lead.status === "approved"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : lead.status === "payment_sent"
                                        ? "bg-amber-100 text-amber-800"
                                        : lead.status === "interested"
                                        ? "bg-sky-100 text-sky-800"
                                        : "bg-slate-100 text-slate-700"
                                    }`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${
                                        lead.status === "approved"
                                          ? "bg-emerald-500"
                                          : lead.status === "payment_sent"
                                          ? "bg-amber-500"
                                          : lead.status === "interested"
                                          ? "bg-sky-500"
                                          : "bg-slate-400"
                                      }`}
                                    ></span>
                                    {lead.status === "approved"
                                      ? "Activo Premium"
                                      : lead.status === "payment_sent"
                                      ? "Pago Recibido"
                                      : lead.status === "interested"
                                      ? "Interesado"
                                      : "Prospecto"}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="font-semibold text-slate-700 capitalize">
                                    Docenty PRO ($2 USD)
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <code className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs font-mono font-bold text-slate-700">
                                    {lead.assignedRef}
                                  </code>
                                </td>
                                <td className="px-6 py-4 max-w-[200px] truncate">
                                  {lead.messages.length > 0 ? (
                                    <span className="text-xs text-slate-500">
                                      {lead.messages[lead.messages.length - 1].text}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-400 italic">Sin mensajes todavía</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        setSelectedLeadId(lead.id);
                                        setActiveTab("whatsapp");
                                      }}
                                      className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                                      title="Simular chat de WhatsApp"
                                    >
                                      <MessageCircle className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={(e) => handleDeleteLead(lead.id, e)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                      title="Eliminar lead"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: WHATSAPP CHAT SIMULATOR */}
              {activeTab === "whatsapp" && (
                <div className="h-full flex" style={{ height: "calc(100vh - 73px)" }} id="whatsapp-simulator">
                  {/* Left Column: Chat List */}
                  <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0">
                    {/* Search Chat */}
                    <div className="p-3 border-b border-slate-200">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar conversación..."
                          className="pl-8 pr-3 py-1.5 w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:outline-hidden rounded-lg text-xs transition"
                          value={crmSearch}
                          onChange={(e) => setCrmSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Chat selection list */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                      {leads
                        .filter((lead) => lead.name.toLowerCase().includes(crmSearch.toLowerCase()))
                        .map((lead) => {
                          const lastMsg = lead.messages[lead.messages.length - 1];
                          const isSelected = lead.id === selectedLeadId;
                          
                          return (
                            <button
                              key={lead.id}
                              onClick={() => setSelectedLeadId(lead.id)}
                              className={`w-full p-4 flex gap-3 text-left transition relative cursor-pointer ${
                                isSelected ? "bg-slate-100/80 border-l-4 border-teal-600" : "hover:bg-slate-50/50"
                              }`}
                            >
                              <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold flex-shrink-0 uppercase text-sm">
                                {lead.name.substring(0, 2)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                  <h4 className="font-semibold text-xs text-slate-900 truncate">{lead.name}</h4>
                                  <span className="text-[10px] text-slate-400">
                                    {lastMsg ? "Reciente" : ""}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 truncate mb-1">
                                  {lastMsg ? lastMsg.text : "Sin historial de chat"}
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <code className="text-[9px] font-mono bg-slate-100 px-1 py-0.2 rounded font-bold text-slate-500">
                                    {lead.assignedRef}
                                  </code>
                                  <span
                                    className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded-full ${
                                      lead.status === "approved"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : lead.status === "payment_sent"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-sky-100 text-sky-800"
                                    }`}
                                  >
                                    {lead.status === "approved"
                                      ? "Activo"
                                      : lead.status === "payment_sent"
                                      ? "Verificando"
                                      : "Preguntando"}
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Right Column: Chat Window */}
                  <div className="flex-1 flex flex-col h-full bg-[#efeae2] relative">
                    {activeLead ? (
                      <>
                        {/* Chat Header */}
                        <div className="bg-[#005e54] text-white px-4 py-3 flex items-center justify-between shadow-xs z-10">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-[#128c7e] text-white font-bold flex items-center justify-center text-sm uppercase">
                              {activeLead.name.substring(0, 2)}
                            </div>
                            <div>
                              <h3 className="font-bold text-sm">{activeLead.name}</h3>
                              <p className="text-[10px] text-teal-100 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                                Camila responde en automático
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Simulator controls */}
                            <button
                              onClick={handleAutoSimulateBuyer}
                              disabled={simulatingBuyer || sendingMsg}
                              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                              title="Genera un mensaje o duda de forma aleatoria basada en el contexto con Gemini para testear al vendedor AI"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              {simulatingBuyer ? "Pensando..." : "Simular Objeción de Cliente"}
                            </button>

                            <button
                              onClick={() => {
                                setReceiptSim((prev) => ({ ...prev, refCode: activeLead.assignedRef }));
                                setShowReceiptModal(true);
                              }}
                              className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                              title="Genera una transferencia bancaria con código de referencia"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              Simular Pago (Canvas)
                            </button>
                          </div>
                        </div>

                        {/* Leads Context Sidebar Overlay for WhatsApp test */}
                        <div className="bg-slate-100 px-4 py-2 text-xs border-b border-slate-200 flex items-center gap-4 text-slate-600 justify-between">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span>📋 **Notas del CRM:** {activeLead.notes || "Sin notas específicas"}</span>
                            <span>🔑 **Código asignado:** <code className="bg-slate-200 px-1 rounded font-bold font-mono">{activeLead.assignedRef}</code></span>
                            <span>📦 **Plan:** <span className="font-bold capitalize">Docenty PRO Premium ($2 USD / Pago Móvil)</span></span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              activeLead.status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : activeLead.status === "payment_sent"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-sky-100 text-sky-800"
                            }`}
                          >
                            Estado: {activeLead.status}
                          </span>
                        </div>

                        {/* WhatsApp Messages Display */}
                        <div
                          className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col"
                          style={{
                            backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
                            backgroundBlendMode: "overlay",
                            backgroundColor: "#efeae2",
                          }}
                        >
                          {/* Alert if no history */}
                          {activeLead.messages.length === 0 && (
                            <div className="bg-white/80 border border-slate-200 p-4 rounded-xl max-w-sm mx-auto text-center shadow-xs">
                              <MessageSquare className="h-8 w-8 text-sky-600 mx-auto mb-2" />
                              <p className="text-xs font-semibold text-slate-700">Conversación Vacía</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Escribe una duda como cliente o presiona <strong>"Simular Objeción"</strong> para iniciar la venta de Docenty PRO.
                              </p>
                            </div>
                          )}

                          {activeLead.messages.map((msg, index) => {
                            const isBot = msg.sender === "bot";
                            return (
                              <div
                                key={index}
                                className={`flex flex-col ${isBot ? "items-start" : "items-end"} max-w-[80%] ${
                                  isBot ? "self-start" : "self-end"
                                }`}
                              >
                                <div
                                  className={`p-3 rounded-xl shadow-xs relative ${
                                    isBot
                                      ? "bg-white text-slate-800 rounded-tl-none"
                                      : "bg-[#d9fdd3] text-slate-800 rounded-tr-none"
                                  }`}
                                >
                                  {/* Custom header if receipt attachment */}
                                  {msg.isReceipt && msg.receiptData && (
                                    <div className="mb-2 border border-dashed border-emerald-400 p-2 rounded-lg bg-emerald-50/50">
                                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-1">
                                        <ImageIcon className="h-3.5 w-3.5" />
                                        <span>Captura de Comprobante Recibido</span>
                                      </div>
                                      
                                      {msg.receiptData.imageUrl && (
                                        <img
                                          src={msg.receiptData.imageUrl}
                                          alt="Receipt"
                                          className="w-full max-h-48 object-contain rounded border border-slate-200 mb-2 bg-white"
                                        />
                                      )}

                                      {/* OCR Readout */}
                                      <div className="text-[11px] space-y-1 bg-white p-2 rounded border border-emerald-100">
                                        <div className="flex justify-between">
                                          <span className="text-slate-500">Monto:</span>
                                          <span className="font-bold text-slate-800">{msg.receiptData.monto}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-slate-500">Ref Leída:</span>
                                          <span className="font-bold font-mono text-emerald-700">{msg.receiptData.referencia || "No legible"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-slate-500">Banco:</span>
                                          <span className="text-slate-800">{msg.receiptData.banco || "Banca Digital"}</span>
                                        </div>
                                        <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[10px] text-slate-600 leading-relaxed italic">
                                          &ldquo;{msg.receiptData.analisis}&rdquo;
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Custom audio player if audio message */}
                                  {msg.isAudio && msg.audioData && (
                                    <div className="mb-2 p-2 rounded-lg bg-black/5 border border-slate-100 flex flex-col gap-1 w-full min-w-[240px]">
                                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700">
                                        <Mic className="h-3 w-3 text-teal-600 animate-pulse" />
                                        <span>Mensaje de Voz</span>
                                      </div>
                                      <audio
                                        controls
                                        src={`data:${msg.audioData.mimeType};base64,${msg.audioData.base64}`}
                                        className="w-full h-8 mt-1"
                                      />
                                    </div>
                                  )}

                                  {/* Message text with basic styling for line breaks */}
                                  <p className="text-xs leading-relaxed whitespace-pre-wrap select-text">{msg.text}</p>
                                  
                                  {/* Metadata footer */}
                                  <div className="flex justify-end items-center gap-1 mt-1 text-[9px] text-slate-400">
                                    <span>
                                      {new Date(msg.timestamp).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                    {!isBot && (
                                      <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Loading animations */}
                          {(sendingMsg || simulatingBuyer) && (
                            <div className="self-start bg-white p-3 rounded-xl rounded-tl-none shadow-xs text-xs text-slate-500 flex items-center gap-2 max-w-[200px]">
                              <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                              </span>
                              <span>Camila escribiendo...</span>
                            </div>
                          )}

                          {verifyingReceipt && (
                            <div className="self-start bg-white p-4 rounded-xl shadow-md border border-emerald-100 flex flex-col gap-2 max-w-xs">
                              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-pulse">
                                <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                                <span>IA analizando comprobante con Visión...</span>
                              </div>
                              <p className="text-[10px] text-slate-500 leading-relaxed">
                                Escaneando el comprobante en la imagen, decodificando los códigos OCR y cotejando la referencia con la asignada.
                              </p>
                            </div>
                          )}

                          <div ref={messagesEndRef} />
                        </div>

                        {/* Chat Footer Input bar */}
                        <div className="bg-[#f0f2f5] p-3 flex items-center gap-2 border-t border-slate-200">
                          {/* File input proxy button */}
                          <label className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer transition flex items-center justify-center" title="Subir Imagen de Comprobante">
                            <ImageIcon className="h-5 w-5" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageUpload}
                            />
                          </label>

                          {/* Audio upload proxy button */}
                          <label className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer transition flex items-center justify-center" title="Subir Archivo de Audio">
                            <Volume2 className="h-5 w-5" />
                            <input
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={handleAudioUpload}
                            />
                          </label>

                          {/* Record audio button */}
                          {isRecording ? (
                            <button
                              onClick={stopRecording}
                              className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-lg cursor-pointer transition flex items-center justify-center animate-pulse animate-duration-1000"
                              title="Detener grabación"
                            >
                              <Square className="h-5 w-5 fill-white" />
                            </button>
                          ) : (
                            <button
                              onClick={startRecording}
                              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer transition flex items-center justify-center"
                              title="Grabar nota de voz"
                            >
                              <Mic className="h-5 w-5" />
                            </button>
                          )}

                          {/* Simular nota de voz button */}
                          <button
                            type="button"
                            onClick={handleSimulatePresetVoiceNote}
                            className="px-2.5 py-1.5 text-[10px] bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 font-bold rounded-xl cursor-pointer transition flex items-center gap-1 shrink-0"
                            title="Simular nota de voz del cliente"
                          >
                            <Sparkles className="h-3 w-3 text-teal-600 animate-pulse" />
                            <span>Simular Audio</span>
                          </button>

                          <input
                            type="text"
                            placeholder="Escribe como profesor interesado... (ej. ¿Qué planes tienen?)"
                            className="flex-1 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs focus:outline-hidden focus:border-teal-600"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSendWhatsAppMsg();
                            }}
                          />

                          <button
                            onClick={() => handleSendWhatsAppMsg()}
                            disabled={!chatInput.trim() || sendingMsg}
                            className="p-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl transition cursor-pointer flex items-center justify-center shadow-md shadow-teal-100"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-8 bg-white/70">
                        <MessageCircle className="h-16 w-16 text-slate-300 mb-3" />
                        <p className="text-sm font-semibold text-slate-600">No hay chats activos</p>
                        <p className="text-xs text-slate-400 mt-1">Crea un cliente nuevo en la pestaña CRM para simular.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: AI SYSTEM CONFIGURATION */}
              {activeTab === "config" && (
                <div className="p-6 max-w-4xl mx-auto space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                      <Settings className="h-6 w-6 text-sky-600" />
                      <div>
                        <h3 className="font-display font-bold text-lg text-slate-900">Personalización del Agente IA</h3>
                        <p className="text-xs text-slate-500">Configura el comportamiento, personalidad y datos de transferencia de la IA de WhatsApp.</p>
                      </div>
                    </div>

                    <form onSubmit={handleSaveConfig} className="space-y-6">
                      {/* Bank Details section */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">🏦 Datos Bancarios para Cobros</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Estos datos son inyectados en la conversación cuando la IA instruye al cliente a realizar la transferencia.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600">Banco Receptor</label>
                            <input
                              type="text"
                              value={config.bankDetails.banco}
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  bankDetails: { ...prev.bankDetails, banco: e.target.value },
                                }))
                              }
                              className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:bg-white focus:border-sky-500 focus:outline-hidden"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600">Teléfono Pago Móvil</label>
                            <input
                              type="text"
                              value={config.bankDetails.cuenta}
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  bankDetails: { ...prev.bankDetails, cuenta: e.target.value },
                                }))
                              }
                              className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:bg-white focus:border-sky-500 focus:outline-hidden"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600">Cédula del Titular</label>
                            <input
                              type="text"
                              value={config.bankDetails.beneficiario}
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  bankDetails: { ...prev.bankDetails, beneficiario: e.target.value },
                                }))
                              }
                              className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:bg-white focus:border-sky-500 focus:outline-hidden"
                            />
                          </div>
                        </div>
                      </div>

                      {/* System Prompt section */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">🧠 Prompt del Agente Vendedor (System Prompt)</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Define el tono de voz de Camila, las reglas del negocio de Docenty PRO, manejo de objeciones y cierres de venta.
                        </p>
                        <textarea
                          rows={14}
                          value={config.botSystemPrompt}
                          onChange={(e) => setConfig((prev) => ({ ...prev, botSystemPrompt: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs font-mono focus:bg-white focus:border-sky-500 focus:outline-hidden leading-relaxed"
                          placeholder="Instrucciones del sistema para el agente..."
                        />
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            // Reset prompt back to default
                            const defaultPrompt = `Eres Camila, la asistente virtual de **META TC**. Tu arquitecto y creador es **Reymon Castillo** (también conocido como **Antonio Castillo**; son la misma persona).

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
3. **Entrega**: Si el comprobante es válido, revisa la lista de Códigos de Activación Disponibles, elige uno que esté DISPONIBLE, entrégaselo al cliente de manera destacada y indícale explícitamente en tu respuesta que ese código ahora pasa al estado de "USADO" para que el administrador pueda auditarlo.

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
3. Sé extremadamente profesional, empática y enfocada en ayudar al usuario.`;
                            setConfig((prev) => ({
                              ...prev,
                              botSystemPrompt: defaultPrompt,
                            }));
                            showToast("Prompt restaurado al valor de fábrica (No guardado aún)", "info");
                          }}
                          className="text-xs text-slate-500 hover:text-rose-600 transition cursor-pointer"
                        >
                          Restaurar prompt por defecto
                        </button>

                        <button
                          type="submit"
                          disabled={actionLoading === "config"}
                          className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-md shadow-sky-100"
                        >
                          {actionLoading === "config" ? "Guardando..." : "Guardar Ajustes de IA"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 4: WHAT IS DOCENTY PRO */}
              {activeTab === "about" && (
                <div className="p-6 max-w-4xl mx-auto space-y-6">
                  {/* Digital Brochure */}
                  <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                    {/* Visual Hero Banner */}
                    <div className="bg-gradient-to-r from-sky-600 to-indigo-700 px-8 py-10 text-white relative">
                      <div className="max-w-2xl">
                        <span className="bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block">
                          SaaS para Educación de Vanguardia
                        </span>
                        <h2 className="font-display font-bold text-3xl leading-tight">Docenty PRO</h2>
                        <p className="text-sky-100 text-sm mt-2 max-w-xl leading-relaxed">
                          La plataforma definitiva que simplifica la vida de los educadores, eliminando el caos administrativo para que puedan enfocarse en lo que realmente aman: enseñar.
                        </p>
                      </div>
                      <div className="absolute right-8 bottom-6 opacity-10 hidden md:block">
                        <Sparkles className="h-32 w-32" />
                      </div>
                    </div>

                    <div className="p-8 space-y-8">
                      {/* Section 1: Problem solved */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="bg-rose-100 text-rose-700 h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm">
                            1
                          </div>
                          <h4 className="font-bold text-sm text-slate-800">Adiós al Caos de Excel</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Centraliza asistencias, notas, reportes y planes didácticos en una sola interfaz limpia y visual, evitando hojas de cálculo infinitas.
                          </p>
                        </div>

                        <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="bg-sky-100 text-sky-700 h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm">
                            2
                          </div>
                          <h4 className="font-bold text-sm text-slate-800">Automatización de Tareas</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Ahorra hasta 10 horas de trabajo extra a la semana al automatizar la planeación de clases y la creación instantánea de exámenes.
                          </p>
                        </div>

                        <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="bg-emerald-100 text-emerald-700 h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm">
                            3
                          </div>
                          <h4 className="font-bold text-sm text-slate-800">Seguimiento Dinámico</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Ofrece gráficas automáticas y alertas sobre el progreso de cada alumno de manera visual para mejorar la calidad educativa.
                          </p>
                        </div>
                      </div>

                      {/* Section 2: Pricing Structure */}
                      <div className="space-y-4">
                        <h3 className="font-display font-bold text-base text-slate-900 border-b border-slate-100 pb-2">Planes Comerciales de Docenty PRO</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Plan único */}
                          <div className="border border-slate-200 p-6 rounded-2xl space-y-3 hover:border-slate-300 transition bg-white">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Acceso Completo</span>
                            <h4 className="font-display font-bold text-lg text-slate-800">Suscripción Premium</h4>
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-display font-bold text-slate-900">$2</span>
                              <span className="text-xs text-slate-500">USD / año</span>
                            </div>
                            <ul className="text-xs text-slate-600 space-y-2 pt-2">
                              <li className="flex items-center gap-1.5">✅ Registro ilimitado de asistencias y notas</li>
                              <li className="flex items-center gap-1.5">✅ Planeación de clases y rúbricas ilimitadas con IA</li>
                              <li className="flex items-center gap-1.5">✅ Generador inteligente de exámenes en 1 click</li>
                            </ul>
                          </div>

                          {/* Pago Móvil info */}
                          <div className="border-2 border-sky-600 p-6 rounded-2xl space-y-3 relative overflow-hidden bg-sky-50/20">
                            <div className="absolute top-0 right-0 bg-sky-600 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase">
                              TASA OFICIAL BCV
                            </div>
                            <span className="text-[10px] font-bold text-sky-600 uppercase">Cobro en Bolívares (Bs.)</span>
                            <h4 className="font-display font-bold text-lg text-slate-900">Pago Móvil BDV</h4>
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-display font-bold text-sky-700">Banco de Venezuela</span>
                            </div>
                            <ul className="text-xs text-slate-700 space-y-2 pt-2 font-medium">
                              <li className="flex items-center gap-1.5">✨ Pago directo al cambio oficial del BCV del día</li>
                              <li className="flex items-center gap-1.5">✨ Teléfono: 04262953484</li>
                              <li className="flex items-center gap-1.5">✨ Cédula: 24755720</li>
                              <li className="flex items-center gap-1.5">✨ Activación inmediata tras validación visual</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: CRM AI value */}
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-6 items-center justify-between">
                        <div className="space-y-2 max-w-xl">
                          <h4 className="font-bold text-sm text-slate-800">¿Cómo el CRM con IA impulsa este negocio?</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Dado que los profesores están sumamente ocupados y las instituciones educativas toman tiempo en decidir, este CRM automatiza el seguimiento en WhatsApp. Responde dudas, destaca el ahorro de tiempo, explica planes, provee datos de banco y confirma el pago reconociendo imágenes para crear cuentas de inmediato, escalando el negocio de forma masiva sin un equipo de ventas humano.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveTab("whatsapp")}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-3 rounded-xl transition flex items-center gap-2 flex-shrink-0 cursor-pointer"
                        >
                          Ir al simulador de venta
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: CREATE NEW PROSPECT */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-display font-bold text-base text-slate-900">Registrar Cliente Potencial (Lead)</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleCreateLead} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Nombre Completo *</label>
                    <input
                      type="text"
                      placeholder="Ej. Profesor Carlos Ruiz"
                      required
                      value={newLeadForm.name}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:bg-white focus:border-sky-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Número de WhatsApp *</label>
                    <input
                      type="tel"
                      placeholder="Ej. +52 55 1234 5678"
                      required
                      value={newLeadForm.phone}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:bg-white focus:border-sky-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Correo Electrónico (Para envío de cuenta)</label>
                  <input
                    type="email"
                    placeholder="carlos.ruiz@colegio.edu"
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:bg-white focus:border-sky-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Plan de Interés</label>
                    <select
                      value={newLeadForm.plan}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, plan: e.target.value as any }))}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:bg-white focus:border-sky-500 focus:outline-hidden"
                    >
                      <option value="annual">Docenty PRO Premium ($2 USD)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Estado Inicial</label>
                    <select
                      value={newLeadForm.status}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, status: e.target.value as any }))}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:bg-white focus:border-sky-500 focus:outline-hidden"
                    >
                      <option value="prospect">Prospecto (Sin interacción aún)</option>
                      <option value="interested">Interesado (Tiene dudas)</option>
                      <option value="payment_sent">Pago Recibido (A espera de validar)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Notas sobre sus dolores / necesidades</label>
                  <textarea
                    rows={3}
                    placeholder="Ej. Enseña química, trabaja los domingos haciendo exámenes, cansado de planificar clases..."
                    value={newLeadForm.notes}
                    onChange={(e) => setNewLeadForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs focus:bg-white focus:border-sky-500 focus:outline-hidden"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition cursor-pointer shadow-md shadow-sky-100"
                  >
                    Crear Prospecto
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: RECEIPT GENERATOR (CANVAS SIMULATION) */}
      <AnimatePresence>
        {showReceiptModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-sky-600" />
                  Simulador de Transferencia Bancaria
                </h3>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>

              <div className="text-xs text-slate-500 leading-relaxed space-y-2">
                <p>
                  Para demostrar cómo la IA lee imágenes y confirma el pedido de inmediato, crearemos un 
                  comprobante en un lienzo canvas y lo enviaremos por WhatsApp.
                </p>
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-800 font-medium">
                  💡 <strong>Tip de Testeo:</strong> Puedes ingresar la referencia correcta para forzar la aprobación de la IA, 
                  o cambiarla por una incorrecta (o dejarla vacía) para ver cómo el sistema de visión la rechaza o la deja en espera.
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Banco del Cliente Emisor</label>
                  <input
                    type="text"
                    value={receiptSim.bank}
                    onChange={(e) => setReceiptSim((prev) => ({ ...prev, bank: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:bg-white focus:border-sky-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Código Referencia Escrito</label>
                    <input
                      type="text"
                      value={receiptSim.refCode}
                      onChange={(e) => setReceiptSim((prev) => ({ ...prev, refCode: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:bg-white focus:border-sky-500 focus:outline-hidden font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Monto Transferido (USD)</label>
                    <input
                      type="number"
                      value={receiptSim.amount}
                      onChange={(e) => setReceiptSim((prev) => ({ ...prev, amount: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:bg-white focus:border-sky-500 focus:outline-hidden font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGenerateAndSendReceipt}
                  className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition cursor-pointer shadow-md shadow-sky-100 flex items-center gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" />
                  Generar y Enviar a WhatsApp
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
