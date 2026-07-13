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
  ArrowLeft,
  Link,
  Key,
  Bell,
  Download,
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
    premiumCodes: [],
  });

  // Chat input
  const [chatInput, setChatInput] = useState<string>("");
  const [newCodeInput, setNewCodeInput] = useState<string>("");

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
  const [mobileChatView, setMobileChatView] = useState<"list" | "chat">("list");
  const [approvingLeadId, setApprovingLeadId] = useState<string | null>(null);
  const [assocClientRefs, setAssocClientRefs] = useState<Record<string, string>>({});
  const [assocBankRefs, setAssocBankRefs] = useState<Record<string, string>>({});
  const [associatingKey, setAssociatingKey] = useState<string | null>(null);

  // Notifications / Feedback
  const [notification, setNotification] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const [liveAlert, setLiveAlert] = useState<{
    leadId: string;
    name: string;
    text: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialSyncDone = useRef(false);
  const [notifPermission, setNotifPermission] = useState<string>("default");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Play an elegant, clean high-pitch synthesizer chime
  const playNotificationChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      
      // Tone 1 (D5 to A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);
      osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.15);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Tone 2 (A5 to D6 - slight delay)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880.00, now + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25);
      gain2.gain.setValueAtTime(0.08, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.5);
    } catch (e) {
      console.error("Failed to play synth chime:", e);
    }
  };

  // Fetch initial data
  useEffect(() => {
    fetchLeads();
    fetchConfig();

    // Request native browser notifications permission
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
      if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => {
          setNotifPermission(perm);
        });
      }
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      showToast("Este navegador no soporta notificaciones", "error");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === "granted") {
        showToast("¡Notificaciones activadas con éxito! 🎉", "success");
        new Notification("Docenty PRO", {
          body: "Las notificaciones están activadas para avisarte de nuevos chats.",
          icon: "/favicon.ico"
        });
        playNotificationChime();
      } else if (permission === "denied") {
        showToast("El permiso fue denegado. Por favor, actívalas en los ajustes de tu navegador.", "error");
      }
    } catch (err) {
      console.error("Error requesting notification permission:", err);
    }
  };

  const handleExportBackup = () => {
    try {
      const dataStr = JSON.stringify(leads, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `docenty_crm_respaldo_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Copia de seguridad descargada exitosamente en tu dispositivo. ¡Consérvala segura! 📥", "success");
    } catch (err: any) {
      showToast(`Error al descargar respaldo: ${err.message}`, "error");
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedLeads = JSON.parse(event.target?.result as string);
        if (!Array.isArray(importedLeads)) {
          throw new Error("El archivo no contiene un formato de respaldo válido (debe ser una lista).");
        }
        
        // Validation check
        const isValid = importedLeads.every(l => l.id && l.name && l.phone);
        if (!isValid) {
          throw new Error("El archivo de respaldo tiene un formato incompatible.");
        }
        
        // Save locally
        localStorage.setItem("docenty_crm_leads", JSON.stringify(importedLeads));
        setLeads(importedLeads);
        
        // Sync to server
        showToast("Sincronizando copia de seguridad con el servidor...", "info");
        const restoreRes = await fetch("/api/restore-leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leads: importedLeads })
        });
        
        if (restoreRes.ok) {
          showToast("¡Copia de seguridad restaurada y sincronizada correctamente! 🎉", "success");
          if (importedLeads.length > 0) {
            setSelectedLeadId(importedLeads[0].id);
          }
        } else {
          showToast("Respaldo cargado localmente, pero falló la sincronización con el servidor.", "info");
        }
      } catch (err: any) {
        showToast(`Error al restaurar copia de seguridad: ${err.message}`, "error");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Clear file input
  };

  // WebSocket connection for real-time monitoring
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`;

    let socket: WebSocket;

    function connect() {
      console.log("[WebSocket] Connecting to", wsUrl);
      socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "lead:updated") {
            const updatedLead = data.payload;
            
            // Check if this is an incoming client message to trigger sounds and real-time alerts
            if (updatedLead.messages && updatedLead.messages.length > 0) {
              const lastMsg = updatedLead.messages[updatedLead.messages.length - 1];
              if (lastMsg.sender === "client") {
                // Play notification sound
                playNotificationChime();

                // Trigger native system/mobile browser notification if supported and granted
                if ("Notification" in window && Notification.permission === "granted") {
                  try {
                    new Notification(`💬 Nuevo chat: ${updatedLead.name}`, {
                      body: lastMsg.text,
                      tag: `chat-${updatedLead.id}`,
                      requireInteraction: false
                    });
                    if ("vibrate" in navigator) {
                      navigator.vibrate([100, 50, 100]);
                    }
                  } catch (nErr) {
                    console.error("Native Notification failed:", nErr);
                  }
                }

                // Show visual floating bubble/banner in-app
                setLiveAlert({
                  leadId: updatedLead.id,
                  name: updatedLead.name,
                  text: lastMsg.text
                });
              }
            }

            setLeads((prevLeads) => {
              const index = prevLeads.findIndex((l) => l.id === updatedLead.id);
              if (index !== -1) {
                const newLeads = [...prevLeads];
                newLeads[index] = {
                  ...newLeads[index],
                  ...updatedLead
                };
                return newLeads;
              } else {
                return [updatedLead, ...prevLeads];
              }
            });
          }

          if (data.type === "lead:deleted") {
            const deletedId = data.payload;
            setLeads((prevLeads) => prevLeads.filter((l) => l.id !== deletedId));
            setSelectedLeadId((currentId) => currentId === deletedId ? null : currentId);
          }
        } catch (err) {
          console.error("[WebSocket] Error processing message:", err);
        }
      };

      socket.onclose = () => {
        console.log("[WebSocket] Connection closed. Retrying in 3 seconds...");
        setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.error("[WebSocket] Socket error:", err);
        socket.close();
      };
    }

    connect();

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  // Scroll to bottom on chat changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [leads, selectedLeadId, activeTab]);

  // Keep localStorage in sync with leads updates once initial sync is done
  useEffect(() => {
    if (initialSyncDone.current) {
      localStorage.setItem("docenty_crm_leads", JSON.stringify(leads));
    }
  }, [leads]);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/leads");
      if (res.ok) {
        const serverLeads = await res.json();
        
        if (!initialSyncDone.current) {
          initialSyncDone.current = true;
          const localLeadsStr = localStorage.getItem("docenty_crm_leads");
          if (localLeadsStr) {
            try {
              const localLeads = JSON.parse(localLeadsStr);
              if (Array.isArray(localLeads) && localLeads.length > 0) {
                const serverIds = new Set(serverLeads.map((l: any) => l.id));
                const missingLeads = localLeads.filter((l: any) => !serverIds.has(l.id));
                
                if (missingLeads.length > 0) {
                  console.log("[Sync Engine] Restoring missing leads to server:", missingLeads);
                  const restoreRes = await fetch("/api/restore-leads", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ leads: missingLeads })
                  });
                  
                  if (restoreRes.ok) {
                    const mergeRes = await fetch("/api/leads");
                    if (mergeRes.ok) {
                      const mergedData = await mergeRes.json();
                      setLeads(mergedData);
                      localStorage.setItem("docenty_crm_leads", JSON.stringify(mergedData));
                      if (mergedData.length > 0 && !selectedLeadId) {
                        setSelectedLeadId(mergedData[0].id);
                      }
                      return;
                    }
                  }
                }
              }
            } catch (err) {
              console.error("[Sync Engine] Failed to sync from localStorage:", err);
            }
          }
        }
        
        setLeads(serverLeads);
        localStorage.setItem("docenty_crm_leads", JSON.stringify(serverLeads));
        if (serverLeads.length > 0 && !selectedLeadId) {
          setSelectedLeadId(serverLeads[0].id);
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

  // Reset database (Empty CRM and delete all history)
  const handleResetDb = async () => {
    if (!confirm("¿Desea vaciar por completo la base de datos del CRM? Esto eliminará todos los prospectos, chats e historial de manera permanente.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
        localStorage.removeItem("docenty_crm_leads");
        setSelectedLeadId(null);
        showToast("Base de datos del CRM vaciada con éxito");
      }
    } catch (e) {
      showToast("Error al reiniciar la base de datos", "error");
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

  const handleAddPremiumCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCodeInput.trim()) return;
    const codesToAdd = newCodeInput
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    const updatedCodes = [...(config.premiumCodes || [])];
    let addedCount = 0;
    codesToAdd.forEach((code) => {
      if (!updatedCodes.includes(code)) {
        updatedCodes.push(code);
        addedCount++;
      }
    });

    setConfig((prev) => ({
      ...prev,
      premiumCodes: updatedCodes,
    }));
    setNewCodeInput("");
    if (addedCount > 0) {
      showToast(`${addedCount} código(s) añadido(s) (guardar para aplicar)`);
    } else {
      showToast("Los códigos ya existen en la lista", "info");
    }
  };

  const handleRemovePremiumCode = (codeToRemove: string) => {
    setConfig((prev) => ({
      ...prev,
      premiumCodes: (prev.premiumCodes || []).filter((c) => c !== codeToRemove),
    }));
    showToast("Código eliminado (guardar para aplicar)");
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

  const handleSendManualMsg = async () => {
    if (!chatInput.trim() || !selectedLeadId) return;

    setSendingMsg(true);
    const msgText = chatInput;
    setChatInput("");

    try {
      // Instantly append operator message in UI for natural feel
      setLeads((prev) =>
        prev.map((l) => {
          if (l.id === selectedLeadId) {
            return {
              ...l,
              messages: [
                ...l.messages,
                {
                  sender: "bot",
                  text: msgText,
                  timestamp: new Date().toISOString(),
                },
              ],
            };
          }
          return l;
        })
      );

      const res = await fetch(`/api/leads/${selectedLeadId}/manual-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msgText }),
      });

      if (res.ok) {
        const data = await res.json();
        setLeads((prev) => prev.map((l) => (l.id === selectedLeadId ? data.lead : l)));
      } else {
        showToast("Error al enviar mensaje manual", "error");
      }
    } catch (e) {
      showToast("Error de conexión", "error");
    } finally {
      setSendingMsg(false);
    }
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

  // Handle manual payment approval
  const handleApprovePayment = async (leadId: string) => {
    if (approvingLeadId) return;
    setApprovingLeadId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        setLeads((prev) => prev.map((l) => (l.id === leadId ? data.lead : l)));
        showToast("Pago verificado y aprobado manualmente con éxito", "success");
      } else {
        const errData = await res.json();
        showToast(errData.error || "Error al aprobar pago", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error de conexión al aprobar el pago", "error");
    } finally {
      setApprovingLeadId(null);
    }
  };

  // Handle manual reference association
  const handleAssociatePayment = async (leadId: string, clientRef: string, bankRef: string, messageIndex: number) => {
    const key = `${leadId}-${messageIndex}`;
    if (associatingKey) return;
    setAssociatingKey(key);
    try {
      const res = await fetch(`/api/leads/${leadId}/associate-reference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientRef, bankRef, messageIndex }),
      });

      if (res.ok) {
        const data = await res.json();
        // Refresh leads list to keep frontend perfectly in sync
        await fetchLeads();
        showToast("¡Referencia asociada y cuenta Premium activada con éxito!", "success");
      } else {
        const errData = await res.json();
        showToast(errData.error || "Error al asociar referencia", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error de conexión al asociar el pago", "error");
    } finally {
      setAssociatingKey(null);
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
    <div className="min-h-screen bg-carbon flex flex-col font-sans antialiased text-zinc-100" id="crm-app-root">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 max-w-md ${
              notification.type === "success"
                ? "bg-teal-950 border-teal-800/80 text-teal-200 shadow-teal-950/40"
                : notification.type === "error"
                ? "bg-rose-950 border-rose-900/80 text-rose-200 shadow-rose-950/40"
                : "bg-zinc-900 border-zinc-800 text-zinc-200 shadow-black/40"
            }`}
          >
            {notification.type === "success" ? (
              <CircleCheck className="h-5 w-5 text-teal-400 flex-shrink-0" />
            ) : notification.type === "error" ? (
              <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-zinc-400 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{notification.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time Incoming Chat Alert Bubble */}
      <AnimatePresence>
        {liveAlert && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            className="fixed top-20 right-4 z-50 p-4 rounded-xl shadow-2xl bg-[#09090b] border-2 border-teal-500/80 text-white max-w-md w-[calc(100vw-32px)] sm:w-[380px] shadow-teal-500/10"
          >
            <div className="flex justify-between items-start gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                </span>
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest font-mono">¡CHAT ACTIVO EN TIEMPO REAL!</span>
              </div>
              <button 
                onClick={() => setLiveAlert(null)}
                className="text-zinc-500 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <h5 className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
              💬 {liveAlert.name}
            </h5>
            <p className="text-xs text-zinc-300 mt-1 line-clamp-2 italic bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/40">
              "{liveAlert.text}"
            </p>
            
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setLiveAlert(null)}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 transition font-medium cursor-pointer"
              >
                Ignorar
              </button>
              <button
                onClick={() => {
                  setSelectedLeadId(liveAlert.leadId);
                  setActiveTab("whatsapp");
                  setMobileChatView("chat");
                  setLiveAlert(null);
                  
                  // Highlight visually or scroll
                  setTimeout(() => {
                    const scrollElem = document.getElementById("whatsapp-messages-container");
                    if (scrollElem) {
                      scrollElem.scrollTop = scrollElem.scrollHeight;
                    }
                  }, 100);
                }}
                className="bg-teal-500 hover:bg-teal-600 text-black font-bold text-[11px] px-3.5 py-1.5 rounded-lg shadow-md hover:shadow-teal-500/20 transition flex items-center gap-1 cursor-pointer"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Monitorear Chat
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-[#121212]/90 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-20" id="app-header">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-teal-600 text-white p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl shadow-md shadow-teal-950/40 flex items-center justify-center">
            <Sparkles className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-display font-bold text-base sm:text-xl tracking-tight text-white">Docenty PRO</h1>
              <span className="bg-teal-950/60 text-teal-300 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border border-teal-800/50">CRM IA</span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">Gestor de WhatsApp & Ventas SaaS en Piloto Automático</p>
          </div>
        </div>

        {/* Top bar controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleResetDb}
            className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-teal-400 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg font-medium transition cursor-pointer"
            title="Restablecer base de datos con leads demo"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reiniciar Demo</span>
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 text-xs text-white bg-teal-600 hover:bg-teal-700 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg font-semibold transition cursor-pointer shadow-md shadow-teal-950/40"
            title="Crear un nuevo lead"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo Lead</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="hidden md:flex w-64 bg-[#121212]/90 border-r border-zinc-800/80 flex-col justify-between" id="app-sidebar">
          <div className="p-4 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-3 mb-2">Módulos</p>
            
            <button
              onClick={() => setActiveTab("crm")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === "crm"
                  ? "bg-teal-950/50 text-teal-400 border-l-2 border-teal-500 font-semibold"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Embudo CRM Leads</span>
              <span className="ml-auto bg-zinc-800 text-zinc-300 text-xs font-bold px-2 py-0.5 rounded-full">
                {leads.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("whatsapp")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === "whatsapp"
                  ? "bg-teal-950/50 text-teal-400 border-l-2 border-teal-500 font-semibold"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>WhatsApp</span>
              {pendingPayments > 0 && (
                <span className="ml-auto bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {pendingPayments}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("config")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === "config"
                  ? "bg-teal-950/50 text-teal-400 border-l-2 border-teal-500 font-semibold"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Ajustes del Agente AI</span>
            </button>

            <button
              onClick={() => setActiveTab("about")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                activeTab === "about"
                  ? "bg-teal-950/50 text-teal-400 border-l-2 border-teal-500 font-semibold"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>¿Qué es Docenty PRO?</span>
            </button>
          </div>

          {/* Connected Device Card (WhatsApp) */}
          <div className="p-4 border-t border-zinc-800/80">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
                <span className="text-[11px] font-bold text-zinc-300 uppercase">WhatsApp Conectado</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-2">
                La IA está escuchando mensajes entrantes de clientes interesados en Docenty PRO.
              </p>
              <div className="text-[10px] font-mono bg-black/40 border border-zinc-800 p-1.5 rounded text-teal-400">
                Línea: +1 (555) 234-AI56
              </div>
            </div>
          </div>
        </aside>

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto bg-carbon pb-20 md:pb-0">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <RefreshCw className="h-8 w-8 text-teal-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-zinc-400">Cargando base de datos del CRM...</p>
            </div>
          ) : (
            <div className="h-full">
              {/* TAB 1: CRM LEAD MANAGER */}
              {activeTab === "crm" && (
                <div className="p-6 max-w-7xl mx-auto space-y-6">
                  {/* Dashboard Hero stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    <div className="bg-[#121212]/90 p-3 sm:p-4 rounded-2xl border border-zinc-800/80 shadow-xs flex items-center justify-between">
                      <div>
                        <p className="text-[10px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Leads</p>
                        <h3 className="text-xl sm:text-2xl font-display font-bold text-white mt-1">{totalLeads}</h3>
                      </div>
                      <div className="bg-zinc-800/60 p-2 sm:p-2.5 rounded-xl text-zinc-300">
                        <Users className="h-4 sm:h-5 w-4 sm:w-5" />
                      </div>
                    </div>

                    <div className="bg-[#121212]/90 p-3 sm:p-4 rounded-2xl border border-zinc-800/80 shadow-xs flex items-center justify-between">
                      <div>
                        <p className="text-[10px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tasa Conv.</p>
                        <h3 className="text-xl sm:text-2xl font-display font-bold text-teal-400 mt-1">{conversionRate}%</h3>
                      </div>
                      <div className="bg-teal-950/40 p-2 sm:p-2.5 rounded-xl text-teal-400 border border-teal-900/30">
                        <TrendingUp className="h-4 sm:h-5 w-4 sm:w-5" />
                      </div>
                    </div>

                    <div className="bg-[#121212]/90 p-3 sm:p-4 rounded-2xl border border-zinc-800/80 shadow-xs flex items-center justify-between">
                      <div>
                        <p className="text-[10px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wider">Premium Act.</p>
                        <h3 className="text-xl sm:text-2xl font-display font-bold text-teal-400 mt-1">{activeSubscribers}</h3>
                      </div>
                      <div className="bg-teal-950/40 p-2 sm:p-2.5 rounded-xl text-teal-400 border border-teal-900/30">
                        <ShieldCheck className="h-4 sm:h-5 w-4 sm:w-5" />
                      </div>
                    </div>

                    <div className="bg-[#121212]/90 p-3 sm:p-4 rounded-2xl border border-zinc-800/80 shadow-xs flex items-center justify-between">
                      <div>
                        <p className="text-[10px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pend. Pago</p>
                        <h3 className="text-xl sm:text-2xl font-display font-bold text-amber-400 mt-1">{pendingPayments}</h3>
                      </div>
                      <div className="bg-amber-950/40 p-2 sm:p-2.5 rounded-xl text-amber-400 border border-amber-900/30">
                        <CreditCard className="h-4 sm:h-5 w-4 sm:w-5" />
                      </div>
                    </div>

                    <div className="col-span-2 sm:col-span-1 bg-[#121212]/90 p-3 sm:p-4 rounded-2xl border border-zinc-800/80 shadow-xs flex items-center justify-between">
                      <div>
                        <p className="text-[10px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wider">Ingreso Anual ARR</p>
                        <h3 className="text-xl sm:text-2xl font-display font-bold text-white mt-1">${potentialArr} USD</h3>
                      </div>
                      <div className="bg-zinc-800/60 p-2 sm:p-2.5 rounded-xl text-zinc-300">
                        <Sparkles className="h-4 sm:h-5 w-4 sm:w-5" />
                      </div>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="bg-[#121212]/90 p-4 rounded-2xl border border-zinc-800/80 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
                    {/* Search input */}
                    <div className="relative w-full sm:w-80">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre o teléfono..."
                        value={crmSearch}
                        onChange={(e) => setCrmSearch(e.target.value)}
                        className="pl-9 pr-4 py-1.5 w-full bg-zinc-900/60 focus:bg-zinc-900 border border-zinc-800 focus:border-teal-500 focus:outline-hidden rounded-lg text-sm text-white placeholder-zinc-500 transition"
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
                              ? "bg-teal-600 text-white"
                              : "bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 border border-zinc-700/50"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Leads Table/Card View */}
                  <div className="bg-[#121212]/90 rounded-2xl border border-zinc-800/80 overflow-hidden shadow-xs">
                    <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between">
                      <h3 className="font-display font-bold text-base text-white">Listado de Clientes en Embudo</h3>
                      <span className="text-xs font-semibold text-zinc-400">Mostrando {filteredLeads.length} leads</span>
                    </div>

                    {filteredLeads.length === 0 ? (
                      <div className="p-12 text-center">
                        <Users className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-zinc-400">No se encontraron prospectos</p>
                        <p className="text-xs text-zinc-500 mt-1">Prueba cambiando los filtros o agrega un prospecto nuevo.</p>
                      </div>
                    ) : (
                      <>
                        {/* Desktop View Table */}
                        <div className="hidden md:block divide-y divide-zinc-800/50 overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                              <tr className="bg-zinc-900/40 text-zinc-400 text-xs font-bold uppercase tracking-wider border-b border-zinc-800/80">
                                <th className="px-6 py-3">Cliente</th>
                                <th className="px-6 py-3">Estado Embudo</th>
                                <th className="px-6 py-3">Plan de Interés</th>
                                <th className="px-6 py-3">Código Ref Unico</th>
                                <th className="px-6 py-3">Último Mensaje</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/30 text-sm">
                              {filteredLeads.map((lead) => (
                                <tr
                                  key={lead.id}
                                  onClick={() => {
                                    setSelectedLeadId(lead.id);
                                    setActiveTab("whatsapp");
                                    setMobileChatView("chat");
                                  }}
                                  className="hover:bg-zinc-800/40 transition cursor-pointer group"
                                >
                                  <td className="px-6 py-4">
                                    <div className="font-bold text-white">{lead.name}</div>
                                    <div className="text-xs text-zinc-400 flex flex-col gap-0.5 mt-0.5">
                                      <span>📱 {lead.phone}</span>
                                      {lead.email && <span>✉️ {lead.email}</span>}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                        lead.status === "approved"
                                          ? "bg-teal-950/60 text-teal-300 border border-teal-800/30"
                                          : lead.status === "payment_sent"
                                          ? "bg-amber-950/60 text-amber-300 border border-amber-800/30"
                                          : lead.status === "interested"
                                          ? "bg-zinc-900 text-zinc-300 border border-zinc-800"
                                          : "bg-zinc-900 text-zinc-400 border border-zinc-800/60"
                                      }`}
                                    >
                                      <span
                                        className={`h-1.5 w-1.5 rounded-full ${
                                          lead.status === "approved"
                                            ? "bg-teal-400"
                                            : lead.status === "payment_sent"
                                            ? "bg-amber-400"
                                            : lead.status === "interested"
                                            ? "bg-zinc-400"
                                            : "bg-zinc-500"
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
                                    <span className="font-semibold text-zinc-300 capitalize">
                                      Docenty PRO ($2 USD)
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <code className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-xs font-mono font-bold text-teal-400">
                                      {lead.assignedRef}
                                    </code>
                                  </td>
                                  <td className="px-6 py-4 max-w-[200px] truncate">
                                    {lead.messages.length > 0 ? (
                                      <span className="text-xs text-zinc-400">
                                        {lead.messages[lead.messages.length - 1].text}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-zinc-500 italic">Sin mensajes todavía</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-1.5">
                                      {lead.status !== "approved" && (
                                        <button
                                          onClick={() => handleApprovePayment(lead.id)}
                                          disabled={approvingLeadId === lead.id}
                                          className="p-1.5 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-950/40 rounded-lg transition disabled:opacity-40"
                                          title="Aprobar Pago Manualmente"
                                        >
                                          <CircleCheck className="h-4 w-4" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          setSelectedLeadId(lead.id);
                                          setActiveTab("whatsapp");
                                          setMobileChatView("chat");
                                        }}
                                        className="p-1.5 text-zinc-400 hover:text-teal-400 hover:bg-teal-950/40 rounded-lg transition"
                                        title="Simular chat de WhatsApp"
                                      >
                                        <MessageCircle className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={(e) => handleDeleteLead(lead.id, e)}
                                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
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

                        {/* Mobile View Stacked Cards */}
                        <div className="block md:hidden divide-y divide-zinc-800/40">
                          {filteredLeads.map((lead) => {
                            const lastMsg = lead.messages[lead.messages.length - 1];
                            return (
                              <div
                                key={lead.id}
                                onClick={() => {
                                  setSelectedLeadId(lead.id);
                                  setActiveTab("whatsapp");
                                  setMobileChatView("chat");
                                }}
                                className="p-4 bg-[#121212]/40 active:bg-zinc-900/40 transition cursor-pointer flex flex-col gap-3"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-bold text-sm text-white">{lead.name}</h4>
                                    <p className="text-xs text-zinc-400 mt-0.5">📱 {lead.phone}</p>
                                  </div>
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                      lead.status === "approved"
                                        ? "bg-teal-950/60 text-teal-300 border border-teal-800/30"
                                        : lead.status === "payment_sent"
                                        ? "bg-amber-950/60 text-amber-300 border border-amber-800/30"
                                        : lead.status === "interested"
                                        ? "bg-zinc-900 text-zinc-300 border border-zinc-800"
                                        : "bg-zinc-900 text-zinc-400 border border-zinc-800/60"
                                    }`}
                                  >
                                    {lead.status === "approved"
                                      ? "Activo"
                                      : lead.status === "payment_sent"
                                      ? "Pago Recibido"
                                      : lead.status === "interested"
                                      ? "Interesado"
                                      : "Prospecto"}
                                  </span>
                                </div>

                                <div className="flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-zinc-500">Ref:</span>
                                    <code className="bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-teal-400">
                                      {lead.assignedRef}
                                    </code>
                                  </div>
                                  <span className="text-zinc-400 capitalize font-medium">Docenty PRO Premium</span>
                                </div>

                                {lastMsg ? (
                                  <div className="bg-zinc-950/40 border border-zinc-800/50 p-2 rounded-lg text-xs text-zinc-400 truncate">
                                    <span className="text-zinc-500 font-medium">Último:</span> {lastMsg.text}
                                  </div>
                                ) : (
                                  <div className="text-xs text-zinc-500 italic">Sin mensajes todavía</div>
                                )}

                                <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-800/20" onClick={(e) => e.stopPropagation()}>
                                  {lead.status !== "approved" && (
                                    <button
                                      onClick={() => handleApprovePayment(lead.id)}
                                      disabled={approvingLeadId === lead.id}
                                      className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-900/30 transition cursor-pointer disabled:opacity-40"
                                    >
                                      <CircleCheck className="h-3.5 w-3.5" />
                                      Aprobar
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setSelectedLeadId(lead.id);
                                      setActiveTab("whatsapp");
                                      setMobileChatView("chat");
                                    }}
                                    className="flex items-center gap-1 text-xs font-semibold text-teal-400 hover:text-teal-300 px-3 py-1.5 rounded-lg bg-teal-950/30 hover:bg-teal-950/50 border border-teal-900/30 transition cursor-pointer"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    Chatear
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteLead(lead.id, e)}
                                    className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                                    title="Eliminar lead"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: WHATSAPP CHAT SIMULATOR */}
              {activeTab === "whatsapp" && (
                <div className="h-[calc(100vh-137px)] md:h-[calc(100vh-73px)] w-full flex overflow-hidden" id="whatsapp-simulator">
                  {/* Left Column: Chat List */}
                  <div className={`${mobileChatView === "chat" ? "hidden" : "w-full"} md:flex md:w-80 bg-[#121212]/95 border-r border-zinc-800/80 flex flex-col h-full flex-shrink-0`}>
                    {/* Search Chat */}
                    <div className="p-3 border-b border-zinc-800/80">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Buscar conversación..."
                          className="pl-8 pr-3 py-1.5 w-full bg-zinc-900/60 border border-zinc-800 focus:border-teal-500 focus:outline-hidden rounded-lg text-xs text-white placeholder-zinc-500 transition"
                          value={crmSearch}
                          onChange={(e) => setCrmSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Chat selection list */}
                    <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/30">
                      {leads
                        .filter((lead) => lead.name.toLowerCase().includes(crmSearch.toLowerCase()))
                        .map((lead) => {
                          const lastMsg = lead.messages[lead.messages.length - 1];
                          const isSelected = lead.id === selectedLeadId;
                          
                          return (
                            <button
                              key={lead.id}
                              onClick={() => {
                                setSelectedLeadId(lead.id);
                                setMobileChatView("chat");
                              }}
                              className={`w-full p-4 flex gap-3 text-left transition relative cursor-pointer ${
                                isSelected ? "bg-teal-950/40 border-l-4 border-teal-500" : "hover:bg-zinc-800/40"
                              }`}
                            >
                              <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold flex-shrink-0 uppercase text-sm">
                                {lead.name.substring(0, 2)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                  <h4 className="font-semibold text-xs text-white truncate">{lead.name}</h4>
                                  <span className="text-[10px] text-zinc-500">
                                    {lastMsg ? "Reciente" : ""}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-400 truncate mb-1">
                                  {lastMsg ? lastMsg.text : "Sin historial de chat"}
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <code className="text-[9px] font-mono bg-zinc-950 border border-zinc-800 px-1 py-0.2 rounded font-bold text-teal-400">
                                    {lead.assignedRef}
                                  </code>
                                  <span
                                    className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded-full ${
                                      lead.status === "approved"
                                        ? "bg-teal-950/60 text-teal-300 border border-teal-900/30"
                                        : lead.status === "payment_sent"
                                        ? "bg-amber-950/60 text-amber-300 border border-amber-900/30"
                                        : "bg-zinc-900 text-zinc-400 border border-zinc-800"
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
                  <div className={`${mobileChatView === "list" ? "hidden" : "flex"} flex-1 flex flex-col h-full bg-[#0d0d0d] relative`}>
                    {activeLead ? (
                      <>
                        {/* Chat Header */}
                        <div className="bg-[#121212]/95 text-white px-4 py-2.5 sm:py-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 shadow-xs z-10">
                          <div className="flex items-center">
                            {/* Back to list button on mobile */}
                            <button
                              onClick={() => setMobileChatView("list")}
                              className="md:hidden mr-2 p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition shrink-0 cursor-pointer"
                              title="Volver a la lista de chats"
                            >
                              <ArrowLeft className="h-5 w-5" />
                            </button>

                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-zinc-800 text-teal-400 font-bold flex items-center justify-center text-sm uppercase border border-zinc-700/50 flex-shrink-0">
                                {activeLead.name.substring(0, 2)}
                              </div>
                              <div>
                                <h3 className="font-bold text-xs sm:text-sm text-white">{activeLead.name}</h3>
                                {activeLead.isPaused ? (
                                  <p className="text-[9px] sm:text-[10px] text-amber-400 flex items-center gap-1 font-semibold">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block"></span>
                                    Pausada (Manual)
                                  </p>
                                ) : (
                                  <p className="text-[9px] sm:text-[10px] text-teal-400 flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400 inline-block animate-pulse"></span>
                                    Camila Responde Auto
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Header Action Buttons - scrollable horizontally on mobile to save vertical space */}
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
                            {/* Pause Toggle Button */}
                            <button
                              onClick={async () => {
                                try {
                                  const nextState = !activeLead.isPaused;
                                  const res = await fetch(`/api/leads/${activeLead.id}/pause`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ isPaused: nextState }),
                                  });
                                  if (res.ok) {
                                    const data = await res.json();
                                    setLeads(prev => prev.map(l => l.id === activeLead.id ? data.lead : l));
                                    showToast(nextState ? "Camila pausada. Puedes chatear manualmente." : "Camila reactivada. Responderá automáticamente.", "info");
                                  }
                                } catch (e) {
                                  showToast("Error al cambiar estado de Camila", "error");
                                }
                              }}
                              className={`font-bold text-[10px] sm:text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0 ${
                                activeLead.isPaused
                                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                                  : "bg-teal-600 hover:bg-teal-700 text-white border border-teal-500/30"
                              }`}
                              title={activeLead.isPaused ? "Reactivar Camila" : "Pausar a Camila"}
                            >
                              {activeLead.isPaused ? <Play className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <Square className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                              <span>{activeLead.isPaused ? "Reactivar IA" : "Pausar IA"}</span>
                            </button>

                            {/* Simulator controls */}
                            <button
                              onClick={handleAutoSimulateBuyer}
                              disabled={simulatingBuyer || sendingMsg}
                              className="bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 hover:border-teal-500/50 disabled:opacity-50 text-zinc-100 font-bold text-[10px] sm:text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0"
                              title="Genera un mensaje o duda de forma aleatoria basada en el contexto con Gemini para testear al vendedor AI"
                            >
                              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-teal-400" />
                              <span>{simulatingBuyer ? "Pensando..." : "Simular Objeción"}</span>
                            </button>

                            {activeLead.status !== "approved" && (
                              <button
                                onClick={() => handleApprovePayment(activeLead.id)}
                                disabled={approvingLeadId === activeLead.id}
                                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/50 disabled:opacity-50 text-white font-bold text-[10px] sm:text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0 border border-emerald-500/30 shadow-md animate-pulse hover:animate-none"
                                title="Aprobar el pago de este docente manualmente"
                              >
                                <CircleCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                <span>{approvingLeadId === activeLead.id ? "Aprobando..." : "Aprobar Pago"}</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setReceiptSim((prev) => ({ ...prev, refCode: activeLead.assignedRef }));
                                setShowReceiptModal(true);
                              }}
                              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] sm:text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0"
                              title="Genera una transferencia bancaria con código de referencia"
                            >
                              <CreditCard className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              <span>Simular Pago</span>
                            </button>
                          </div>
                        </div>

                        {/* Leads Context Sidebar Overlay for WhatsApp test */}
                        <div className="bg-[#121212]/80 px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-zinc-300 justify-between">
                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <span>📋 **Notas:** {activeLead.notes || "Sin notas específicas"}</span>
                            <span>🔑 **Ref:** <code className="bg-zinc-950 border border-zinc-800 text-teal-400 px-1 rounded font-bold font-mono">{activeLead.assignedRef}</code></span>
                            <span className="hidden xs:inline">📦 **Plan:** <span className="font-bold capitalize text-teal-400">Premium ($2 USD)</span></span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase self-start sm:self-auto ${
                              activeLead.status === "approved"
                                ? "bg-teal-950/60 text-teal-300 border border-teal-800/30"
                                : activeLead.status === "payment_sent"
                                ? "bg-amber-950/60 text-amber-300 border border-amber-800/30"
                                : "bg-zinc-900 text-zinc-400 border border-zinc-800/60"
                            }`}
                          >
                            Estado: {activeLead.status === "approved" ? "Activo" : activeLead.status === "payment_sent" ? "Verificando" : "Prospecto"}
                          </span>
                        </div>

                        {/* WhatsApp Messages Display */}
                        <div
                          className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col"
                          style={{
                            backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
                            backgroundBlendMode: "multiply",
                            backgroundColor: "#0d0d0d",
                          }}
                        >
                          {/* Alert if no history */}
                          {activeLead.messages.length === 0 && (
                            <div className="bg-[#121212]/85 border border-zinc-800/80 p-4 rounded-xl max-w-sm mx-auto text-center shadow-xs">
                              <MessageSquare className="h-8 w-8 text-teal-400 mx-auto mb-2" />
                              <p className="text-xs font-semibold text-zinc-200">Conversación Vacía</p>
                              <p className="text-[11px] text-zinc-400 mt-0.5">
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
                                      ? "bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700/50"
                                      : "bg-teal-900/60 text-teal-100 border border-teal-800/60 rounded-tr-none"
                                  }`}
                                >
                                  {/* Custom header if receipt attachment */}
                                  {msg.isReceipt && msg.receiptData && (
                                    <div className="mb-2 border border-dashed border-teal-500/50 p-2 rounded-lg bg-teal-950/40">
                                      <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300 mb-1">
                                        <ImageIcon className="h-3.5 w-3.5" />
                                        <span>Captura de Comprobante Recibido</span>
                                      </div>
                                      
                                      {msg.receiptData.imageUrl && (
                                        <img
                                          src={msg.receiptData.imageUrl}
                                          alt="Receipt"
                                          className="w-full max-h-48 object-contain rounded border border-zinc-800 mb-2 bg-[#121212]"
                                        />
                                      )}

                                      {/* OCR Readout */}
                                      <div className="text-[11px] space-y-1 bg-[#121212] p-2 rounded border border-zinc-800">
                                        <div className="flex justify-between">
                                          <span className="text-zinc-500">Monto:</span>
                                          <span className="font-bold text-zinc-100">{msg.receiptData.monto}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-zinc-500">Ref Leída:</span>
                                          <span className="font-bold font-mono text-teal-400">{msg.receiptData.referencia || "No legible"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-zinc-500">Banco:</span>
                                          <span className="text-zinc-300">{msg.receiptData.banco || "Banca Digital"}</span>
                                        </div>
                                        <div className="mt-1.5 pt-1.5 border-t border-zinc-800/80 text-[10px] text-zinc-400 leading-relaxed italic">
                                          &ldquo;{msg.receiptData.analisis}&rdquo;
                                        </div>
                                      </div>

                                      {activeLead.status !== "approved" && (() => {
                                        const uniqueKey = `${activeLead.id}-${index}`;
                                        const inputClientVal = assocClientRefs[uniqueKey] !== undefined ? assocClientRefs[uniqueKey] : activeLead.assignedRef;
                                        const inputBankVal = assocBankRefs[uniqueKey] !== undefined ? assocBankRefs[uniqueKey] : (msg.receiptData.referencia || "");
                                        return (
                                          <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
                                            <div className="text-[10px] uppercase tracking-wider font-bold text-teal-400">
                                              Asociación Manual de Referencia
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                <label className="block text-[9px] text-zinc-500 mb-0.5">Ref. Cliente (CRM)</label>
                                                <input
                                                  type="text"
                                                  value={inputClientVal}
                                                  onChange={(e) => setAssocClientRefs({ ...assocClientRefs, [uniqueKey]: e.target.value })}
                                                  placeholder="DOC-PRO-XXXX"
                                                  className="w-full text-[10px] font-mono bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-zinc-200 focus:outline-none focus:border-teal-500"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[9px] text-zinc-500 mb-0.5">Ref. Operación (Banco)</label>
                                                <input
                                                  type="text"
                                                  value={inputBankVal}
                                                  onChange={(e) => setAssocBankRefs({ ...assocBankRefs, [uniqueKey]: e.target.value })}
                                                  placeholder="Ej: 006539..."
                                                  className="w-full text-[10px] font-mono bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-zinc-200 focus:outline-none focus:border-teal-500"
                                                />
                                              </div>
                                            </div>
                                            
                                            <div className="flex flex-col gap-1.5 mt-2">
                                              <button
                                                onClick={() => handleAssociatePayment(activeLead.id, inputClientVal, inputBankVal, index)}
                                                disabled={!!associatingKey}
                                                className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800/50 disabled:opacity-50 text-white font-bold text-[10px] py-1.5 rounded flex items-center justify-center gap-1.5 transition cursor-pointer"
                                                title="Vincular referencia del banco con la del cliente y activar cuenta"
                                              >
                                                <Link className="h-3.5 w-3.5" />
                                                <span>{associatingKey === uniqueKey ? "Asociando..." : "Asociar y Activar Premium"}</span>
                                              </button>
                                              
                                              <button
                                                onClick={() => handleApprovePayment(activeLead.id)}
                                                disabled={approvingLeadId === activeLead.id}
                                                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-[10px] py-1.5 rounded flex items-center justify-center gap-1.5 transition cursor-pointer"
                                                title="Aprobar el pago de este docente directamente"
                                              >
                                                <CircleCheck className="h-3.5 w-3.5" />
                                                <span>{approvingLeadId === activeLead.id ? "Aprobando..." : "Aprobar Comprobante Directo"}</span>
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}

                                  {/* Custom audio player if audio message */}
                                  {msg.isAudio && msg.audioData && (
                                    <div className="mb-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col gap-1 w-full min-w-[240px]">
                                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-300">
                                        <Mic className="h-3 w-3 text-teal-400 animate-pulse" />
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
                                  <div className="flex justify-end items-center gap-1 mt-1 text-[9px] text-zinc-500">
                                    <span>
                                      {new Date(msg.timestamp).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                    {!isBot && (
                                      <CheckCheck className="h-3.5 w-3.5 text-teal-400" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Loading animations */}
                          {(sendingMsg || simulatingBuyer) && (
                            <div className="self-start bg-zinc-800 border border-zinc-700/50 p-3 rounded-xl rounded-tl-none shadow-xs text-xs text-zinc-300 flex items-center gap-2 max-w-[200px]">
                              <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                              </span>
                              <span>Camila escribiendo...</span>
                            </div>
                          )}

                          {verifyingReceipt && (
                            <div className="self-start bg-zinc-800 p-4 rounded-xl shadow-md border border-teal-500/30 flex flex-col gap-2 max-w-xs">
                              <div className="flex items-center gap-2 text-xs font-semibold text-teal-300 animate-pulse">
                                <RefreshCw className="h-4 w-4 animate-spin text-teal-400" />
                                <span>IA analizando comprobante con Visión...</span>
                              </div>
                              <p className="text-[10px] text-zinc-400 leading-relaxed">
                                Escaneando el comprobante en la imagen, decodificando los códigos OCR y cotejando la referencia con la asignada.
                              </p>
                            </div>
                          )}

                          <div ref={messagesEndRef} />
                        </div>

                        {/* Chat Footer Input bar */}
                        <div className="bg-[#121212] p-3 flex items-center gap-2 border-t border-zinc-800/80">
                          {/* File input proxy button */}
                          <label className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg cursor-pointer transition flex items-center justify-center" title="Subir Imagen de Comprobante">
                            <ImageIcon className="h-5 w-5" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageUpload}
                            />
                          </label>

                          {/* Audio upload proxy button */}
                          <label className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg cursor-pointer transition flex items-center justify-center" title="Subir Archivo de Audio">
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
                              className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer transition flex items-center justify-center animate-pulse animate-duration-1000"
                              title="Detener grabación"
                            >
                              <Square className="h-5 w-5 fill-white" />
                            </button>
                          ) : (
                            <button
                              onClick={startRecording}
                              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg cursor-pointer transition flex items-center justify-center"
                              title="Grabar nota de voz"
                            >
                              <Mic className="h-5 w-5" />
                            </button>
                          )}

                          {/* Simular nota de voz button */}
                          <button
                            type="button"
                            onClick={handleSimulatePresetVoiceNote}
                            className="px-2.5 py-1.5 text-[10px] bg-teal-950/40 hover:bg-teal-950/80 border border-teal-800/40 text-teal-400 font-bold rounded-xl cursor-pointer transition flex items-center gap-1 shrink-0"
                            title="Simular nota de voz del cliente"
                          >
                            <Sparkles className="h-3 w-3 text-teal-400 animate-pulse" />
                            <span>Simular Audio</span>
                          </button>

                          <input
                            type="text"
                            placeholder={activeLead.isPaused ? "Escribe tu mensaje manual como operador..." : "Escribe como profesor interesado... (ej. ¿Qué planes tienen?)"}
                            className="flex-1 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-teal-500"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (activeLead.isPaused) {
                                  handleSendManualMsg();
                                } else {
                                  handleSendWhatsAppMsg();
                                }
                              }
                            }}
                          />

                          <button
                            onClick={() => {
                              if (activeLead.isPaused) {
                                handleSendManualMsg();
                              } else {
                                handleSendWhatsAppMsg();
                              }
                            }}
                            disabled={!chatInput.trim() || sendingMsg}
                            className="p-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-30 text-white rounded-xl transition cursor-pointer flex items-center justify-center shadow-md shadow-teal-950/40"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-8 bg-zinc-950/40">
                        <MessageCircle className="h-16 w-16 text-zinc-700 mb-3" />
                        <p className="text-sm font-semibold text-zinc-400">No hay chats activos</p>
                        <p className="text-xs text-zinc-500 mt-1">Crea un cliente nuevo en la pestaña CRM para simular.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: AI SYSTEM CONFIGURATION */}
              {activeTab === "config" && (
                <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
                  <div className="bg-[#121212]/90 rounded-2xl border border-zinc-800/80 p-4 sm:p-6 shadow-xs">
                    <div className="flex items-center gap-3 mb-6 border-b border-zinc-800/60 pb-4">
                      <Settings className="h-6 w-6 text-teal-400" />
                      <div>
                        <h3 className="font-display font-bold text-lg text-white">Personalización del Agente IA</h3>
                        <p className="text-xs text-zinc-400">Configura el comportamiento, personalidad y datos de transferencia de la IA de WhatsApp.</p>
                      </div>
                    </div>

                    <form onSubmit={handleSaveConfig} className="space-y-6">
                      {/* Bank Details section */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wide">🏦 Datos Bancarios para Cobros</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Estos datos son inyectados en la conversación cuando la IA instruye al cliente a realizar la transferencia.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-400">Banco Receptor</label>
                            <input
                              type="text"
                              value={config.bankDetails.banco}
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  bankDetails: { ...prev.bankDetails, banco: e.target.value },
                                }))
                              }
                              className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:border-teal-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-400">Teléfono Pago Móvil</label>
                            <input
                              type="text"
                              value={config.bankDetails.cuenta}
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  bankDetails: { ...prev.bankDetails, cuenta: e.target.value },
                                }))
                              }
                              className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:border-teal-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-400">Cédula del Titular</label>
                            <input
                              type="text"
                              value={config.bankDetails.beneficiario}
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  bankDetails: { ...prev.bankDetails, beneficiario: e.target.value },
                                }))
                              }
                              className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:border-teal-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Premium Codes Management Section */}
                      <div className="space-y-4 border-t border-zinc-800/60 pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wide flex items-center gap-2">
                              <Key className="h-4 w-4 text-amber-400" />
                              🔑 Códigos Premium de Docenty PRO
                            </h4>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                              Entrégale códigos premium a Camila. Ella elegirá el primero de esta lista al verificar un pago de manera automática o manual.
                            </p>
                          </div>
                          <span className="text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-full self-start sm:self-auto shrink-0">
                            {(config.premiumCodes || []).length} disponibles
                          </span>
                        </div>

                        {/* Add code input */}
                        <div className="flex gap-2 max-w-lg">
                          <input
                            type="text"
                            placeholder="Escribe un código (ej: META-ABCD-1234) o varios separados por comas..."
                            value={newCodeInput}
                            onChange={(e) => setNewCodeInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddPremiumCode(e);
                              }
                            }}
                            className="flex-1 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:border-amber-500"
                          />
                          <button
                            type="button"
                            onClick={(e) => handleAddPremiumCode(e)}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
                          >
                            Añadir
                          </button>
                        </div>

                        {/* Codes display grid */}
                        {(config.premiumCodes || []).length > 0 ? (
                          <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto p-1 bg-zinc-950/40 border border-zinc-850 rounded-xl">
                            {(config.premiumCodes || []).map((code) => (
                              <div
                                key={code}
                                className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs px-2.5 py-1 rounded-lg hover:border-zinc-700 transition"
                              >
                                <span className="font-mono tracking-wider font-semibold text-amber-300">{code}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePremiumCode(code)}
                                  className="text-zinc-500 hover:text-rose-400 transition ml-1 cursor-pointer"
                                  title="Eliminar código"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="border border-dashed border-zinc-800/80 p-4 rounded-xl text-center bg-zinc-950/20">
                            <p className="text-xs text-zinc-500">No hay códigos premium disponibles en el pool de Camila.</p>
                            <p className="text-[10px] text-zinc-600 mt-1">Ingresa algunos arriba para asegurar la entrega automática al aprobar pagos.</p>
                          </div>
                        )}
                      </div>

                      {/* System Prompt section */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wide">🧠 Prompt del Agente Vendedor (System Prompt)</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Define el tono de voz de Camila, las reglas del negocio de Docenty PRO, manejo de objeciones y cierres de venta.
                        </p>
                        <textarea
                          rows={14}
                          value={config.botSystemPrompt}
                          onChange={(e) => setConfig((prev) => ({ ...prev, botSystemPrompt: e.target.value }))}
                          className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:border-teal-500 leading-relaxed"
                          placeholder="Instrucciones del sistema para el agente..."
                        />
                      </div>

                      <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
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
                          className="text-xs text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                        >
                          Restaurar prompt por defecto
                        </button>

                        <button
                          type="submit"
                          disabled={actionLoading === "config"}
                          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-30 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-md shadow-teal-950/40"
                        >
                          {actionLoading === "config" ? "Guardando..." : "Guardar Ajustes de IA"}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* NUEVA SECCIÓN DE COPIAS DE SEGURIDAD Y NOTIFICACIONES */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* Tarjeta A: Notificaciones en mi Dispositivo */}
                    <div className="bg-[#121212]/90 rounded-2xl border border-zinc-800/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Bell className="h-5 w-5 text-teal-400" />
                          <h4 className="font-display font-bold text-sm text-white">Notificaciones en Tiempo Real</h4>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Recibe alertas con sonido y ventanas emergentes (push notifications) en tu celular o computadora de inmediato cuando un cliente potencial escriba.
                        </p>
                        
                        <div className="mt-4 p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400">Estado de Permiso:</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                              notifPermission === "granted" 
                                ? "bg-teal-500/10 border-teal-500/20 text-teal-400" 
                                : notifPermission === "denied" 
                                  ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                                  : "bg-zinc-800 border-zinc-700 text-zinc-400"
                            }`}>
                              {notifPermission === "granted" ? "Concedido (Activo)" : notifPermission === "denied" ? "Denegado (Bloqueado)" : "Sin configurar"}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 leading-normal">
                            {notifPermission === "granted" 
                              ? "¡Excelente! Tu dispositivo recibirá alertas instantáneas con sonido e información del mensaje."
                              : notifPermission === "denied" 
                                ? "Bloqueado por el navegador. Haz clic en el icono del candado en la barra de direcciones de tu navegador y activa las Notificaciones."
                                : "Haz clic en el botón de abajo para activar y probar las alertas en este dispositivo."
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        {notifPermission !== "granted" && (
                          <button
                            type="button"
                            onClick={requestNotificationPermission}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-teal-950/40"
                          >
                            <Bell className="h-4 w-4" />
                            Activar Notificaciones
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={playNotificationChime}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-zinc-700/50"
                        >
                          <Volume2 className="h-4 w-4" />
                          Probar Sonido
                        </button>
                      </div>
                    </div>

                    {/* Tarjeta B: Copia de Seguridad */}
                    <div className="bg-[#121212]/90 rounded-2xl border border-zinc-800/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Download className="h-5 w-5 text-amber-400" />
                          <h4 className="font-display font-bold text-sm text-white">Respaldos (Guardar en mi Celular)</h4>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Descarga o restaura tu base de datos completa de clientes y chats directamente en el almacenamiento de tu celular o computadora. 
                        </p>
                        <div className="bg-amber-950/10 border border-amber-900/20 p-3 rounded-xl mt-3">
                          <p className="text-[10px] text-amber-300/90 leading-normal">
                            💡 <strong>Garantía de Persistencia:</strong> Aunque el servidor de la nube se reinicie, el CRM sincroniza tus datos automáticamente desde la memoria de tu navegador (Local Storage). Descarga un respaldo periódicamente para tener un control manual absoluto.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleExportBackup}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-950/40"
                          >
                            <Download className="h-4 w-4" />
                            Descargar Respaldo
                          </button>

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-zinc-700/50"
                          >
                            <Upload className="h-4 w-4" />
                            Subir/Restaurar
                          </button>
                        </div>

                        <input
                          type="file"
                          ref={fileInputRef}
                          accept=".json"
                          className="hidden"
                          onChange={handleImportBackup}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: WHAT IS DOCENTY PRO */}
              {activeTab === "about" && (
                <div className="p-6 max-w-4xl mx-auto space-y-6">
                  {/* Digital Brochure */}
                  <div className="bg-[#121212]/90 rounded-3xl border border-zinc-800/80 overflow-hidden shadow-xs">
                    {/* Visual Hero Banner */}
                    <div className="bg-gradient-to-r from-teal-950 to-zinc-900 px-8 py-10 text-white relative border-b border-zinc-800">
                      <div className="max-w-2xl">
                        <span className="bg-teal-900/80 text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block border border-teal-800/50">
                          SaaS para Educación de Vanguardia
                        </span>
                        <h2 className="font-display font-bold text-3xl leading-tight">Docenty PRO</h2>
                        <p className="text-zinc-300 text-sm mt-2 max-w-xl leading-relaxed">
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
                        <div className="space-y-2 p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                          <div className="bg-zinc-800 text-teal-400 h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm border border-zinc-700/50">
                            1
                          </div>
                          <h4 className="font-bold text-sm text-zinc-100">Adiós al Caos de Excel</h4>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            Centraliza asistencias, notas, reportes y planes didácticos en una sola interfaz limpia y visual, evitando hojas de cálculo infinitas.
                          </p>
                        </div>

                        <div className="space-y-2 p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                          <div className="bg-zinc-800 text-teal-400 h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm border border-zinc-700/50">
                            2
                          </div>
                          <h4 className="font-bold text-sm text-zinc-100">Automatización de Tareas</h4>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            Ahorra hasta 10 horas de trabajo extra a la semana al automatizar la planeación de clases y la creación instantánea de exámenes.
                          </p>
                        </div>

                        <div className="space-y-2 p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                          <div className="bg-zinc-800 text-teal-400 h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm border border-zinc-700/50">
                            3
                          </div>
                          <h4 className="font-bold text-sm text-zinc-100">Seguimiento Dinámico</h4>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            Ofrece gráficas automáticas y alertas sobre el progreso de cada alumno de manera visual para mejorar la calidad educativa.
                          </p>
                        </div>
                      </div>

                      {/* Section 2: Pricing Structure */}
                      <div className="space-y-4">
                        <h3 className="font-display font-bold text-base text-zinc-100 border-b border-zinc-800 pb-2">Planes Comerciales de Docenty PRO</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Plan único */}
                          <div className="border border-zinc-800 p-6 rounded-2xl space-y-3 hover:border-zinc-700 transition bg-zinc-900">
                            <span className="text-[10px] font-bold text-teal-400 uppercase">Acceso Completo</span>
                            <h4 className="font-display font-bold text-lg text-white">Suscripción Premium</h4>
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-display font-bold text-white">$2</span>
                              <span className="text-xs text-zinc-400">USD / año</span>
                            </div>
                            <ul className="text-xs text-zinc-300 space-y-2 pt-2">
                              <li className="flex items-center gap-1.5">✅ Registro ilimitado de asistencias y notas</li>
                              <li className="flex items-center gap-1.5">✅ Planeación de clases y rúbricas ilimitadas con IA</li>
                              <li className="flex items-center gap-1.5">✅ Generador inteligente de exámenes en 1 click</li>
                            </ul>
                          </div>

                          {/* Pago Móvil info */}
                          <div className="border-2 border-teal-600 p-6 rounded-2xl space-y-3 relative overflow-hidden bg-teal-950/20">
                            <div className="absolute top-0 right-0 bg-teal-600 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase">
                              TASA OFICIAL BCV
                            </div>
                            <span className="text-[10px] font-bold text-teal-300 uppercase">Cobro en Bolívares (Bs.)</span>
                            <h4 className="font-display font-bold text-lg text-white">Pago Móvil BDV</h4>
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-display font-bold text-teal-400">Banco de Venezuela</span>
                            </div>
                            <ul className="text-xs text-zinc-300 space-y-2 pt-2 font-medium">
                              <li className="flex items-center gap-1.5">✨ Pago directo al cambio oficial del BCV del día</li>
                              <li className="flex items-center gap-1.5">✨ Teléfono: 04262953484</li>
                              <li className="flex items-center gap-1.5">✨ Cédula: 24755720</li>
                              <li className="flex items-center gap-1.5">✨ Activación inmediata tras validación visual</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: CRM AI value */}
                      <div className="bg-[#121212] p-6 rounded-2xl border border-zinc-800 flex flex-col md:flex-row gap-6 items-center justify-between">
                        <div className="space-y-2 max-w-xl">
                          <h4 className="font-bold text-sm text-zinc-200">¿Cómo el CRM con IA impulsa este negocio?</h4>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            Dado que los profesores están sumamente ocupados y las instituciones educativas toman tiempo en decidir, este CRM automatiza el seguimiento en WhatsApp. Responde dudas, destaca el ahorro de tiempo, explica planes, provee datos de banco y confirma el pago reconociendo imágenes para crear cuentas de inmediato, escalando el negocio de forma masiva sin un equipo de ventas humano.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveTab("whatsapp")}
                          className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-5 py-3 rounded-xl transition flex items-center gap-2 flex-shrink-0 cursor-pointer shadow-md shadow-teal-950/40"
                        >
                          Ir al chat de venta
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

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#121212]/95 backdrop-blur-md border-t border-zinc-800/80 z-40 flex justify-around items-center" id="mobile-bottom-nav">
          <button
            onClick={() => setActiveTab("crm")}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 text-center transition cursor-pointer ${
              activeTab === "crm" ? "text-teal-400 font-semibold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Users className="h-5 w-5" />
            <span className="text-[10px]">CRM Leads</span>
          </button>

          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 text-center transition relative cursor-pointer ${
              activeTab === "whatsapp" ? "text-teal-400 font-semibold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <div className="relative">
              <MessageSquare className="h-5 w-5" />
              {pendingPayments > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-amber-500 text-zinc-950 text-[8px] font-black px-1 rounded-full animate-pulse">
                  {pendingPayments}
                </span>
              )}
            </div>
            <span className="text-[10px]">WhatsApp</span>
          </button>

          <button
            onClick={() => setActiveTab("config")}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 text-center transition cursor-pointer ${
              activeTab === "config" ? "text-teal-400 font-semibold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[10px]">Ajustes</span>
          </button>

          <button
            onClick={() => setActiveTab("about")}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 text-center transition cursor-pointer ${
              activeTab === "about" ? "text-teal-400 font-semibold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-[10px]">Docenty</span>
          </button>
        </nav>
      </div>

      {/* MODAL 1: CREATE NEW PROSPECT */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212]/95 rounded-3xl border border-zinc-800/80 max-w-lg w-full p-6 shadow-2xl space-y-4 text-white"
            >
              <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
                <h3 className="font-display font-bold text-base text-white">Registrar Cliente Potencial (Lead)</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 hover:bg-zinc-800 rounded-lg transition cursor-pointer text-zinc-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateLead} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-400">Nombre Completo *</label>
                    <input
                      type="text"
                      placeholder="Ej. Profesor Carlos Ruiz"
                      required
                      value={newLeadForm.name}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-hidden focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-400">Número de WhatsApp *</label>
                    <input
                      type="tel"
                      placeholder="Ej. +52 55 1234 5678"
                      required
                      value={newLeadForm.phone}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-hidden focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">Correo Electrónico (Para envío de cuenta)</label>
                  <input
                    type="email"
                    placeholder="carlos.ruiz@colegio.edu"
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-hidden focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-400">Plan de Interés</label>
                    <select
                      value={newLeadForm.plan}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, plan: e.target.value as any }))}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-xs text-white focus:outline-hidden focus:border-teal-500"
                    >
                      <option value="annual" className="bg-[#121212]">Docenty PRO Premium ($2 USD)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-400">Estado Inicial</label>
                    <select
                      value={newLeadForm.status}
                      onChange={(e) => setNewLeadForm((prev) => ({ ...prev, status: e.target.value as any }))}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-xs text-white focus:outline-hidden focus:border-teal-500"
                    >
                      <option value="prospect" className="bg-[#121212]">Prospecto (Sin interacción aún)</option>
                      <option value="interested" className="bg-[#121212]">Interesado (Tiene dudas)</option>
                      <option value="payment_sent" className="bg-[#121212]">Pago Recibido (A espera de validar)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">Notas sobre sus dolores / necesidades</label>
                  <textarea
                    rows={3}
                    placeholder="Ej. Enseña química, trabaja los domingos haciendo exámenes, cansado de planificar clases..."
                    value={newLeadForm.notes}
                    onChange={(e) => setNewLeadForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-hidden focus:border-teal-500"
                  />
                </div>

                <div className="pt-3 border-t border-zinc-800/80 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold px-4 py-2.5 rounded-lg transition cursor-pointer border border-zinc-700/50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition cursor-pointer shadow-md shadow-teal-950/40"
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212]/95 rounded-3xl border border-zinc-800/80 max-w-md w-full p-6 shadow-2xl space-y-4 text-white"
            >
              <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
                <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-teal-400" />
                  Simulador de Transferencia Bancaria
                </h3>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="p-1 hover:bg-zinc-800 rounded-lg transition cursor-pointer text-zinc-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="text-xs text-zinc-400 leading-relaxed space-y-2">
                <p>
                  Para demostrar cómo la IA lee imágenes y confirma el pedido de inmediato, crearemos un 
                  comprobante en un lienzo canvas y lo enviaremos por WhatsApp.
                </p>
                <div className="bg-amber-950/20 border border-amber-900/40 p-2.5 rounded-lg text-amber-300 font-medium">
                  💡 <strong>Tip de Testeo:</strong> Puedes ingresar la referencia correcta para forzar la aprobación de la IA, 
                  o cambiarla por una incorrecta (o dejarla vacía) para ver cómo el sistema de visión la rechaza o la deja en espera.
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">Banco del Cliente Emisor</label>
                  <input
                    type="text"
                    value={receiptSim.bank}
                    onChange={(e) => setReceiptSim((prev) => ({ ...prev, bank: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-hidden focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-400">Código Referencia Escrito</label>
                    <input
                      type="text"
                      value={receiptSim.refCode}
                      onChange={(e) => setReceiptSim((prev) => ({ ...prev, refCode: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-xs text-white focus:outline-hidden focus:border-teal-500 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-400">Monto Transferido (USD)</label>
                    <input
                      type="number"
                      value={receiptSim.amount}
                      onChange={(e) => setReceiptSim((prev) => ({ ...prev, amount: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-xs text-white focus:outline-hidden focus:border-teal-500 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold px-4 py-2.5 rounded-lg transition cursor-pointer border border-zinc-700/50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGenerateAndSendReceipt}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition cursor-pointer shadow-md shadow-teal-950/40 flex items-center gap-1.5"
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
