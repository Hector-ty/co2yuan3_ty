import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  fossilFuelFactors, 
  fugitiveFactors, 
  indirectFactors,
  InsertFossilFuelFactor,
  InsertFugitiveFactor,
  InsertIndirectFactor
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== 化石燃料排放因子 ====================

export async function getAllFossilFuelFactors() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(fossilFuelFactors).orderBy(fossilFuelFactors.id);
}

export async function getFossilFuelFactorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(fossilFuelFactors).where(eq(fossilFuelFactors.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createFossilFuelFactor(data: InsertFossilFuelFactor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(fossilFuelFactors).values(data);
}

export async function updateFossilFuelFactor(id: number, data: Partial<InsertFossilFuelFactor>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(fossilFuelFactors).set(data).where(eq(fossilFuelFactors.id, id));
}

export async function deleteFossilFuelFactor(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(fossilFuelFactors).where(eq(fossilFuelFactors.id, id));
}

// ==================== 逸散排放因子 ====================

export async function getAllFugitiveFactors() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(fugitiveFactors).orderBy(fugitiveFactors.id);
}

export async function getFugitiveFactorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(fugitiveFactors).where(eq(fugitiveFactors.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createFugitiveFactor(data: InsertFugitiveFactor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(fugitiveFactors).values(data);
}

export async function updateFugitiveFactor(id: number, data: Partial<InsertFugitiveFactor>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(fugitiveFactors).set(data).where(eq(fugitiveFactors.id, id));
}

export async function deleteFugitiveFactor(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(fugitiveFactors).where(eq(fugitiveFactors.id, id));
}

// ==================== 间接排放因子 ====================

export async function getAllIndirectFactors() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(indirectFactors).orderBy(indirectFactors.id);
}

export async function getIndirectFactorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(indirectFactors).where(eq(indirectFactors.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createIndirectFactor(data: InsertIndirectFactor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(indirectFactors).values(data);
}

export async function updateIndirectFactor(id: number, data: Partial<InsertIndirectFactor>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(indirectFactors).set(data).where(eq(indirectFactors.id, id));
}

export async function deleteIndirectFactor(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(indirectFactors).where(eq(indirectFactors.id, id));
}

// ==================== 种子数据 ====================

export async function seedEmissionFactors() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 检查是否已有数据
  const existingFossil = await db.select().from(fossilFuelFactors).limit(1);
  if (existingFossil.length > 0) {
    console.log("[Seed] Data already exists, skipping...");
    return;
  }

  // 化石燃料排放因子
  const fossilData: InsertFossilFuelFactor[] = [
    { fuelTypeCn: "无烟煤", fuelTypeEn: "anthracite", emissionFactor: "2.09", unit: "tCO₂/t", gwp: "-" },
    { fuelTypeCn: "烟煤", fuelTypeEn: "bituminousCoal", emissionFactor: "1.79", unit: "tCO₂/t", gwp: "-" },
    { fuelTypeCn: "褐煤", fuelTypeEn: "lignite", emissionFactor: "1.21", unit: "tCO₂/t", gwp: "-" },
    { fuelTypeCn: "焦炉煤气", fuelTypeEn: "cokeOvenGas", emissionFactor: "8.57", unit: "tCO₂/10⁴Nm³", gwp: "-" },
    { fuelTypeCn: "管道煤气", fuelTypeEn: "pipelineGas", emissionFactor: "7.00", unit: "tCO₂/10⁴Nm³", gwp: "-" },
    { fuelTypeCn: "天然气", fuelTypeEn: "naturalGas", emissionFactor: "21.62", unit: "tCO₂/10⁴Nm³", gwp: "-" },
    { fuelTypeCn: "汽油", fuelTypeEn: "gasoline", emissionFactor: "3.04", unit: "tCO₂/t", gwp: "-" },
    { fuelTypeCn: "柴油", fuelTypeEn: "diesel", emissionFactor: "3.14", unit: "tCO₂/t", gwp: "-" },
    { fuelTypeCn: "燃料油", fuelTypeEn: "fuelOil", emissionFactor: "3.05", unit: "tCO₂/t", gwp: "-" },
    { fuelTypeCn: "一般煤油", fuelTypeEn: "kerosene", emissionFactor: "3.16", unit: "tCO₂/t", gwp: "-" },
    { fuelTypeCn: "液化石油气", fuelTypeEn: "lpg", emissionFactor: "2.92", unit: "tCO₂/t", gwp: "-" },
    { fuelTypeCn: "液化天然气", fuelTypeEn: "lng", emissionFactor: "2.59", unit: "tCO₂/t", gwp: "-" },
  ];

  // 逸散排放因子
  const fugitiveData: InsertFugitiveFactor[] = [
    { gasNameCn: "HCFC-22", gasNameEn: "HCFC-22", gwpValue: 1960, emissionFactor: "100%", unit: "tCO₂e/t", category: "airConditioning" },
    { gasNameCn: "HFC-32", gasNameEn: "HFC-32", gwpValue: 771, emissionFactor: "100%", unit: "tCO₂e/t", category: "airConditioning" },
    { gasNameCn: "HFC-125", gasNameEn: "HFC-125", gwpValue: 3740, emissionFactor: "100%", unit: "tCO₂e/t", category: "airConditioning" },
    { gasNameCn: "HFC-134a", gasNameEn: "HFC-134a", gwpValue: 1530, emissionFactor: "100%", unit: "tCO₂e/t", category: "airConditioning" },
    { gasNameCn: "HFC-143a", gasNameEn: "HFC-143a", gwpValue: 5810, emissionFactor: "100%", unit: "tCO₂e/t", category: "airConditioning" },
    { gasNameCn: "HFC-227a", gasNameEn: "HFC-227a", gwpValue: 3600, emissionFactor: "100%", unit: "tCO₂e/t", category: "airConditioning" },
    { gasNameCn: "HFC-245fa", gasNameEn: "HFC-245fa", gwpValue: 962, emissionFactor: "100%", unit: "tCO₂e/t", category: "airConditioning" },
    { gasNameCn: "CO₂灭火器", gasNameEn: "CO2_ext", gwpValue: 1, emissionFactor: "4%", unit: "tCO₂e/t", category: "fireSuppression" },
    { gasNameCn: "FM200", gasNameEn: "FM200", gwpValue: 3600, emissionFactor: "2%", unit: "tCO₂e/t", category: "fireSuppression" },
  ];

  // 间接排放因子
  const indirectData: InsertIndirectFactor[] = [
    { emissionTypeCn: "外购电力", emissionTypeEn: "electricity", emissionFactor: "0.6849", unit: "tCO₂e/MWh", remarks: "可更新" },
    { emissionTypeCn: "外购热力", emissionTypeEn: "heat", emissionFactor: "0.11", unit: "tCO₂e/GJ", remarks: "-" },
  ];

  // 插入数据
  await db.insert(fossilFuelFactors).values(fossilData);
  await db.insert(fugitiveFactors).values(fugitiveData);
  await db.insert(indirectFactors).values(indirectData);

  console.log("[Seed] Emission factors seeded successfully!");
}
