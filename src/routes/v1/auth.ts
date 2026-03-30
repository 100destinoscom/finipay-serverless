import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateToken, getTokenExpiration } from '../../utils/jwt';
import { registerSchema, loginSchema } from '../../schemas';
import { ConflictError, UnauthorizedError, BadRequestError } from '../../utils/errors';
import { authenticate } from '../../middleware/auth';
import { env } from '../../config/env';

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /api/v1/auth/register
  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(body.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
        companyName: body.company_name,
        role: 'company',
      },
      select: {
        id: true,
        email: true,
        companyName: true,
        role: true,
        createdAt: true,
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      companyName: user.companyName,
      role: user.role,
    });

    // Set cookie
    const isProduction = env.NODE_ENV === 'production';
    reply.setCookie('token', token, {
      path: '/',
      httpOnly: true,
      secure: isProduction, // True in production, false in dev
      sameSite: isProduction ? 'none' : 'lax', // None for cross-site in prod, Lax for local
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return reply.status(201).send({
      message: 'Account created',
      user: {
        id: user.id,
        email: user.email,
        company_name: user.companyName,
        created_at: user.createdAt,
        updated_at: user.createdAt, // Using createdAt for updated_at as it's new
      },
      token,
    });
  });

  // POST /api/v1/auth/login
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await comparePassword(body.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      companyName: user.companyName,
      role: user.role,
    });

    // Set cookie
    const isProduction = env.NODE_ENV === 'production';
    reply.setCookie('token', token, {
      path: '/',
      httpOnly: true,
      secure: isProduction, // True in production, false in dev
      sameSite: isProduction ? 'none' : 'lax', // None for cross-site in prod, Lax for local
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return reply.send({
      message: 'Logged in',
      user: {
        id: user.id,
        email: user.email,
        company_name: user.companyName,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      },
      token,
    });
  });

  // POST /api/v1/auth/logout
  fastify.post('/logout', { preHandler: authenticate }, async (request, reply) => {
    const authHeader = request.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (request.cookies.token) {
      token = request.cookies.token;
    }

    if (!token) {
      throw new BadRequestError('No token provided');
    }
    const expiresAt = getTokenExpiration(token);

    if (!expiresAt) {
      throw new BadRequestError('Invalid token');
    }

    // Add token to blacklist
    await prisma.tokenBlacklist.create({
      data: {
        token,
        expiresAt,
      },
    });

    // Clear cookie
    reply.clearCookie('token', { path: '/' });

    return reply.send({
      message: 'Logged out',
    });
  });

  // GET /api/v1/auth/me
  fastify.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user;

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Fetch full user details from database to ensure we have latest data
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        companyName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!dbUser) {
      throw new UnauthorizedError('User not found');
    }

    return reply.send({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        company_name: dbUser.companyName,
        created_at: dbUser.createdAt,
        updated_at: dbUser.updatedAt,
      },
    });
  });
}
