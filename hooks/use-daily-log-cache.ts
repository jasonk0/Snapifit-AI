"use client";

import { useState, useCallback, useRef } from "react";
import { useServerStorage } from "./use-server-storage";
import type { DailyLog } from "@/lib/types";
import { format, parseISO, isWithinInterval } from "date-fns";

interface DailyLogCacheHook {
  getDailyLog: (date: string) => Promise<DailyLog | null>;
  getBatchDailyLogs: (
    startDate: string,
    endDate: string
  ) => Promise<DailyLog[]>;
  saveDailyLog: (date: string, data: Partial<DailyLog>) => Promise<DailyLog>;
  deleteDailyLog: (date: string) => Promise<void>;
  getAllDailyLogs: () => Promise<DailyLog[]>;
  clearCache: () => void;
  isLoading: boolean;
  error: Error | null;
}

export function useDailyLogCache(): DailyLogCacheHook {
  const { getData, saveData, deleteData, isLoading, error } =
    useServerStorage();

  // 缓存存储
  const cacheRef = useRef<Map<string, DailyLog | null>>(new Map());
  const batchCacheRef = useRef<
    Map<string, { data: DailyLog[]; timestamp: number }>
  >(new Map());
  const allLogsCache = useRef<{ data: DailyLog[]; timestamp: number } | null>(
    null
  );

  // 缓存过期时间（5分钟）
  const CACHE_EXPIRY = 5 * 60 * 1000;

  // 解析日志数据的通用函数
  const parseDailyLog = (log: any): DailyLog => ({
    ...log,
    tefAnalysis: log.tefAnalysis ? JSON.parse(log.tefAnalysis) : undefined,
    dailyStatus: log.dailyStatus ? JSON.parse(log.dailyStatus) : undefined,
    // summary现在由服务端动态计算，无需解析
    foodEntries:
      log.foodEntries?.map((entry: any) => ({
        ...entry,
        id: entry.id, // 保留数据库的唯一标识符
        log_id: entry.logId, // 使用正确的 logId 字段（日期字符串）
        food_name: entry.foodName,
        consumed_grams: entry.consumedGrams,
        meal_type: entry.mealType,
        time_period: entry.timePeriod,
        nutritional_info_per_100g: JSON.parse(entry.nutritionalInfoPer100g),
        total_nutritional_info_consumed: JSON.parse(
          entry.totalNutritionalInfoConsumed
        ),
        is_estimated: entry.isEstimated,
      })) || [],
    exerciseEntries:
      log.exerciseEntries?.map((entry: any) => ({
        ...entry,
        id: entry.id, // 保留数据库的唯一标识符
        log_id: entry.logId, // 使用正确的 logId 字段（日期字符串）
        exercise_name: entry.exerciseName,
        exercise_type: entry.exerciseType,
        duration_minutes: entry.durationMinutes,
        distance_km: entry.distanceKm,
        weight_kg: entry.weightKg,
        estimated_mets: entry.estimatedMets,
        user_weight: entry.userWeight,
        calories_burned_estimated: entry.caloriesBurnedEstimated,
        muscle_groups: entry.muscleGroups
          ? JSON.parse(entry.muscleGroups)
          : undefined,
        is_estimated: entry.isEstimated,
      })) || [],
  });

  // 检查是否有有效的批量缓存
  const getValidBatchCache = (
    startDate: string,
    endDate: string
  ): DailyLog[] | null => {
    const cacheKey = `${startDate}-${endDate}`;
    const cached = batchCacheRef.current.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      return cached.data;
    }

    return null;
  };

  // 批量获取日期范围内的日志
  const getBatchDailyLogs = useCallback(
    async (startDate: string, endDate: string): Promise<DailyLog[]> => {
      try {
        // 检查缓存
        const cachedData = getValidBatchCache(startDate, endDate);
        if (cachedData) {
          console.log(`📦 使用批量缓存数据: ${startDate} 到 ${endDate}`);
          return cachedData;
        }

        console.log(`🌐 批量获取数据: ${startDate} 到 ${endDate}`);
        const response = await getData("/api/db/daily-log/batch", {
          startDate,
          endDate,
        });

        const logs = response.dailyLogs?.map(parseDailyLog) || [];

        // 缓存批量数据
        const cacheKey = `${startDate}-${endDate}`;
        batchCacheRef.current.set(cacheKey, {
          data: logs,
          timestamp: Date.now(),
        });

        // 同时更新单个日期的缓存
        logs.forEach((log) => {
          cacheRef.current.set(log.date, log);
        });

        return logs;
      } catch (err) {
        console.error("Batch get daily logs error:", err);
        throw err;
      }
    },
    [getData]
  );

  // 获取特定日期的日志（优先使用缓存）
  const getDailyLog = useCallback(
    async (date: string): Promise<DailyLog | null> => {
      try {
        // 检查单个缓存
        if (cacheRef.current.has(date)) {
          console.log(`📦 使用缓存数据: ${date}`);
          return cacheRef.current.get(date)!;
        }

        // 检查是否在任何批量缓存范围内
        for (const [cacheKey, cached] of batchCacheRef.current.entries()) {
          if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
            const [startDate, endDate] = cacheKey.split("-");
            const targetDate = parseISO(date);
            const start = parseISO(startDate);
            const end = parseISO(endDate);

            if (isWithinInterval(targetDate, { start, end })) {
              const log = cached.data.find((l) => l.date === date);
              if (log !== undefined) {
                console.log(`📦 从批量缓存中获取数据: ${date}`);
                cacheRef.current.set(date, log);
                return log;
              }
            }
          }
        }

        console.log(`🌐 单独获取数据: ${date}`);
        const response = await getData("/api/db/daily-log", { date });

        const log = response.dailyLog ? parseDailyLog(response.dailyLog) : null;

        // 缓存结果
        cacheRef.current.set(date, log);

        return log;
      } catch (err) {
        console.error("Get daily log error:", err);
        throw err;
      }
    },
    [getData]
  );

  // 保存日志（更新缓存）
  const saveDailyLog = useCallback(
    async (date: string, data: Partial<DailyLog>): Promise<DailyLog> => {
      try {
        const response = await saveData("/api/db/daily-log", { date, ...data });
        const savedLog = parseDailyLog(response.dailyLog);

        // 更新缓存
        cacheRef.current.set(date, savedLog);

        // 清除相关的批量缓存和所有日志缓存
        allLogsCache.current = null;
        for (const [cacheKey] of batchCacheRef.current.entries()) {
          const [startDate, endDate] = cacheKey.split("-");
          const targetDate = parseISO(date);
          const start = parseISO(startDate);
          const end = parseISO(endDate);

          if (isWithinInterval(targetDate, { start, end })) {
            batchCacheRef.current.delete(cacheKey);
          }
        }

        return savedLog;
      } catch (err) {
        console.error("Save daily log error:", err);
        throw err;
      }
    },
    [saveData]
  );

  // 删除日志（清除缓存）
  const deleteDailyLog = useCallback(
    async (date: string): Promise<void> => {
      try {
        await deleteData("/api/db/daily-log", { date });

        // 清除缓存
        cacheRef.current.delete(date);

        // 清除相关的批量缓存和所有日志缓存
        allLogsCache.current = null;
        for (const [cacheKey] of batchCacheRef.current.entries()) {
          const [startDate, endDate] = cacheKey.split("-");
          const targetDate = parseISO(date);
          const start = parseISO(startDate);
          const end = parseISO(endDate);

          if (isWithinInterval(targetDate, { start, end })) {
            batchCacheRef.current.delete(cacheKey);
          }
        }
      } catch (err) {
        console.error("Delete daily log error:", err);
        throw err;
      }
    },
    [deleteData]
  );

  // 获取所有日志（带缓存）
  const getAllDailyLogs = useCallback(async (): Promise<DailyLog[]> => {
    try {
      // 检查缓存
      if (
        allLogsCache.current &&
        Date.now() - allLogsCache.current.timestamp < CACHE_EXPIRY
      ) {
        console.log("📦 使用所有日志缓存数据");
        return allLogsCache.current.data;
      }

      console.log("🌐 获取所有日志", {
        stack: new Error().stack?.split("\n").slice(1, 4).join("\n"),
      });
      const response = await getData("/api/db/daily-log");
      const logs = response.dailyLogs?.map(parseDailyLog) || [];

      // 缓存结果
      allLogsCache.current = {
        data: logs,
        timestamp: Date.now(),
      };

      // 同时更新单个日期的缓存
      logs.forEach((log: DailyLog) => {
        cacheRef.current.set(log.date, log);
      });

      return logs;
    } catch (err) {
      console.error("Get all daily logs error:", err);
      throw err;
    }
  }, [getData]);

  // 清除缓存
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    batchCacheRef.current.clear();
    allLogsCache.current = null;
    console.log("🗑️ 缓存已清除");
  }, []);

  return {
    getDailyLog,
    getBatchDailyLogs,
    saveDailyLog,
    deleteDailyLog,
    getAllDailyLogs,
    clearCache,
    isLoading,
    error,
  };
}
