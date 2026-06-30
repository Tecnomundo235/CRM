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
  isAudio?: boolean;
  audioData?: {
    base64: string;
    mimeType: string;
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
