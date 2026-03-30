import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../utils/errors';
import { prisma } from '../config/database';

export const authenticateApiKey = async (request: FastifyRequest, _reply: FastifyReply) => {
  try {
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedError('Missing API key');
    }

    // Verify API key
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: {
        company: {
          select: {
            id: true,
            email: true,
            companyName: true,
            role: true,
          },
        },
      },
    });

    if (!key || !key.isActive) {
      throw new UnauthorizedError('Invalid or inactive API key');
    }

    // Attach user and apiKeyId to request
    request.user = {
      userId: key.company.id,
      email: key.company.email,
      companyName: key.company.companyName,
      role: key.company.role,
      apiKeyId: key.id,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Invalid API key');
  }
};
