import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import { bankIdParamSchema } from '../../schemas';

export default async function bankRoutes(fastify: FastifyInstance) {
  // GET /api/v1/banks - Listar todos os bancos ativos
  fastify.get('/', async (_request, reply) => {
    const banks = await prisma.bank.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        country: true,
        logoUrl: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return reply.send({
      banks,
      total: banks.length,
    });
  });

  // GET /api/v1/banks/:id - Obter um banco específico
  fastify.get('/:id', async (request, reply) => {
    const { id } = bankIdParamSchema.parse(request.params);

    const bank = await prisma.bank.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        country: true,
        logoUrl: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            templates: true,
          },
        },
      },
    });

    if (!bank) {
      return reply.status(404).send({
        error: {
          message: 'Bank not found',
          statusCode: 404,
        },
      });
    }

    return reply.send({
      bank: {
        ...bank,
        templates_count: bank._count.templates,
        _count: undefined,
      },
    });
  });

  // GET /api/v1/banks/code/:code - Obter banco pelo código
  fastify.get('/code/:code', async (request, reply) => {
    const { code } = request.params as { code: string };

    const bank = await prisma.bank.findUnique({
      where: { code: code.toUpperCase() },
      select: {
        id: true,
        name: true,
        code: true,
        country: true,
        logoUrl: true,
        isActive: true,
      },
    });

    if (!bank) {
      return reply.status(404).send({
        error: {
          message: 'Bank not found',
          statusCode: 404,
        },
      });
    }

    return reply.send({ bank });
  });
}
