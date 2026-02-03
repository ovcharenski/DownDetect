import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";

const CHECK_INTERVAL = Number(process.env.VITE_AUTO_TIME) * 60 || 60; // seconds
const EXPIRE_DAYS = Number(process.env.EXPIRE_DAYS) || 30;

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const key = process.env.KEY_ACCESS || "default_dev_key"; // Fallback for dev ease


  if (!authHeader || authHeader !== `Bearer ${key}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // === API Routes ===

  // Health
  app.get(api.health.get.path, (_req, res) => {
    res.json({
      status: "healthy",
      timestamp: Math.floor(Date.now() / 1000),
      version: "1.0",
    });
  });

  // Apps List - requires KEY_ACCESS
  app.get(api.apps.list.path, requireAuth, async (_req, res) => {
    const apps = await storage.getApps();
    const appsWithStatus = await Promise.all(
      apps.map(async (app) => {
        const lastCheck = await storage.getLastCheck(app.id);
        return { ...app, lastCheck };
      }),
    );
    res.json(appsWithStatus);
  });

  // App Details - requires KEY_ACCESS
  app.get(api.apps.get.path, requireAuth, async (req, res) => {
    const internalName = Array.isArray(req.params.internal_name) ? req.params.internal_name[0] : req.params.internal_name;
    const app = await storage.getApp(internalName);
    if (!app) return res.status(404).json({ message: "App not found" });
    res.json(app);
  });

  // App History - requires KEY_ACCESS
  app.get(api.apps.getStatus.path, requireAuth, async (req, res) => {
    const internalName = Array.isArray(req.params.internal_name) ? req.params.internal_name[0] : req.params.internal_name;
    const app = await storage.getApp(internalName);
    if (!app) return res.status(404).json({ message: "App not found" });

    const limit = Number(req.query.limit) || 50;
    const checks = await storage.getStatusChecks(app.id, limit);
    res.json(checks);
  });

  // App Stats - requires KEY_ACCESS
  app.get(api.apps.getStats.path, requireAuth, async (req, res) => {
    const internalName = Array.isArray(req.params.internal_name) ? req.params.internal_name[0] : req.params.internal_name;
    const app = await storage.getApp(internalName);
    if (!app) return res.status(404).json({ message: "App not found" });

    const days = Number(req.query.days) || 30;
    const stats = await storage.getAppStats(app.id, days);
    res.json(stats);
  });

  // Protected Routes
  app.post(api.apps.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.apps.create.input.parse(req.body);
      const app = await storage.createApp(input);
      res.status(201).json(app);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.apps.update.path, requireAuth, async (req, res) => {
    try {
      const input = api.apps.update.input.parse(req.body);
      const internalName = Array.isArray(req.params.internal_name) ? req.params.internal_name[0] : req.params.internal_name;
      const app = await storage.updateApp(internalName, input);
      if (!app) return res.status(404).json({ message: "App not found" });
      res.json(app);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.apps.delete.path, requireAuth, async (req, res) => {
    const internalName = Array.isArray(req.params.internal_name) ? req.params.internal_name[0] : req.params.internal_name;
    const app = await storage.getApp(internalName);
    if (!app) return res.status(404).json({ message: "App not found" });
    await storage.deleteApp(internalName);
    res.status(204).send();
  });

  app.post(api.apps.check.path, requireAuth, async (req, res) => {
    const internalName = Array.isArray(req.params.internal_name) ? req.params.internal_name[0] : req.params.internal_name;
    const app = await storage.getApp(internalName);
    if (!app) return res.status(404).json({ message: "App not found" });

    const check = await checkAppStatus(app);
    res.json(check);
  });

  // === Scheduler ===
  startScheduler();

  return httpServer;
}

// --- Scheduler Logic ---

async function checkAppStatus(app: any) {
  const start = Date.now();
  let status: "healthy" | "degraded" | "unhealthy" = "unhealthy";
  let statusCode: number | undefined;
  let errorMsg: string | undefined;
  let version: string | undefined;

  try {
    const response = await fetch(app.baseUrl, {
      method: "GET",
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    statusCode = response.status;
    const duration = Date.now() - start;

    if (response.ok) {
      status = duration > 2000 ? "degraded" : "healthy"; // Simple threshold for degraded

      // Try to extract version from headers (common headers: X-Version, X-API-Version, Version)
      version =
        response.headers.get("X-Version") ||
        response.headers.get("X-API-Version") ||
        response.headers.get("Version") ||
        response.headers.get("x-version") ||
        response.headers.get("x-api-version") ||
        undefined;

      // If not in headers, try to parse JSON body for version field
      if (!version) {
        try {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const text = await response.text();
            if (text) {
              const json = JSON.parse(text);
              version =
                json.version || json.Version || json.VERSION || undefined;
            }
          }
        } catch (e) {
          // Ignore JSON parsing errors, version is optional
        }
      }
    } else {
      status = "unhealthy";
      errorMsg = `HTTP ${response.status}`;
    }

    return await storage.addStatusCheck({
      appId: Number(app.id),
      status,
      statusCode,
      responseTime: duration,
      version,
      errorMessage: errorMsg,
    });
  } catch (err: any) {
    return await storage.addStatusCheck({
      appId: Number(app.id),
      status: "unhealthy",
      responseTime: Date.now() - start,
      errorMessage: err.message || "Network Error",
    });
  }
}

function startScheduler() {
  // Initial check (silent)
  runChecks();

  setInterval(runChecks, CHECK_INTERVAL * 1000);

  // Cleanup old checks once at startup and then daily (only log if something was deleted)
  storage.cleanupOldChecks(EXPIRE_DAYS).then((count) => {
    if (count > 0) {
      console.log(`Cleaned up ${count} old checks`);
    }
  });

  // Cleanup daily
  setInterval(
    () => {
      storage.cleanupOldChecks(EXPIRE_DAYS).then((count) => {
        if (count > 0) {
          console.log(`Cleaned up ${count} old checks`);
        }
      });
    },
    24 * 60 * 60 * 1000,
  );
}

async function runChecks() {
  try {
    const apps = await storage.getApps();
    const activeApps = apps.filter((a) => a.isActive);

    // Only log if there are apps to check (reduce noise)
    if (activeApps.length > 0) {
      for (const app of activeApps) {
        try {
          // Verify app still exists before checking (might have been deleted)
          const existingApp = await storage.getAppById(app.id);
          if (existingApp && existingApp.isActive) {
            await checkAppStatus(app);
          }
        } catch (err: any) {
          // Skip if app was deleted or foreign key constraint fails
          if (err.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
            continue;
          }
          console.error(`Error checking app ${app.displayName}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error("Scheduler Error:", err);
  }
}

// Seed Data
(async () => {
  if (process.env.NODE_ENV !== "production") {
    const apps = await storage.getApps();
    if (apps.length === 0) {
      console.log("Seeding database...");
      await storage.createApp({
        internalName: "google-check",
        displayName: "Google Public DNS",
        baseUrl: "https://dns.google",
        isActive: true,
      });
      await storage.createApp({
        internalName: "example-com",
        displayName: "Example Domain",
        baseUrl: "https://example.com",
        isActive: true,
      });
      await storage.createApp({
        internalName: "broken-app",
        displayName: "Broken App",
        baseUrl: "https://this-does-not-exist-12345.com",
        isActive: true,
      });
    }
  }
})();
