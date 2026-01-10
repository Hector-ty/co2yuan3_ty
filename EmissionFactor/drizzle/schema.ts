import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 化石燃料排放因子表 / Fossil Fuel Emission Factors
 */
export const fossilFuelFactors = mysqlTable("fossil_fuel_factors", {
  id: int("id").autoincrement().primaryKey(),
  fuelTypeCn: varchar("fuelTypeCn", { length: 50 }).notNull(),
  fuelTypeEn: varchar("fuelTypeEn", { length: 50 }).notNull(),
  emissionFactor: varchar("emissionFactor", { length: 20 }).notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  gwp: varchar("gwp", { length: 10 }).default("-"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FossilFuelFactor = typeof fossilFuelFactors.$inferSelect;
export type InsertFossilFuelFactor = typeof fossilFuelFactors.$inferInsert;

/**
 * 逸散排放因子表 / Fugitive Emission Factors
 */
export const fugitiveFactors = mysqlTable("fugitive_factors", {
  id: int("id").autoincrement().primaryKey(),
  gasNameCn: varchar("gasNameCn", { length: 50 }).notNull(),
  gasNameEn: varchar("gasNameEn", { length: 50 }).notNull(),
  gwpValue: int("gwpValue").notNull(),
  emissionFactor: varchar("emissionFactor", { length: 20 }).notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  category: mysqlEnum("category", ["airConditioning", "fireSuppression"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FugitiveFactor = typeof fugitiveFactors.$inferSelect;
export type InsertFugitiveFactor = typeof fugitiveFactors.$inferInsert;

/**
 * 间接排放因子表 / Indirect Emission Factors
 */
export const indirectFactors = mysqlTable("indirect_factors", {
  id: int("id").autoincrement().primaryKey(),
  emissionTypeCn: varchar("emissionTypeCn", { length: 50 }).notNull(),
  emissionTypeEn: varchar("emissionTypeEn", { length: 50 }).notNull(),
  emissionFactor: varchar("emissionFactor", { length: 20 }).notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  remarks: varchar("remarks", { length: 100 }).default("-"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IndirectFactor = typeof indirectFactors.$inferSelect;
export type InsertIndirectFactor = typeof indirectFactors.$inferInsert;
