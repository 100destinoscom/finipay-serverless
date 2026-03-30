import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import { cloudinary } from '../../config/cloudinary';
import { env } from '../../config/env';
import { authenticate } from '../../middleware/auth';
import { authenticateApiKey } from '../../middleware/apiKey';
import {
  createTemplateSchema,
  updateTemplateSchema,
  getTemplatesQuerySchema,
  templateIdParamSchema,
} from '../../schemas';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors';

// Middleware that accepts both JWT and API Key authentication
async function authenticateFlexible(request: any, reply: any) {
  const apiKey = request.headers['x-api-key'];

  if (apiKey) {
    // Use API Key authentication for third-party integrations
    return authenticateApiKey(request, reply);
  } else {
    // Use JWT authentication for dashboard
    return authenticate(request, reply);
  }
}

export default async function templatesRoutes(fastify: FastifyInstance) {
  // POST /api/v1/templates
  fastify.post('/', { preHandler: authenticate }, async (request: any, reply) => {
    const data = await request.file();

    if (!data) {
      throw new BadRequestError('File is required');
    }

    const buffer = await data.toBuffer();
    const fields: Record<string, any> = {};

    // Parse multipart fields
    if (data.fields) {
      for (const [key, value] of Object.entries(data.fields)) {
        const fieldValue = value as any;
        fields[key] = fieldValue.value;
      }
    }

    // Validate fields
    let metadata = {};
    try {
      if (fields.metadata) {
        metadata = JSON.parse(fields.metadata);
      }
    } catch {
      throw new BadRequestError('Invalid metadata JSON');
    }

    const validatedData = createTemplateSchema.parse({
      bank_id: fields.bank_id,
      name: fields.name,
      type: fields.type,
      metadata,
    });

    const metadataJson = JSON.stringify(validatedData.metadata);

    // Verificar se o banco existe
    const bank = await prisma.bank.findUnique({
      where: { id: validatedData.bank_id },
    });

    if (!bank) {
      throw new NotFoundError('Bank not found');
    }

    // Upload to Cloudinary
    const uploadResult = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: env.CLOUDINARY_FOLDER,
            resource_type: 'auto',
            allowed_formats: ['pdf', 'jpg', 'jpeg', 'png'],
          },
          (error, result) => {
            if (error) reject(error);
            else if (result) resolve(result);
            else reject(new Error('Upload failed'));
          }
        );
        stream.end(buffer);
      }
    );

    // Create template in database
    const template = await prisma.template.create({
      data: {
        name: validatedData.name,
        type: validatedData.type,
        metadata: JSON.parse(metadataJson),
        cloudinaryFileUrl: uploadResult.secure_url,
        cloudinaryPublicId: uploadResult.public_id,
        companyId: request.user!.userId,
        bankId: validatedData.bank_id,
      },
      select: {
        id: true,
        name: true,
        type: true,
        metadata: true,
        cloudinaryFileUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        bank: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return reply.status(201).send({
      message: 'Template created',
      template: {
        id: template.id,
        name: template.name,
        type: template.type,
        cloudinary_file_url: template.cloudinaryFileUrl,
        metadata: template.metadata,
        is_active: template.isActive,
        bank: template.bank,
        created_at: template.createdAt,
      },
    });
  });

  // GET /api/v1/templates
  fastify.get('/', { preHandler: authenticateFlexible }, async (request, reply) => {
    const query = getTemplatesQuerySchema.parse(request.query);

    const where: any = {
      companyId: request.user!.userId,
    };

    if (query.bank_id) {
      where.bankId = query.bank_id;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.is_active !== undefined) {
      where.isActive = query.is_active;
    }

    const templates = await prisma.template.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        cloudinaryFileUrl: true,
        metadata: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        bank: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reply.send({
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        cloudinary_file_url: t.cloudinaryFileUrl,
        metadata: t.metadata,
        is_active: t.isActive,
        bank: t.bank,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
      })),
      total: templates.length,
    });
  });

  // GET /api/v1/templates/:id
  fastify.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const params = templateIdParamSchema.parse(request.params);

    const template = await prisma.template.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        type: true,
        metadata: true,
        cloudinaryFileUrl: true,
        companyId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        bank: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundError('Template not found');
    }

    // Ensure template belongs to the requesting company
    if (template.companyId !== request.user!.userId) {
      throw new ForbiddenError('You do not have access to this template');
    }

    return reply.send({
      template: {
        id: template.id,
        name: template.name,
        type: template.type,
        metadata: template.metadata,
        cloudinary_file_url: template.cloudinaryFileUrl,
        is_active: template.isActive,
        bank: template.bank,
        created_at: template.createdAt,
        updated_at: template.updatedAt,
      },
    });
  });

  // PUT /api/v1/templates/:id - Update template
  fastify.put('/:id', { preHandler: authenticate }, async (request, reply) => {
    const params = templateIdParamSchema.parse(request.params);
    const validatedData = updateTemplateSchema.parse(request.body);

    const template = await prisma.template.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (!template) {
      throw new NotFoundError('Template not found');
    }

    // Ensure template belongs to the requesting company
    if (template.companyId !== request.user!.userId) {
      throw new ForbiddenError('You do not have access to this template');
    }

    // Se está atualizando o banco, verificar se existe
    if (validatedData.bank_id) {
      const bank = await prisma.bank.findUnique({
        where: { id: validatedData.bank_id },
      });
      if (!bank) {
        throw new NotFoundError('Bank not found');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.bank_id) updateData.bankId = validatedData.bank_id;
    if (validatedData.type) updateData.type = validatedData.type;
    if (validatedData.metadata) updateData.metadata = JSON.parse(JSON.stringify(validatedData.metadata));
    if (validatedData.is_active !== undefined) updateData.isActive = validatedData.is_active;

    const updatedTemplate = await prisma.template.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        type: true,
        metadata: true,
        cloudinaryFileUrl: true,
        isActive: true,
        updatedAt: true,
        bank: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return reply.send({
      message: 'Template updated successfully',
      template: {
        id: updatedTemplate.id,
        name: updatedTemplate.name,
        type: updatedTemplate.type,
        metadata: updatedTemplate.metadata,
        cloudinary_file_url: updatedTemplate.cloudinaryFileUrl,
        is_active: updatedTemplate.isActive,
        bank: updatedTemplate.bank,
        updated_at: updatedTemplate.updatedAt,
      },
    });
  });

  // DELETE /api/v1/templates/:id
  fastify.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const params = templateIdParamSchema.parse(request.params);

    const template = await prisma.template.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        companyId: true,
        cloudinaryPublicId: true,
      },
    });

    if (!template) {
      throw new NotFoundError('Template not found');
    }

    // Ensure template belongs to the requesting company
    if (template.companyId !== request.user!.userId) {
      throw new ForbiddenError('You do not have access to this template');
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(template.cloudinaryPublicId);
    } catch (error) {
      console.error('Failed to delete from Cloudinary:', error);
      // Continue with database deletion even if Cloudinary fails
    }

    // Delete from database
    await prisma.template.delete({
      where: { id: params.id },
    });

    return reply.send({
      message: 'Template deleted',
    });
  });
}
