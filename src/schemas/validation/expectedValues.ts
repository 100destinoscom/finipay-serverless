import { z } from 'zod';

/**
 * Normaliza preço de formato brasileiro para número
 * Aceita: "100.000,00" ou "100000,00" ou 100000.00
 * Retorna: 100000.00
 */
export function normalizeBrazilianPrice(value: string | number): number {
    if (typeof value === 'number') return value;

    // Remove pontos (separador de milhares) e substitui vírgula por ponto
    const normalized = value.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalized);

    if (isNaN(parsed)) {
        throw new Error('Invalid price format');
    }

    return parsed;
}

/**
 * Normaliza referência removendo espaços e pontos
 * Aceita: "945 924 964" ou "AO06.0040.0000.2483.9524.1011.8"
 * Retorna: "945924964" ou "AO06004000002483952410118"
 */
export function normalizeReference(value: string): string {
    return value.replace(/[\s.]/g, '');
}

/**
 * Valida formato de preço brasileiro
 */
export const priceValidator = z.union([
    z.number().positive(),
    z.string().transform((val) => {
        const normalized = normalizeBrazilianPrice(val);
        if (normalized <= 0) {
            throw new Error('Price must be positive');
        }
        return normalized;
    }),
]);

/**
 * Valida referência (aceita espaços e pontos)
 */
export const referenceValidator = z.string()
    .min(1, 'Reference is required')
    .max(100, 'Reference too long')
    .transform(normalizeReference)
    .refine((val) => val.length >= 1 && val.length <= 50, {
        message: 'Reference must be between 1 and 50 characters after normalization',
    });



/**
 * Valida nome de entidade (pessoa/empresa)
 */
export const entityValidator = z.string()
    .min(2, 'Entity name must be at least 2 characters')
    .max(200, 'Entity name too long')
    .transform((val) => val.trim().toUpperCase());

/**
 * Schema completo de expected values
 */
export const expectedValuesSchema = z.object({
    price: priceValidator,
    ref: referenceValidator,
    entity: entityValidator.optional(),
}).strict();

/**
 * Type inference
 */
export type ExpectedValues = z.infer<typeof expectedValuesSchema>;
