"use client";

import { useState, useCallback, useEffect } from "react";

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void, { error: string | null; isLoading: boolean }] {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 状态用于在组件中存储值
  const [storedValue, setStoredValue] = useState<T>(() => {
    // 在初始化时就从 localStorage 读取值
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      console.log(
        `📦 Loading localStorage key "${key}":`,
        item ? `${item.length} characters` : "null"
      );

      if (item === null) {
        console.log(`📦 No data found for key "${key}", using initial value`);
        return initialValue;
      }

      const parsed = JSON.parse(item);
      console.log(
        `📦 Successfully parsed localStorage key "${key}":`,
        typeof parsed,
        Array.isArray(parsed) ? `array with ${parsed.length} items` : "object"
      );
      return parsed;
    } catch (error) {
      const errorMsg = `Error reading localStorage key "${key}": ${
        error instanceof Error ? error.message : String(error)
      }`;
      console.error(errorMsg, error);
      setError(errorMsg);

      // 尝试清除损坏的数据
      try {
        window.localStorage.removeItem(key);
        console.log(`🧹 Cleared corrupted localStorage key "${key}"`);
      } catch (clearError) {
        console.error(
          `Failed to clear corrupted localStorage key "${key}":`,
          clearError
        );
      }

      return initialValue;
    }
  });

  // 在客户端加载完成后设置 loading 状态
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // 返回一个包装版的 setState 函数，同时更新 localStorage
  const setValue = useCallback(
    (value: T) => {
      try {
        setError(null); // 清除之前的错误

        // 允许值是一个函数，就像 React 的 setState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        console.log(
          `💾 Saving to localStorage key "${key}":`,
          typeof valueToStore,
          Array.isArray(valueToStore)
            ? `array with ${valueToStore.length} items`
            : "object"
        );

        // 保存到 state
        setStoredValue(valueToStore);

        // 保存到 localStorage
        if (typeof window !== "undefined") {
          const serialized = JSON.stringify(valueToStore);

          // 检查数据大小（localStorage 通常有 5-10MB 限制）
          const sizeInMB = new Blob([serialized]).size / (1024 * 1024);
          if (sizeInMB > 5) {
            console.warn(
              `⚠️ Large localStorage data for key "${key}": ${sizeInMB.toFixed(
                2
              )}MB`
            );
          }

          window.localStorage.setItem(key, serialized);
          console.log(
            `✅ Successfully saved localStorage key "${key}": ${serialized.length} characters`
          );
        }
      } catch (error) {
        const errorMsg = `Error setting localStorage key "${key}": ${
          error instanceof Error ? error.message : String(error)
        }`;
        console.error(errorMsg, error);
        setError(errorMsg);

        // 如果是存储空间不足，尝试清理
        if (error instanceof Error && error.name === "QuotaExceededError") {
          console.warn(
            `💾 localStorage quota exceeded for key "${key}", consider implementing cleanup`
          );
        }
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue, { error, isLoading }];
}
