import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const STATUS_ENUM = ["healthy", "degraded", "unhealthy"] as const;

export const apps = sqliteTable("apps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  internalName: text("internal_name").unique().notNull(),
  displayName: text("display_name").notNull(),
  baseUrl: text("base_url").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(sql`1`).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const statusChecks = sqliteTable("status_checks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id").references(() => apps.id, { onDelete: "cascade" }).notNull(),
  status: text("status", { enum: STATUS_ENUM }).notNull(),
  version: text("version"),
  responseTime: integer("response_time"),
  statusCode: integer("status_code"),
  errorMessage: text("error_message"),
  checkedAt: integer("checked_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => {
  return {
    appCheckedIdx: index("idx_status_checks_app_checked").on(table.appId, table.checkedAt),
    checkedIdx: index("idx_status_checks_checked").on(table.checkedAt),
  };
});

export const appsRelations = relations(apps, ({ many }) => ({
  checks: many(statusChecks),
}));

export const pushTokens = sqliteTable("push_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").unique().notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const statusChecksRelations = relations(statusChecks, ({ one }) => ({
  app: one(apps, {
    fields: [statusChecks.appId],
    references: [apps.id],
  }),
}));

// Base Schemas
export const insertAppSchema = createInsertSchema(apps).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertStatusCheckSchema = createInsertSchema(statusChecks).omit({ 
  id: true, 
  checkedAt: true 
});

// Types
export type App = typeof apps.$inferSelect;
export type InsertApp = z.infer<typeof insertAppSchema>;
export type StatusCheck = typeof statusChecks.$inferSelect;
export type InsertStatusCheck = z.infer<typeof insertStatusCheckSchema>;

// API Request/Response Types
export type CreateAppRequest = InsertApp;
export type UpdateAppRequest = Partial<InsertApp>;

export type AppWithStatus = App & {
  lastCheck?: StatusCheck;
};

export type AppStatsResponse = {
  uptimePercentage: number;
  avgResponseTime: number;
  lastIncidents: StatusCheck[];
};

export type HealthResponse = {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: number;
  version: string;
};
