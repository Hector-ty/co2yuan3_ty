import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getAllFossilFuelFactors,
  getFossilFuelFactorById,
  createFossilFuelFactor,
  updateFossilFuelFactor,
  deleteFossilFuelFactor,
  getAllFugitiveFactors,
  getFugitiveFactorById,
  createFugitiveFactor,
  updateFugitiveFactor,
  deleteFugitiveFactor,
  getAllIndirectFactors,
  getIndirectFactorById,
  createIndirectFactor,
  updateIndirectFactor,
  deleteIndirectFactor,
  seedEmissionFactors,
} from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // 排放因子路由
  emissionFactors: router({
    // 获取所有排放因子
    getAll: publicProcedure.query(async () => {
      const [fossilFuels, fugitiveEmissions, indirectEmissions] = await Promise.all([
        getAllFossilFuelFactors(),
        getAllFugitiveFactors(),
        getAllIndirectFactors(),
      ]);

      // 分类逸散排放因子
      const airConditioning = fugitiveEmissions.filter(f => f.category === "airConditioning");
      const fireSuppression = fugitiveEmissions.filter(f => f.category === "fireSuppression");

      return {
        directEmissions: {
          fossilFuels,
          fugitiveEmissions: {
            airConditioning,
            fireSuppression,
          },
        },
        indirectEmissions,
      };
    }),

    // 初始化种子数据
    seed: protectedProcedure.mutation(async () => {
      await seedEmissionFactors();
      return { success: true };
    }),
  }),

  // 化石燃料排放因子路由
  fossilFuel: router({
    list: publicProcedure.query(async () => {
      return await getAllFossilFuelFactors();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getFossilFuelFactorById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        fuelTypeCn: z.string().min(1),
        fuelTypeEn: z.string().min(1),
        emissionFactor: z.string().min(1),
        unit: z.string().min(1),
        gwp: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await createFossilFuelFactor({
          fuelTypeCn: input.fuelTypeCn,
          fuelTypeEn: input.fuelTypeEn,
          emissionFactor: input.emissionFactor,
          unit: input.unit,
          gwp: input.gwp || "-",
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        fuelTypeCn: z.string().optional(),
        fuelTypeEn: z.string().optional(),
        emissionFactor: z.string().optional(),
        unit: z.string().optional(),
        gwp: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateFossilFuelFactor(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteFossilFuelFactor(input.id);
        return { success: true };
      }),
  }),

  // 逸散排放因子路由
  fugitive: router({
    list: publicProcedure.query(async () => {
      const all = await getAllFugitiveFactors();
      return {
        airConditioning: all.filter(f => f.category === "airConditioning"),
        fireSuppression: all.filter(f => f.category === "fireSuppression"),
      };
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getFugitiveFactorById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        gasNameCn: z.string().min(1),
        gasNameEn: z.string().min(1),
        gwpValue: z.number(),
        emissionFactor: z.string().min(1),
        unit: z.string().min(1),
        category: z.enum(["airConditioning", "fireSuppression"]),
      }))
      .mutation(async ({ input }) => {
        await createFugitiveFactor(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        gasNameCn: z.string().optional(),
        gasNameEn: z.string().optional(),
        gwpValue: z.number().optional(),
        emissionFactor: z.string().optional(),
        unit: z.string().optional(),
        category: z.enum(["airConditioning", "fireSuppression"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateFugitiveFactor(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteFugitiveFactor(input.id);
        return { success: true };
      }),
  }),

  // 间接排放因子路由
  indirect: router({
    list: publicProcedure.query(async () => {
      return await getAllIndirectFactors();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getIndirectFactorById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        emissionTypeCn: z.string().min(1),
        emissionTypeEn: z.string().min(1),
        emissionFactor: z.string().min(1),
        unit: z.string().min(1),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await createIndirectFactor({
          emissionTypeCn: input.emissionTypeCn,
          emissionTypeEn: input.emissionTypeEn,
          emissionFactor: input.emissionFactor,
          unit: input.unit,
          remarks: input.remarks || "-",
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        emissionTypeCn: z.string().optional(),
        emissionTypeEn: z.string().optional(),
        emissionFactor: z.string().optional(),
        unit: z.string().optional(),
        remarks: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateIndirectFactor(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteIndirectFactor(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
