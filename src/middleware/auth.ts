import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import { prisma } from '../config/database';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
      companyName: string;
      role: string;
      apiKeyId?: string; // Presente apenas quando autenticado via API Key
    };
  }
}

export const authenticate = async (request: FastifyRequest, _reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (request.cookies.token) {
      token = request.cookies.token;
    }

    if (!token) {
      throw new UnauthorizedError('Missing or invalid authorization header or cookie');
    }

    // Check if token is blacklisted
    const blacklisted = await prisma.tokenBlacklist.findUnique({
      where: { token },
    });

    if (blacklisted) {
      throw new UnauthorizedError('Token has been revoked');
    }

    // Verify token
    const payload = verifyToken(token);

    // Attach user to request
    request.user = {
      userId: payload.userId,
      email: payload.email,
      companyName: payload.companyName,
      role: payload.role,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Invalid or expired token');
  }
};
