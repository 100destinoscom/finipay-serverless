/**
 * Python API Endpoints - Infrastructure Layer
 * 
 * Centraliza todos os endpoints da API Python unificada.
 */

export const PythonApiEndpoints = {
  // Health Check
  HEALTH: '/health',
  
  // Hash Domain
  HASH: '/hash',
  HASH_UPLOAD: '/hash/upload',
  
  // Verification Domain
  VERIFY: '/verify',
} as const;

export type PythonApiEndpoint = typeof PythonApiEndpoints[keyof typeof PythonApiEndpoints];
