import { useState, useCallback } from 'react';
import type {
  FoodItem,
  FoodLibraryMatch,
  FoodLibrarySearchParams,
  ParseContext
} from '@/lib/types';

// 获取认证头
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

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

export function useFoodLibrary(): UseFoodLibraryReturn {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

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

  // 搜索饮食库项目
  const searchFoodItems = useCallback(async (params: FoodLibrarySearchParams) => {
    try {
      setLoading(true);
      setError(null);

      const searchParams = new URLSearchParams();
      if (params.query) searchParams.set('query', params.query);
      if (params.category) searchParams.set('category', params.category);
      if (params.limit) searchParams.set('limit', params.limit.toString());
      if (params.offset) searchParams.set('offset', params.offset.toString());

      const response = await fetch(`/api/db/food-library?${searchParams}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('搜索饮食库失败');
      }

      const data = await response.json();
      
      if (params.offset === 0) {
        setFoodItems(data.foodItems);
      } else {
        setFoodItems(prev => [...prev, ...data.foodItems]);
      }
      
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索饮食库失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 匹配饮食库项目
  const matchFoodItems = useCallback(async (foodName: string, limit = 5): Promise<FoodLibraryMatch[]> => {
    try {
      const response = await fetch('/api/db/food-library/match', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ foodName, limit }),
      });

      if (!response.ok) {
        throw new Error('匹配饮食库失败');
      }

      const data = await response.json();
      return data.matches;
    } catch (err) {
      console.error('Match food items error:', err);
      return [];
    }
  }, []);

  // 解析文本
  const parseText = useCallback(async (text: string): Promise<ParseContext | null> => {
    try {
      const response = await fetch('/api/db/food-library/parse', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('解析文本失败');
      }

      const data = await response.json();
      return data.context;
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
        headers: getAuthHeaders(),
        body: JSON.stringify(foodItem),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '创建饮食库项目失败');
      }

      const data = await response.json();
      return data.foodItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建饮食库项目失败');
      return null;
    }
  }, []);

  // 更新饮食库项目
  const updateFoodItem = useCallback(async (
    id: string, 
    updates: Partial<FoodItem>
  ): Promise<FoodItem | null> => {
    try {
      const response = await fetch('/api/db/food-library', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, ...updates }),
      });

      if (!response.ok) {
        throw new Error('更新饮食库项目失败');
      }

      const data = await response.json();
      
      // 更新本地状态
      setFoodItems(prev => 
        prev.map(item => item.id === id ? data.foodItem : item)
      );

      return data.foodItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新饮食库项目失败');
      return null;
    }
  }, []);

  // 删除饮食库项目
  const deleteFoodItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/db/food-library?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('删除饮食库项目失败');
      }

      // 更新本地状态
      setFoodItems(prev => prev.filter(item => item.id !== id));
      setTotal(prev => prev - 1);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除饮食库项目失败');
      return false;
    }
  }, []);

  // 增加使用次数
  const incrementUsage = useCallback(async (foodItemId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/db/food-library/match', {
        method: 'PATCH',
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders()
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
      const headers: Record<string, string> = getAuthHeaders();

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

      const response = await fetch(`/api/db/food-library/export?${searchParams}`);

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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
