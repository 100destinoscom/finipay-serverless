/**
 * Python API Types - Domain Layer
 * 
 * Definições de tipos para comunicação com a API Python unificada.
 */

// ============== Hash Domain ==============

export interface HashRequest {
  pdf_base64: string;
  filename?: string;
}

export interface HashResponse {
  sha256: string;
  phash: string;
  size_kb: number;
}

// ============== Verification Domain ==============

export interface BankData {
  id: string;
  name: string;
  code: string;
}

export interface TemplateData {
  id: string;
  name: string | null;
  type: string;
  cloudinary_file_url: string;
  metadata: Record<string, unknown>;
}

export interface ExpectedValues {
  amount?: number;
  date?: string;
  reference?: string;
  description?: string;
  [key: string]: unknown;
}

export interface VerifyRequest {
  encrypted_pdf: string;
  bank: BankData;
  templates: TemplateData[];
  expected: ExpectedValues;
}

export interface ExtractedData {
  amount?: number;
  date?: string;
  reference?: string;
  beneficiary?: string;
  payer?: string;
  [key: string]: unknown;
}

export interface VerifyResponse {
  valid: boolean;
  confidence: number;
  matched_template_id?: string;
  extracted?: ExtractedData;
  errors?: string[];
}

// ============== Health Domain ==============

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  service: string;
}

// ============== Error Types ==============

export interface PythonApiError {
  error: string;
  message: string;
  details?: unknown;
}

export class PythonApiException extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'PythonApiException';
  }
}
