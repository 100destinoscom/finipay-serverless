import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import { authenticate } from '../../middleware/auth';
import { authenticateApiKey } from '../../middleware/apiKey';
import { statsQuerySchema } from '../../schemas';

export default async function statsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/stats - Estatísticas gerais (autenticado por JWT)
  fastify.get(
    '/',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const query = statsQuerySchema.parse(request.query);
      const userId = request.user!.userId;

      // Calcular período
      const now = new Date();
      let startDate: Date;
      
      if (query.start_date) {
        startDate = new Date(query.start_date);
      } else {
        switch (query.period) {
          case 'day':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'year':
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
          case 'month':
          default:
            startDate = new Date(now.setMonth(now.getMonth() - 1));
        }
      }

      const endDate = query.end_date ? new Date(query.end_date) : new Date();

      // Buscar API keys do usuário
      const apiKeys = await prisma.apiKey.findMany({
        where: { companyId: userId },
        select: { id: true },
      });

      const apiKeyIds = apiKeys.map((k) => k.id);

      // Buscar estatísticas de requests
      const [totalRequests, successfulRequests, failedRequests, requestsByBank] = await Promise.all([
        // Total de requests
        prisma.requestLog.count({
          where: {
            apiKeyId: { in: apiKeyIds },
            createdAt: { gte: startDate, lte: endDate },
          },
        }),

        // Requests com sucesso
        prisma.requestLog.count({
          where: {
            apiKeyId: { in: apiKeyIds },
            createdAt: { gte: startDate, lte: endDate },
            success: true,
          },
        }),

        // Requests com falha
        prisma.requestLog.count({
          where: {
            apiKeyId: { in: apiKeyIds },
            createdAt: { gte: startDate, lte: endDate },
            success: false,
          },
        }),

        // Requests por banco
        prisma.requestLog.groupBy({
          by: ['bankId'],
          where: {
            apiKeyId: { in: apiKeyIds },
            createdAt: { gte: startDate, lte: endDate },
            bankId: { not: null },
          },
          _count: { id: true },
        }),
      ]);

      // Buscar nomes dos bancos
      const bankIds = requestsByBank.map((r) => r.bankId).filter(Boolean) as string[];
      const banks = await prisma.bank.findMany({
        where: { id: { in: bankIds } },
        select: { id: true, name: true, code: true },
      });

      const bankMap = new Map(banks.map((b) => [b.id, b]));

      // Calcular média de tempo de resposta
      const avgResponseTime = await prisma.requestLog.aggregate({
        where: {
          apiKeyId: { in: apiKeyIds },
          createdAt: { gte: startDate, lte: endDate },
        },
        _avg: { responseTime: true },
      });

      // Contar templates
      const templatesCount = await prisma.template.count({
        where: { companyId: userId },
      });

      return reply.send({
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          type: query.period,
        },
        summary: {
          total_requests: totalRequests,
          successful_requests: successfulRequests,
          failed_requests: failedRequests,
          success_rate: totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(2) + '%' : '0%',
          avg_response_time_ms: Math.round(avgResponseTime._avg.responseTime || 0),
          total_templates: templatesCount,
          total_api_keys: apiKeys.length,
        },
        requests_by_bank: requestsByBank.map((r) => ({
          bank_id: r.bankId,
          bank_name: bankMap.get(r.bankId!)?.name || 'Unknown',
          bank_code: bankMap.get(r.bankId!)?.code || 'N/A',
          count: r._count.id,
        })),
      });
    }
  );

  // GET /api/v1/stats/api-key - Estatísticas por API Key (autenticado por API Key)
  fastify.get(
    '/api-key',
    {
      preHandler: authenticateApiKey,
    },
    async (request, reply) => {
      const query = statsQuerySchema.parse(request.query);
      const apiKeyId = request.user!.apiKeyId;

      // Calcular período
      const now = new Date();
      let startDate: Date;
      
      if (query.start_date) {
        startDate = new Date(query.start_date);
      } else {
        switch (query.period) {
          case 'day':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'year':
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
          case 'month':
          default:
            startDate = new Date(now.setMonth(now.getMonth() - 1));
        }
      }

      const endDate = query.end_date ? new Date(query.end_date) : new Date();

      // Estatísticas
      const [totalRequests, successfulRequests, recentRequests] = await Promise.all([
        prisma.requestLog.count({
          where: {
            apiKeyId,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),

        prisma.requestLog.count({
          where: {
            apiKeyId,
            createdAt: { gte: startDate, lte: endDate },
            success: true,
          },
        }),

        // Últimos 10 requests
        prisma.requestLog.findMany({
          where: { apiKeyId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            endpoint: true,
            method: true,
            statusCode: true,
            responseTime: true,
            success: true,
            bankId: true,
            createdAt: true,
          },
        }),
      ]);

      // Média de tempo de resposta
      const avgResponseTime = await prisma.requestLog.aggregate({
        where: {
          apiKeyId,
          createdAt: { gte: startDate, lte: endDate },
        },
        _avg: { responseTime: true },
      });

      return reply.send({
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          type: query.period,
        },
        summary: {
          total_requests: totalRequests,
          successful_requests: successfulRequests,
          failed_requests: totalRequests - successfulRequests,
          success_rate: totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(2) + '%' : '0%',
          avg_response_time_ms: Math.round(avgResponseTime._avg.responseTime || 0),
        },
        recent_requests: recentRequests,
      });
    }
  );

  // GET /api/v1/stats/requests - Listar requests detalhados (autenticado por JWT)
  fastify.get(
    '/requests',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { page = '1', limit = '20', success, bank_id } = request.query as {
        page?: string;
        limit?: string;
        success?: string;
        bank_id?: string;
      };

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      // Buscar API keys do usuário
      const apiKeys = await prisma.apiKey.findMany({
        where: { companyId: userId },
        select: { id: true },
      });

      const apiKeyIds = apiKeys.map((k) => k.id);

      // Filtros
      const where: {
        apiKeyId: { in: string[] };
        success?: boolean;
        bankId?: string;
      } = {
        apiKeyId: { in: apiKeyIds },
      };

      if (success !== undefined) {
        where.success = success === 'true';
      }

      if (bank_id) {
        where.bankId = bank_id;
      }

      const [requests, total] = await Promise.all([
        prisma.requestLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
          select: {
            id: true,
            endpoint: true,
            method: true,
            statusCode: true,
            responseTime: true,
            success: true,
            bankId: true,
            errorMessage: true,
            ipAddress: true,
            createdAt: true,
            apiKey: {
              select: {
                id: true,
                name: true,
                key: true,
              },
            },
          },
        }),
        prisma.requestLog.count({ where }),
      ]);

      return reply.send({
        requests: requests.map((r) => ({
          ...r,
          apiKey: {
            id: r.apiKey.id,
            name: r.apiKey.name,
            key: r.apiKey.key.substring(0, 15) + '...',
          },
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          total_pages: Math.ceil(total / limitNum),
        },
      });
    }
  );
}
