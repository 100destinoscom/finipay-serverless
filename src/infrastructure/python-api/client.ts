/**
 * Python API Client - Infrastructure Layer
 * 
 * Cliente HTTP para consumir a API Python unificada.
 * Implementa padrões de retry, timeout e tratamento de erros.
 */

import { env } from '../../config/env';
import { PythonApiEndpoints } from './endpoints';
import {
  HashRequest,
  HashResponse,
  VerifyRequest,
  VerifyResponse,
  HealthResponse,
  PythonApiException,
} from './types';

/**
 * Cliente para comunicação com a API Python unificada do FinPay
 */
export class PythonApiClient {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(baseUrl?: string, timeout?: number) {
    this.baseUrl = (baseUrl || env.PYTHON_API_URL).replace(/\/$/, ''); // Remove trailing slash
    this.timeout = timeout || env.PYTHON_API_TIMEOUT;
  }

  /**
   * Constrói a URL completa para um endpoint
   */
  private buildUrl(endpoint: string): string {
    return `${this.baseUrl}${endpoint}`;
  }

  /**
   * Executa uma requisição POST com tratamento de erros
   */
  private async post<TRequest, TResponse>(
    endpoint: string,
    payload: TRequest,
    customTimeout?: number
  ): Promise<TResponse> {
    const url = this.buildUrl(endpoint);
    const timeoutMs = customTimeout || this.timeout;

    console.log(`[PythonAPI] POST ${endpoint}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FinPay-NodeJS/1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const errorBody = await this.parseErrorResponse(response);
        console.error(`[PythonAPI] Error (${response.status}):`, errorBody);
        throw new PythonApiException(
          response.status,
          errorBody.error || 'unknown_error',
          errorBody.message || `Request failed with status ${response.status}`,
          errorBody.details
        );
      }

      return (await response.json()) as TResponse;
    } catch (error) {
      if (error instanceof PythonApiException) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
          throw new PythonApiException(
            408,
            'timeout',
            `Request to ${endpoint} timed out after ${timeoutMs}ms`
          );
        }
        throw new PythonApiException(500, 'network_error', error.message);
      }

      throw new PythonApiException(500, 'unknown_error', String(error));
    }
  }

  /**
   * Executa uma requisição GET
   */
  private async get<TResponse>(endpoint: string): Promise<TResponse> {
    const url = this.buildUrl(endpoint);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'FinPay-NodeJS/1.0',
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorBody = await this.parseErrorResponse(response);
        throw new PythonApiException(
          response.status,
          errorBody.error || 'unknown_error',
          errorBody.message || `Request failed with status ${response.status}`
        );
      }

      return (await response.json()) as TResponse;
    } catch (error) {
      if (error instanceof PythonApiException) {
        throw error;
      }
      throw new PythonApiException(500, 'network_error', String(error));
    }
  }

  /**
   * Parse de resposta de erro
   */
  private async parseErrorResponse(response: Response): Promise<{
    error?: string;
    message?: string;
    details?: unknown;
  }> {
    try {
      return await response.json() as { error?: string; message?: string; details?: unknown };
    } catch {
      const text = await response.text();
      return { error: 'parse_error', message: text };
    }
  }

  // ============== Public API Methods ==============

  /**
   * Health check da API Python
   */
  async health(): Promise<HealthResponse> {
    return this.get<HealthResponse>(PythonApiEndpoints.HEALTH);
  }

  /**
   * Computa hash SHA-256 e pHash de um PDF
   * 
   * @param pdfBase64 - PDF criptografado com Fernet em base64
   * @param filename - Nome opcional do arquivo
   */
  async hash(pdfBase64: string, filename?: string): Promise<HashResponse> {
    const payload: HashRequest = {
      pdf_base64: pdfBase64,
      ...(filename && { filename }),
    };

    console.log('[PythonAPI] Hash request - pdf_base64 length:', pdfBase64.length);

    return this.post<HashRequest, HashResponse>(PythonApiEndpoints.HASH, payload);
  }

  /**
   * Verifica um recibo contra templates
   * 
   * @param request - Dados para verificação
   */
  async verify(request: VerifyRequest): Promise<VerifyResponse> {
    console.log('[PythonAPI] Verify request - bank:', request.bank.code, 'templates:', request.templates.length);

    return this.post<VerifyRequest, VerifyResponse>(
      PythonApiEndpoints.VERIFY,
      request,
      env.PYTHON_API_TIMEOUT // Use longer timeout for verification
    );
  }

  /**
   * Verifica se a API Python está acessível
   */
  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.health();
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }
}

// Singleton instance
let pythonApiClientInstance: PythonApiClient | null = null;

/**
 * Retorna a instância singleton do cliente
 */
export function getPythonApiClient(): PythonApiClient {
  if (!pythonApiClientInstance) {
    pythonApiClientInstance = new PythonApiClient();
  }
  return pythonApiClientInstance;
}
