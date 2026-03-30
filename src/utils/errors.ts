import { FastifyReply, FastifyRequest } from 'fastify';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(409, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(422, message);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error') {
    super(500, message);
  }
}

export const errorHandler = async (
  error: Error,
  _request: FastifyRequest,
  reply: FastifyReply
) => {
  console.error('Error:', error);

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: {
        message: error.message,
        statusCode: error.statusCode,
      },
    });
  }

  // Zod validation errors
  if (error.name === 'ZodError') {
    return reply.status(400).send({
      error: {
        message: 'Validation failed',
        statusCode: 400,
        details: error,
      },
    });
  }

  // Prisma errors
  if (error.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    if (prismaError.code === 'P2002') {
      return reply.status(409).send({
        error: {
          message: 'Resource already exists',
          statusCode: 409,
        },
      });
    }
  }

  // Default error
  return reply.status(500).send({
    error: {
      message: 'Internal Server Error',
      statusCode: 500,
    },
  });
};
