import { z } from 'zod';
import { insertAppSchema, insertStatusCheckSchema, apps, statusChecks } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  health: {
    get: {
      method: 'GET' as const,
      path: '/api/health',
      responses: {
        200: z.object({
          status: z.enum(["healthy", "degraded", "unhealthy"]),
          timestamp: z.number(),
          version: z.string(),
        }),
      },
    },
  },
  apps: {
    list: {
      method: 'GET' as const,
      path: '/api/apps',
      responses: {
        200: z.array(z.custom<typeof apps.$inferSelect & { lastCheck?: typeof statusChecks.$inferSelect }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/apps/:internal_name',
      responses: {
        200: z.custom<typeof apps.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    getStatus: {
      method: 'GET' as const,
      path: '/api/apps/:internal_name/status',
      input: z.object({
        hours: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      }),
      responses: {
        200: z.array(z.custom<typeof statusChecks.$inferSelect>()),
        404: errorSchemas.notFound,
      },
    },
    getStats: {
      method: 'GET' as const,
      path: '/api/apps/:internal_name/stats',
      input: z.object({
        hours: z.coerce.number().optional().default(24),
      }),
      responses: {
        200: z.object({
          uptimePercentage: z.number(),
          avgResponseTime: z.number(),
          lastIncidents: z.array(z.custom<typeof statusChecks.$inferSelect>()),
        }),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/apps',
      input: insertAppSchema,
      responses: {
        201: z.custom<typeof apps.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/apps/:internal_name',
      input: insertAppSchema.partial(),
      responses: {
        200: z.custom<typeof apps.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/apps/:internal_name',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    check: {
      method: 'POST' as const,
      path: '/api/apps/:internal_name/check',
      responses: {
        200: z.custom<typeof statusChecks.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
