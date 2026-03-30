/**
 * Python API Client - Infrastructure Layer
 * 
 * Cliente HTTP para consumir a API Python unificada do FinPay.
 * Segue princípios DDD com separação clara de responsabilidades.
 */

export { PythonApiClient, getPythonApiClient } from './client';
export { PythonApiEndpoints } from './endpoints';
export { PythonApiException } from './types';
export type {
  HashRequest,
  HashResponse,
  VerifyRequest,
  VerifyResponse,
  HealthResponse,
  TemplateData,
  BankData,
} from './types';
