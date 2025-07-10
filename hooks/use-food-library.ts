import { useState, useCallback } from 'react';
import React from 'react';
import type {
  FoodItem,
  FoodLibraryMatch,
  FoodLibrarySearchParams,
  ParseContext
} from '@/lib/types';
import Fuse from 'fuse.js';
import { parseTextContext } from '@/lib/food-parser';

interface ExportOptions {
  format?: 'json' | 'csv';
  category?: string;
  includeUsageStats?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

interface ImportOptions {
  skipDuplicates?: boolean;
  overwriteExisting?: boolean;
  mergeUsageCount?: boolean;
}

interface ImportResult {
  imported: number;
  skipped: number;
  updated: number;
  errors: string[];
}

interface ValidationResult {
  valid: boolean;
  totalItems: number;
  validItems: number;
  invalidItems: number;
  errors: string[];
}

interface UseFoodLibraryReturn {
  // 状态
  foodItems: FoodItem[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;

  // 搜索和匹配
  searchFoodItems: (params: FoodLibrarySearchParams) => Promise<void>;
  matchFoodItems: (foodName: string, limit?: number) => Promise<FoodLibraryMatch[]>;
  parseText: (text: string) => Promise<ParseContext | null>;

  // CRUD操作
  createFoodItem: (foodItem: Omit<FoodItem, 'id' | 'userId' | 'usageCount' | 'createdAt' | 'updatedAt'>) => Promise<FoodItem | null>;
  updateFoodItem: (id: string, updates: Partial<FoodItem>) => Promise<FoodItem | null>;
  deleteFoodItem: (id: string) => Promise<boolean>;
  incrementUsage: (foodItemId: string) => Promise<boolean>;

  // 分类相关
  getCategories: () => Promise<Array<{ name: string; count: number }>>;
  generateCategory: (foodName: string, sourceText?: string, aiConfig?: any) => Promise<string | null>;

  // 导入导出
  exportFoodItems: (options?: ExportOptions) => Promise<void>;
  importFoodItems: (data: any, options?: ImportOptions) => Promise<ImportResult | null>;
  validateImportData: (data: any) => Promise<ValidationResult | null>;

  // 工具方法
  clearError: () => void;
  reset: () => void;
}

// 获取 token 辅助函数（放在组件外部，保证稳定引用）
function getAuthHeaders(): Record<string, string> {
  const token =  localStorage.getItem('auth_token')
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export function useFoodLibrary(): UseFoodLibraryReturn {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [allFoodItems, setAllFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // 拉取所有 foodItems 的函数
  const reloadAllFoodItems = React.useCallback(() => {
    fetch('/api/db/food-library?all=true', {
      headers: { ...getAuthHeaders() }
    })
      .then(res => res.json())
      .then(data => setAllFoodItems(data.foodItems || []))
      // .catch(() => setAllFoodItems([]));
  }, []);

  // 初始化时只拉取一次
  React.useEffect(() => {
    reloadAllFoodItems();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setFoodItems([]);
    setLoading(false);
    setError(null);
    setTotal(0);
    setHasMore(false);
  }, []);

  // 搜索饮食库项目（前端本地筛选）
  const searchFoodItems = useCallback(async (params: FoodLibrarySearchParams) => {
    try {
      setLoading(true);
      setError(null);

      // 本地筛选
      let filtered = allFoodItems;
      if (params.query) {
        const queryLower = params.query.toLowerCase();
        filtered = filtered.filter(item => item.name.toLowerCase().includes(queryLower));
      }
      if (params.category) {
        filtered = filtered.filter(item => item.category === params.category);
      }
      const offset = params.offset || 0;
      const limit = params.limit || 20;
      const paged = filtered.slice(offset, offset + limit);

      if (offset === 0) {
        setFoodItems(paged);
      } else {
        setFoodItems(prev => [...prev, ...paged]);
      }
      setTotal(filtered.length);
      setHasMore(offset + limit < filtered.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索饮食库失败');
    } finally {
      setLoading(false);
    }
  }, [allFoodItems]);

  // 初始化时 allFoodItems 变化后自动触发一次搜索
  React.useEffect(() => {
    if (allFoodItems.length > 0) {
      searchFoodItems({});
    }
  }, [allFoodItems, searchFoodItems]);

  // 本地模糊匹配
  const matchFoodItems = useCallback(async (foodName: string, limit = 5): Promise<FoodLibraryMatch[]> => {
    if (!foodName) return [];
    // 用 fuse.js 做模糊匹配
    const fuse = new Fuse(allFoodItems, { keys: ['name'], threshold: 0.4 });
    const results = fuse.search(foodName, { limit }) as Array<{ item: FoodItem; score: number }>;
    return results.map(res => ({
      foodItem: res.item,
      matchType: res.score === 0 ? 'exact' : 'partial',
      similarity: typeof res.score === 'number' ? 1 - res.score : 1,
    }));
  }, [allFoodItems]);

  // 解析文本
  const parseText = useCallback(async (text: string): Promise<ParseContext | null> => {
    try {
      // 直接在前端调用本地 parseTextContext
      const context = parseTextContext(text);
      return context;
    } catch (err) {
      console.error('Parse text error:', err);
      return null;
    }
  }, []);

  // 创建饮食库项目
  const createFoodItem = useCallback(async (
    foodItem: Omit<FoodItem, 'id' | 'userId' | 'usageCount' | 'createdAt' | 'updatedAt'>
  ): Promise<FoodItem | null> => {
    try {
      const response = await fetch('/api/db/food-library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(foodItem),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '创建饮食库项目失败');
      }

      const data = await response.json();
      reloadAllFoodItems(); // 新增后刷新本地缓存
      return data.foodItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建饮食库项目失败');
      return null;
    }
  }, [reloadAllFoodItems]);

  // 更新饮食库项目
  const updateFoodItem = useCallback(async (
    id: string, 
    updates: Partial<FoodItem>
  ): Promise<FoodItem | null> => {
    try {
      const response = await fetch(`/api/db/food-library/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新饮食库项目失败');
      }

      const data = await response.json();
      reloadAllFoodItems(); // 编辑后刷新本地缓存
      return data.foodItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新饮食库项目失败');
      return null;
    }
  }, [reloadAllFoodItems]);

  // 删除饮食库项目
  const deleteFoodItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/db/food-library/${id}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        throw new Error('删除饮食库项目失败');
      }

      reloadAllFoodItems(); // 删除后刷新本地缓存
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除饮食库项目失败');
      return false;
    }
  }, [reloadAllFoodItems]);

  // 增加使用次数
  const incrementUsage = useCallback(async (foodItemId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/db/food-library/match', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ foodItemId }),
      });

      if (!response.ok) {
        throw new Error('更新使用次数失败');
      }

      // 更新本地状态
      setFoodItems(prev => 
        prev.map(item => 
          item.id === foodItemId 
            ? { ...item, usageCount: item.usageCount + 1 }
            : item
        )
      );

      return true;
    } catch (err) {
      console.error('Increment usage error:', err);
      return false;
    }
  }, []);

  // 获取分类
  const getCategories = useCallback(async (): Promise<Array<{ name: string; count: number }>> => {
    try {
      const response = await fetch('/api/db/food-library/categories', {
        headers: {
          ...getAuthHeaders(),
        },
      });
      
      if (!response.ok) {
        throw new Error('获取分类失败');
      }

      const data = await response.json();
      return data.categories;
    } catch (err) {
      console.error('Get categories error:', err);
      return [];
    }
  }, []);

  // 生成分类
  const generateCategory = useCallback(async (
    foodName: string,
    sourceText?: string,
    aiConfig?: any
  ): Promise<string | null> => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      };

      if (aiConfig) {
        headers['x-ai-config'] = JSON.stringify(aiConfig);
      }

      const response = await fetch('/api/openai/food-category', {
        method: 'POST',
        headers,
        body: JSON.stringify({ foodName, sourceText }),
      });

      if (!response.ok) {
        throw new Error('生成分类失败');
      }

      const data = await response.json();
      return data.category;
    } catch (err) {
      console.error('Generate category error:', err);
      return null;
    }
  }, []);

  // 导出饮食库数据
  const exportFoodItems = useCallback(async (options: ExportOptions = {}) => {
    try {
      const searchParams = new URLSearchParams();
      if (options.format) searchParams.set('format', options.format);
      if (options.category) searchParams.set('category', options.category);
      if (options.includeUsageStats) searchParams.set('includeUsageStats', 'true');
      if (options.dateFrom) searchParams.set('dateFrom', options.dateFrom);
      if (options.dateTo) searchParams.set('dateTo', options.dateTo);

      const response = await fetch(`/api/db/food-library/export?${searchParams}`, {
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        throw new Error('导出失败');
      }

      // 触发下载
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition?.match(/filename="([^"]+)"/)?.[1] ||
                      `food-library-${new Date().toISOString().split('T')[0]}.${options.format || 'json'}`;

      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败');
    }
  }, []);

  // 导入饮食库数据
  const importFoodItems = useCallback(async (
    data: any,
    options: ImportOptions = {}
  ): Promise<ImportResult | null> => {
    try {
      const response = await fetch('/api/db/food-library/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ foodItems: data, options }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '导入失败');
      }

      const result = await response.json();
      return result.results;
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败');
      return null;
    }
  }, []);

  // 验证导入数据
  const validateImportData = useCallback(async (data: any): Promise<ValidationResult | null> => {
    try {
      const response = await fetch('/api/db/food-library/import', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ foodItems: data }),
      });

      if (!response.ok) {
        throw new Error('验证失败');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Validate import data error:', err);
      return null;
    }
  }, []);

  return {
    // 状态
    foodItems,
    loading,
    error,
    total,
    hasMore,

    // 搜索和匹配
    searchFoodItems,
    matchFoodItems,
    parseText,

    // CRUD操作
    createFoodItem,
    updateFoodItem,
    deleteFoodItem,
    incrementUsage,

    // 分类相关
    getCategories,
    generateCategory,

    // 导入导出
    exportFoodItems,
    importFoodItems,
    validateImportData,

    // 工具方法
    clearError,
    reset,
  };
}
