// ==================== TEMPLATE DATA ====================

export interface TemplateData {
  id: string;
  name: string | null;
  type: string;
  cloudinary_file_url: string;
  metadata: Record<string, unknown>;
}

// ==================== PYTHON HASHER SERVICE ====================

export interface PythonHasherRequest {
  pdf_base64: string;
}

export interface PythonHasherResponse {
  sha256: string;
  phash: string;
}

// ==================== PYTHON VALIDATOR SERVICE ====================

export interface PythonVerificationRequest {
  encrypted_pdf: string;
  bank: {
    id: string;
    name: string;
    code: string;
  };
  templates: TemplateData[];
  expected: Record<string, unknown>;
}

export interface PythonVerificationResponse {
  valid: boolean;
  confidence: number;
  matched_template_id: string | null;
  messages: string[];
  extracted?: Record<string, unknown>;
}

// ==================== API RESPONSE TYPES ====================

export interface DuplicateResponse {
  valid: false;
  duplicate: true;
  reason: 'proof_already_submitted';
  original_proof_id: string;
  original_submitted_at: Date;
}

export interface ValidResponse {
  duplicate: false;
  proof_id: string;
  valid: true;
  confidence: number;
  matched_template_id: string | null;
  bank: {
    id: string;
    name: string;
    code: string;
  };
  templates_checked: number;
  extracted?: Record<string, unknown>;
}

export interface InvalidResponse {
  duplicate: false;
  proof_id: string;
  valid: false;
  confidence: number;
  bank: {
    id: string;
    name: string;
    code: string;
  };
  templates_checked: number;
}

// ==================== BANK DATA ====================

export interface BankData {
  id: string;
  name: string;
  code: string;
}
