import express from "express";
import { createServer, type Server } from "http";
import type { App } from "@shared/schema";
import { storage } from "./storage";

const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Maintenance</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f172a; color: #e2e8f0; }
    .box { text-align: center; padding: 2rem 1.5rem; max-width: 42rem; }
    h1 { font-size: clamp(2rem, 6vw, 3.5rem); font-weight: 700; line-height: 1.15; margin: 0 0 1.25rem; letter-spacing: -0.02em; }
    p { font-size: clamp(1.125rem, 3vw, 1.5rem); color: #94a3b8; margin: 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Maintenance is underway</h1>
    <p>The site will be available soon... maybe.</p>
  </div>
</body>
</html>`;

type StubEntry = {
  server: Server;
  port: number;
};

const stubs = new Map<string, StubEntry>();

function createStubApp(): express.Express {
  const app = express();
  app.use((_req, res) => {
    res.status(503).type("html").send(MAINTENANCE_HTML);
  });
  return app;
}

function stopStub(internalName: string): Promise<void> {
  const entry = stubs.get(internalName);
  if (!entry) return Promise.resolve();
  return new Promise((resolve, reject) => {
    entry.server.close((err) => {
      stubs.delete(internalName);
      if (err) reject(err);
      else resolve();
    });
  });
}

function startStub(internalName: string, port: number): Promise<void> {
  const stubApp = createStubApp();
  const server = createServer(stubApp);
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen({ port, host: "0.0.0.0" }, () => {
      stubs.set(internalName, { server, port });
      console.log(`[maintenance] Stub started for ${internalName} on 0.0.0.0:${port}`);
      resolve();
    });
  });
}

export async function syncApp(app: App): Promise<void> {
  if (app.isActive) {
    await stopStub(app.internalName);
    return;
  }

  if (app.port == null || app.port < 1 || app.port > 65535) {
    await stopStub(app.internalName);
    console.warn(
      `[maintenance] ${app.internalName}: isActive=false but port is missing or invalid; stub not started`,
    );
    return;
  }

  const existing = stubs.get(app.internalName);
  if (existing?.port === app.port) {
    return;
  }

  await stopStub(app.internalName);

  for (const [name, entry] of Array.from(stubs.entries())) {
    if (name !== app.internalName && entry.port === app.port) {
      console.warn(
        `[maintenance] Port ${app.port} already used by stub for ${name}; cannot start ${app.internalName}`,
      );
      return;
    }
  }

  try {
    await startStub(app.internalName, app.port);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[maintenance] Failed to start stub for ${app.internalName} on port ${app.port}:`, message);
  }
}

export async function stopStubForApp(internalName: string): Promise<void> {
  await stopStub(internalName);
}

export async function syncAll(): Promise<void> {
  const apps = await storage.getApps();
  const maintenanceApps = apps.filter((a) => !a.isActive);

  for (const name of Array.from(stubs.keys())) {
    if (!maintenanceApps.some((a) => a.internalName === name)) {
      await stopStub(name);
    }
  }

  for (const app of maintenanceApps) {
    await syncApp(app);
  }
}
