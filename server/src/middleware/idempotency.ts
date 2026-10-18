import { Response, NextFunction } from 'express';
import prisma from '../db';
import { AuthRequest } from '../types';

export async function idempotencyMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  if (!idempotencyKey) {
    next();
    return;
  }

  try {
    const existing = await prisma.idempotencyKey.findUnique({
      where: { key: idempotencyKey },
    });

    if (existing) {
      res.setHeader('X-Idempotent-Replay', 'true');
      res.status(existing.statusCode).json(JSON.parse(existing.responseBody));
      return;
    }

    // Intercept res.json to capture response
    const originalJson = res.json.bind(res);
    res.json = (body: any): Response => {
      // Store in background
      const userId = req.user?.id || 'anonymous';
      const statusCode = res.statusCode || 200;

      // Only store for successful operations or client errors (not 500s)
      if (statusCode < 500) {
        prisma.idempotencyKey.create({
          data: {
            key: idempotencyKey,
            userId,
            endpoint: req.originalUrl,
            statusCode,
            responseBody: JSON.stringify(body),
          },
        }).catch((err) => {
          console.error('[Idempotency] Failed to store key:', err);
        });
      }

      return originalJson(body);
    };

    next();
  } catch (err) {
    console.error('[Idempotency] Error reading key:', err);
    next();
  }
}
