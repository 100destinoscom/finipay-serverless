import { z } from 'zod';
import { expectedValuesSchema } from './validation/expectedValues';

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  company_name: z.string().min(2, 'Company name must be at least 2 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Bank schemas
export const bankIdParamSchema = z.object({
  id: z.string().uuid('Invalid bank ID'),
});

// Template schemas
export const templateTypeSchema = z.enum(['express', 'iban', 'transferencia']);

export const createTemplateSchema = z.object({
  bank_id: z.string().uuid('Invalid bank ID'),
  name: z.string().min(2, 'Template name is required').optional(),
  type: templateTypeSchema,
  metadata: z.record(z.unknown()).optional().default({}),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(2, 'Template name is required').optional(),
  bank_id: z.string().uuid('Invalid bank ID').optional(),
  type: templateTypeSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

export const getTemplatesQuerySchema = z.object({
  bank_id: z.string().uuid().optional(),
  type: templateTypeSchema.optional(),
  is_active: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
});

export const templateIdParamSchema = z.object({
  id: z.string().uuid('Invalid template ID'),
});

// API Key schemas
export const apiKeyIdParamSchema = z.object({
  id: z.string().uuid('Invalid API key ID'),
});

export const createApiKeySchema = z.object({
  name: z.string().min(2, 'API key name is required').max(100).optional(),
});

// Validation schemas - imported from modular validation
export { expectedValuesSchema } from './validation/expectedValues';

export const validateRequestSchema = z.object({
  encrypted_pdf: z.string().min(1, 'Encrypted PDF is required'),
  bank_id: z.string().uuid('Invalid bank ID'),
  expected: expectedValuesSchema,
  idempotency_key: z.string().min(1, 'Idempotency key is required').max(255),
  webhook_url: z.string().url('Invalid webhook URL').optional(),
});

// Statistics query schema
export const statsQuerySchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  period: z.enum(['day', 'week', 'month', 'year']).optional().default('month'),
});

// User Profile schemas
export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  company_name: z.string().min(2, 'Company name must be at least 2 characters').optional(),
});

// Types
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type GetTemplatesQuery = z.infer<typeof getTemplatesQuerySchema>;
export type ValidateRequestInput = z.infer<typeof validateRequestSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type StatsQuery = z.infer<typeof statsQuerySchema>;

