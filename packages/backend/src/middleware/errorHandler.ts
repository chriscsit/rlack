import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Default error
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';

  // Prisma errors
  if (error.message.includes('Unique constraint')) {
    statusCode = 409;
    message = 'Resource already exists';
  }

  if (error.message.includes('Record not found')) {
    statusCode = 404;
    message = 'Resource not found';
  }

  // JWT errors
  if (error.message.includes('jwt malformed')) {
    statusCode = 401;
    message = 'Invalid token format';
  }

  if (error.message.includes('jwt expired')) {
    statusCode = 401;
    message = 'Token expired';
  }

  // Validation errors
  if (error.message.includes('ValidationError')) {
    statusCode = 400;
    message = 'Validation failed';
  }

  // File upload errors
  if (error.message.includes('File too large')) {
    statusCode = 413;
    message = 'File size exceeds limit';
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};