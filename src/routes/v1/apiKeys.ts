import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import { authenticate } from '../../middleware/auth';
import { generateApiKey } from '../../utils/apiKey';
import { apiKeyIdParamSchema } from '../../schemas';
import { NotFoundError, ForbiddenError } from '../../utils/errors';

export default async function apiKeysRoutes(fastify: FastifyInstance) {
  // POST /api/v1/apikeys
  fastify.post('/', { preHandler: authenticate }, async (request, reply) => {
    const key = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        key,
        companyId: request.user!.userId,
        isActive: true,
      },
      select: {
        id: true,
        key: true,
        createdAt: true,
      },
    });

    return reply.status(201).send({
      message: 'API key created',
      api_key: {
        id: apiKey.id,
        key: apiKey.key,
        created_at: apiKey.createdAt,
      },
    });
  });

  // GET /api/v1/apikeys
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        companyId: request.user!.userId,
      },
      select: {
        id: true,
        key: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reply.send({
      api_keys: apiKeys.map((k: any) => ({
        id: k.id,
        key: k.key,
        is_active: k.isActive,
        created_at: k.createdAt,
        updated_at: k.updatedAt,
      })),
    });
  });

  // DELETE /api/v1/apikeys/:id
  fastify.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const params = apiKeyIdParamSchema.parse(request.params);

    const apiKey = await prisma.apiKey.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundError('API key not found');
    }

    // Ensure API key belongs to the requesting company
    if (apiKey.companyId !== request.user!.userId) {
      throw new ForbiddenError('You do not have access to this API key');
    }

    await prisma.apiKey.delete({
      where: { id: params.id },
    });

    return reply.send({
      message: 'API key deleted',
    });
  });
}
