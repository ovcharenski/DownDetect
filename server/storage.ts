import { apps, statusChecks, type App, type InsertApp, type StatusCheck, type InsertStatusCheck, type AppStatsResponse } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte } from "drizzle-orm";

export interface IStorage {
  // Apps
  getApps(): Promise<App[]>;
  getApp(internalName: string): Promise<App | undefined>;
  getAppById(id: number): Promise<App | undefined>;
  createApp(app: InsertApp): Promise<App>;
  updateApp(internalName: string, app: Partial<InsertApp>): Promise<App | undefined>;
  deleteApp(internalName: string): Promise<void>;

  // Status Checks
  addStatusCheck(check: InsertStatusCheck): Promise<StatusCheck>;
  getLastCheck(appId: number): Promise<StatusCheck | undefined>;
  getStatusChecks(appId: number, limit: number): Promise<StatusCheck[]>;
  getChecksSince(appId: number, since: Date): Promise<StatusCheck[]>;
  
  // Stats
  getAppStats(appId: number, days: number): Promise<AppStatsResponse>;
  
  // Maintenance
  cleanupOldChecks(days: number): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getApps(): Promise<App[]> {
    return await db.select().from(apps).orderBy(apps.createdAt);
  }

  async getApp(internalName: string): Promise<App | undefined> {
    const [app] = await db.select().from(apps).where(eq(apps.internalName, internalName));
    return app;
  }

  async getAppById(id: number): Promise<App | undefined> {
    const [app] = await db.select().from(apps).where(eq(apps.id, id));
    return app;
  }

  async createApp(insertApp: InsertApp): Promise<App> {
    const [app] = await db.insert(apps).values(insertApp).returning();
    return app;
  }

  async updateApp(internalName: string, update: Partial<InsertApp>): Promise<App | undefined> {
    const [updated] = await db
      .update(apps)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(apps.internalName, internalName))
      .returning();
    return updated;
  }

  async deleteApp(internalName: string): Promise<void> {
    await db.delete(apps).where(eq(apps.internalName, internalName));
  }

  async addStatusCheck(check: InsertStatusCheck): Promise<StatusCheck> {
    const [newCheck] = await db.insert(statusChecks).values(check).returning();
    return newCheck;
  }

  async getLastCheck(appId: number): Promise<StatusCheck | undefined> {
    const [check] = await db
      .select()
      .from(statusChecks)
      .where(eq(statusChecks.appId, appId))
      .orderBy(desc(statusChecks.checkedAt))
      .limit(1);
    return check;
  }

  async getStatusChecks(appId: number, limit: number): Promise<StatusCheck[]> {
    return await db
      .select()
      .from(statusChecks)
      .where(eq(statusChecks.appId, appId))
      .orderBy(desc(statusChecks.checkedAt))
      .limit(limit);
  }

  async getChecksSince(appId: number, since: Date): Promise<StatusCheck[]> {
    return await db
      .select()
      .from(statusChecks)
      .where(and(eq(statusChecks.appId, appId), gte(statusChecks.checkedAt, since)))
      .orderBy(statusChecks.checkedAt); // Ascending for graphs
  }

  async getAppStats(appId: number, days: number): Promise<AppStatsResponse> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const checks = await this.getChecksSince(appId, since);
    
    if (checks.length === 0) {
      return {
        uptimePercentage: 0,
        avgResponseTime: 0,
        lastIncidents: []
      };
    }

    const healthyCount = checks.filter(c => c.status === "healthy").length;
    const uptime = (healthyCount / checks.length) * 100;
    
    const totalResponseTime = checks.reduce((acc, c) => acc + (c.responseTime || 0), 0);
    const avgResponse = totalResponseTime / checks.length;

    const incidents = checks
      .filter(c => c.status !== "healthy")
      .sort((a, b) => b.checkedAt.getTime() - a.checkedAt.getTime())
      .slice(0, 10);

    return {
      uptimePercentage: Number(uptime.toFixed(2)),
      avgResponseTime: Math.round(avgResponse),
      lastIncidents: incidents
    };
  }

  async cleanupOldChecks(days: number): Promise<number> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);
    // Convert to Unix timestamp (seconds) since SQLite stores timestamps as integers
    const thresholdTimestamp = Math.floor(threshold.getTime() / 1000);

    const result = await db.delete(statusChecks).where(sql`${statusChecks.checkedAt} < ${thresholdTimestamp}`);
    return Number(result.rowCount);
  }
}

export const storage = new DatabaseStorage();
