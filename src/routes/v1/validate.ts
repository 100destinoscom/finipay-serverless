import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import { authenticateApiKey } from '../../middleware/apiKey';
import { validateRequestSchema } from '../../schemas';
import { NotFoundError, ForbiddenError, InternalServerError } from '../../utils/errors';
import { encryptPdf } from '../../utils/password';
import {
  logRequest,
  callPythonHasher,
  checkDuplicate,
  callPythonValidator,
  sendWebhook,
} from '../../services/validation.service';
import { env } from '../../config/env';
import type { HashResponse, TemplateData } from '../../infrastructure/python-api/types';

// Response types for API
interface DuplicateResponse {
  valid: false;
  duplicate: true;
  reason: 'proof_already_submitted';
  original_proof_id: string;
  original_submitted_at: Date;
}

interface ValidResponse {
  duplicate: false;
  proof_id: string;
  valid: true;
  confidence: number;
  matched_template_id?: string;
  bank: { id: string; name: string; code: string };
  templates_checked: number;
  extracted?: Record<string, unknown>;
}

interface InvalidResponse {
  duplicate: false;
  proof_id: string;
  valid: false;
  confidence: number;
  bank: { id: string; name: string; code: string };
  templates_checked: number;
}

export default async function validateRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/validate
   * 
   * Flow:
   * 1. Receive encrypted_pdf (base64 of plain PDF), bank_id, expected, idempotency_key, webhook_url
   * 2. Check idempotency: if key exists, return stored result
   * 3. Encrypt PDF with Fernet using PYTHON_SERVICE_ENCRYPTION_KEY
   * 4. Call Python Hasher to get sha256 + phash
   * 5. Check if sha256 exists in ValidatedProof for this company
   * 6. If duplicate: return duplicate response
   * 7. If not duplicate: create ValidatedProof record
   * 8. Call Python Validator service
   * 9. Update ValidatedProof with validation result
   * 10. Store result for idempotency
   * 11. Send webhook if configured
   * 12. Return response
   */
  fastify.post(
    '/',
    {
      preHandler: authenticateApiKey,
      config: {
        rateLimit: {
          max: parseInt(env.RATE_LIMIT_MAX as unknown as string),
          timeWindow: env.RATE_LIMIT_TIME_WINDOW,
        },
      },
    },
    async (request, reply) => {
      const startTime = Date.now();
      const body = validateRequestSchema.parse(request.body);
      const apiKeyId = request.user!.apiKeyId;
      const companyId = request.user!.userId;
      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'];

      let existingProof: any = null;

      // STEP 1: Check Idempotency
      const existingIdempotency = await prisma.idempotencyResult.findUnique({
        where: { idempotencyKey: body.idempotency_key },
      });

      if (existingIdempotency && existingIdempotency.companyId === companyId) {
        const responseTime = Date.now() - startTime;
        await logRequest(apiKeyId, '/api/v1/validate', 'POST', 200, responseTime, true, undefined, undefined, ipAddress, userAgent);
        return reply.send(existingIdempotency.result);
      }

      // STEP 2: Validate Bank
      const bank = await prisma.bank.findUnique({
        where: { id: body.bank_id },
        select: { id: true, name: true, code: true, isActive: true },
      });

      if (!bank) {
        const responseTime = Date.now() - startTime;
        await logRequest(apiKeyId, '/api/v1/validate', 'POST', 404, responseTime, false, undefined, 'Bank not found', ipAddress, userAgent);
        throw new NotFoundError('Bank not found');
      }

      if (!bank.isActive) {
        const responseTime = Date.now() - startTime;
        await logRequest(apiKeyId, '/api/v1/validate', 'POST', 400, responseTime, false, bank.id, 'Bank is not active', ipAddress, userAgent);
        throw new ForbiddenError('Bank is not active');
      }

      // STEP 3: Encrypt PDF with Fernet
      const pdfBuffer = Buffer.from(body.encrypted_pdf, 'base64');
      const encryptedPdfB64 = encryptPdf(pdfBuffer);

      // STEP 4: Call Python Hasher
      let hashResult: HashResponse;
      try {
        hashResult = await callPythonHasher(encryptedPdfB64);
      } catch (error) {
        console.error('Python Hasher error:', error);
        const responseTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Python Hasher error:', error);
        await logRequest(apiKeyId, '/api/v1/validate', 'POST', 500, responseTime, false, bank.id, `Hasher error: ${errorMessage}`, ipAddress, userAgent);
        throw new InternalServerError('Failed to process receipt. Please try again later.');
      }

      // STEP 5: Check for Duplicate
      existingProof = await checkDuplicate(hashResult.sha256, companyId);

      if (existingProof) {
        const responseTime = Date.now() - startTime;
        await logRequest(apiKeyId, '/api/v1/validate', 'POST', 409, responseTime, false, bank.id, 'Duplicate proof submission', ipAddress, userAgent);

        const duplicateResponse: DuplicateResponse = {
          valid: false,
          duplicate: true,
          reason: 'proof_already_submitted',
          original_proof_id: existingProof.id,
          original_submitted_at: existingProof.createdAt,
        };

        return reply.status(409).send(duplicateResponse);
      }

      // STEP 6: Fetch Templates
      const templates = await prisma.template.findMany({
        where: { bankId: bank.id, companyId, isActive: true },
        select: { id: true, name: true, type: true, metadata: true, cloudinaryFileUrl: true },
      });

      if (templates.length === 0) {
        const responseTime = Date.now() - startTime;
        await logRequest(apiKeyId, '/api/v1/validate', 'POST', 404, responseTime, false, bank.id, 'No templates found for this bank', ipAddress, userAgent);
        throw new NotFoundError('No templates found for this bank. Please upload templates first.');
      }

      // STEP 7: Create ValidatedProof Record
      const validatedProof = await prisma.validatedProof.create({
        data: {
          sha256: hashResult.sha256,
          phash: hashResult.phash,
          bankId: bank.id,
          companyId,
          isDuplicate: false,
        },
      });

      // STEP 8: Call Python Validator
      const templateData: TemplateData[] = templates.map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        cloudinary_file_url: t.cloudinaryFileUrl,
        metadata: t.metadata as Record<string, unknown>,
      }));

      let validationResult;
      try {
        validationResult = await callPythonValidator(
          encryptedPdfB64,
          { id: bank.id, name: bank.name, code: bank.code },
          templateData,
          body.expected
        );
      } catch (error) {
        console.error('Python Validator error:', error);
        const responseTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        await logRequest(apiKeyId, '/api/v1/validate', 'POST', 500, responseTime, false, bank.id, `Validator error: ${errorMessage}`, ipAddress, userAgent);
        
        await prisma.validatedProof.update({
          where: { id: validatedProof.id },
          data: { valid: false, confidence: 0 },
        });
        
        throw new InternalServerError('Failed to verify receipt. Please try again later.');
      }

      // STEP 9: Update ValidatedProof
      await prisma.validatedProof.update({
        where: { id: validatedProof.id },
        data: {
          valid: validationResult.valid,
          confidence: validationResult.confidence,
          matchedTemplateId: validationResult.valid ? validationResult.matched_template_id : null,
          extractedData: validationResult.extracted as object | undefined,
        },
      });

      const responseTime = Date.now() - startTime;
      await logRequest(apiKeyId, '/api/v1/validate', 'POST', 200, responseTime, validationResult.valid, bank.id, undefined, ipAddress, userAgent);

      // STEP 10: Build Response
      let response: ValidResponse | InvalidResponse | DuplicateResponse;

      if (existingProof) {
        response = {
          duplicate: true,
          reason: 'proof_already_submitted',
          original_proof_id: existingProof.id,
          original_submitted_at: existingProof.createdAt,
        } as DuplicateResponse;
      } else if (validationResult.valid) {
        response = {
          duplicate: false,
          proof_id: validatedProof.id,
          valid: true,
          confidence: validationResult.confidence,
          matched_template_id: validationResult.matched_template_id,
          bank: { id: bank.id, name: bank.name, code: bank.code },
          templates_checked: templates.length,
          extracted: validationResult.extracted,
        };
      } else {
        response = {
          duplicate: false,
          proof_id: validatedProof.id,
          valid: false,
          confidence: validationResult.confidence,
          bank: { id: bank.id, name: bank.name, code: bank.code },
          templates_checked: templates.length,
        };
      }

      // STEP 11: Store Idempotency Result
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await prisma.idempotencyResult.upsert({
        where: { idempotencyKey: body.idempotency_key },
        update: { result: response as any, expiresAt },
        create: {
          idempotencyKey: body.idempotency_key,
          companyId,
          result: response as any,
          expiresAt,
        },
      });

      // STEP 12: Send Webhook (async, don't wait)
      if (body.webhook_url) {
        sendWebhook(body.webhook_url, {
          event: 'validation.completed',
          idempotency_key: body.idempotency_key,
          ...response,
        }).catch(err => console.error('Webhook send failed:', err));
      }

      // STEP 13: Return Response
      return reply.send(response);
    }
  );

  /**
   * GET /api/v1/validate/proof/:proofId
   */
  fastify.get<{ Params: { proofId: string } }>(
    '/proof/:proofId',
    { preHandler: authenticateApiKey },
    async (request, reply) => {
      const { proofId } = request.params;
      const companyId = request.user!.userId;

      const proof = await prisma.validatedProof.findFirst({
        where: { id: proofId, companyId },
        include: {
          bank: { select: { id: true, name: true, code: true } },
          matchedTemplate: { select: { id: true, name: true, type: true } },
        },
      });

      if (!proof) {
        throw new NotFoundError('Proof not found');
      }

      return reply.send({
        id: proof.id,
        sha256: proof.sha256,
        phash: proof.phash,
        is_duplicate: proof.isDuplicate,
        valid: proof.valid,
        confidence: proof.confidence,
        extracted_data: proof.extractedData,
        bank: proof.bank,
        matched_template: proof.matchedTemplate,
        created_at: proof.createdAt,
        updated_at: proof.updatedAt,
      });
    }
  );

  /**
   * GET /api/v1/validate/history
   */
  fastify.get<{
    Querystring: { page?: string; limit?: string; bank_id?: string; valid?: string };
  }>(
    '/history',
    { preHandler: authenticateApiKey },
    async (request, reply) => {
      const companyId = request.user!.userId;
      const page = parseInt(request.query.page || '1');
      const limit = Math.min(parseInt(request.query.limit || '20'), 100);
      const skip = (page - 1) * limit;
      const bankId = request.query.bank_id;
      const valid = request.query.valid === 'true' ? true : request.query.valid === 'false' ? false : undefined;

      const where = {
        companyId,
        ...(bankId && { bankId }),
        ...(valid !== undefined && { valid }),
      };

      const [proofs, total] = await Promise.all([
        prisma.validatedProof.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            bank: { select: { id: true, name: true, code: true } },
            matchedTemplate: { select: { id: true, name: true, type: true } },
          },
        }),
        prisma.validatedProof.count({ where }),
      ]);

      return reply.send({
        data: proofs.map((proof) => ({
          id: proof.id,
          sha256: proof.sha256,
          is_duplicate: proof.isDuplicate,
          valid: proof.valid,
          confidence: proof.confidence,
          bank: proof.bank,
          matched_template: proof.matchedTemplate,
          created_at: proof.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }
  );
}
