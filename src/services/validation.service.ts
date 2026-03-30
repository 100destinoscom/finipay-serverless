import { prisma } from '../config/database';
import { getPythonApiClient } from '../infrastructure/python-api';
import type { HashResponse, VerifyResponse, TemplateData, BankData } from '../infrastructure/python-api/types';

/**
 * Log a request to the database for analytics
 */
export async function logRequest(
  apiKeyId: string | undefined,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  success: boolean,
  bankId?: string,
  errorMessage?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  if (!apiKeyId) return;
  
  try {
    await prisma.requestLog.create({
      data: {
        apiKeyId,
        endpoint,
        method,
        statusCode,
        responseTime,
        success,
        bankId,
        errorMessage,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to log request:', error);
  }
}

/**
 * Call Python Hasher service to get sha256 and phash of the PDF
 */
/**
 * Call Python Hash service to get sha256 and phash of the PDF
 * Uses the unified Python API client
 */
export async function callPythonHasher(pdfBase64: string): Promise<HashResponse> {
  const client = getPythonApiClient();
  return client.hash(pdfBase64);
}

/**
 * Check if a proof with this sha256 already exists for this company
 */
export async function checkDuplicate(sha256: string, companyId: string) {
  return await prisma.validatedProof.findFirst({
    where: {
      sha256,
      companyId,
    },
    select: {
      id: true,
      createdAt: true,
      isDuplicate: true,
    },
  });
}

/**
 * Call Python Verify service to validate the receipt
 * Uses the unified Python API client
 */
export async function callPythonValidator(
  encryptedPdf: string,
  bank: BankData,
  templates: TemplateData[],
  expected: Record<string, unknown>
): Promise<VerifyResponse> {
  const client = getPythonApiClient();
  return client.verify({
    encrypted_pdf: encryptedPdf,
    bank,
    templates,
    expected,
  });
}

/**
 * Send webhook notification to the configured URL
 */
export async function sendWebhook(webhookUrl: string, payload: any): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FinPay-Webhook/1.0',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.error(`Webhook failed (${response.status}): ${webhookUrl}`);
    } else {
      console.log(`Webhook sent successfully to: ${webhookUrl}`);
    }
  } catch (error) {
    console.error('Webhook send error:', error);
  }
}
