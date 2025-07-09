"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Download, 
  Upload, 
  Filter,
  MoreVertical,
  Clock,
  Utensils
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFoodLibrary } from '@/hooks/use-food-library';
import { useToast } from '@/hooks/use-toast';
import type { FoodItem } from '@/lib/types';

export default function FoodLibraryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('__all__');
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<any>(null);
  const [importValidation, setImportValidation] = useState<any>(null);
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    nutritionPer: 100,
    nutritionUnit: 'g',
    nutrition: {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0
    },
    sourceText: ''
  });

  const {
    foodItems,
    loading,
    error,
    total,
    hasMore,
    searchFoodItems,
    createFoodItem,
    updateFoodItem,
    deleteFoodItem,
    getCategories,
    exportFoodItems,
    importFoodItems,
    validateImportData,
    clearError
  } = useFoodLibrary();

  const { toast } = useToast();

  // 初始化加载
  useEffect(() => {
    loadFoodItems();
    loadCategories();
  }, []);

  // 搜索和筛选
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadFoodItems();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory]);

  const loadFoodItems = async () => {
    await searchFoodItems({
      query: searchQuery,
      category: selectedCategory === '__all__' ? '' : selectedCategory,
      limit: 20,
      offset: 0
    });
  };

  const loadCategories = async () => {
    const cats = await getCategories();
    setCategories(cats);
  };

  const handleCreateItem = async () => {
    const item = await createFoodItem(newItem);
    if (item) {
      toast({
        title: "添加成功",
        description: `已将"${item.name}"添加到饮食库`
      });
      setIsAddDialogOpen(false);
      resetNewItem();
      loadFoodItems();
      loadCategories();
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    
    const updated = await updateFoodItem(editingItem.id, editingItem);
    if (updated) {
      toast({
        title: "更新成功",
        description: `已更新"${updated.name}"`
      });
      setEditingItem(null);
      loadCategories();
    }
  };

  const handleDeleteItem = async (item: FoodItem) => {
    const success = await deleteFoodItem(item.id);
    if (success) {
      toast({
        title: "删除成功",
        description: `已删除"${item.name}"`
      });
      loadCategories();
    }
  };

  const resetNewItem = () => {
    setNewItem({
      name: '',
      category: '',
      nutritionPer: 100,
      nutritionUnit: 'g',
      nutrition: {
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0
      },
      sourceText: ''
    });
  };

  const handleExport = async () => {
    await exportFoodItems({
      format: 'json',
      includeUsageStats: true
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);

    try {
      const text = await file.text();
      let data;

      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        data = parsed.foodItems || parsed; // 支持完整导出格式或简单数组格式
      } else {
        throw new Error('仅支持JSON格式文件');
      }

      setImportData(data);

      // 验证数据
      const validation = await validateImportData(data);
      setImportValidation(validation);
    } catch (error) {
      toast({
        title: "文件解析失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      });
    }
  };

  const handleImport = async () => {
    if (!importData) return;

    const result = await importFoodItems(importData, {
      skipDuplicates: true,
      overwriteExisting: false,
      mergeUsageCount: true
    });

    if (result) {
      toast({
        title: "导入完成",
        description: `成功导入 ${result.imported} 项，跳过 ${result.skipped} 项，更新 ${result.updated} 项`
      });

      setIsImportDialogOpen(false);
      setImportFile(null);
      setImportData(null);
      setImportValidation(null);
      loadFoodItems();
      loadCategories();
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">饮食库管理</h1>
          <p className="text-muted-foreground mt-1">
            管理您的个人食物数据库，共 {total} 项食物
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={foodItems.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            导出
          </Button>

          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                导入
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>导入饮食库数据</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="import-file">选择JSON文件</Label>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="mt-1"
                  />
                </div>

                {importValidation && (
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      {importValidation.valid ? (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      ) : (
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      )}
                      <span className="font-medium">
                        {importValidation.valid ? '数据验证通过' : '数据验证失败'}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>总计: {importValidation.totalItems} 项</p>
                      <p>有效: {importValidation.validItems} 项</p>
                      {importValidation.invalidItems > 0 && (
                        <p className="text-red-600">无效: {importValidation.invalidItems} 项</p>
                      )}
                    </div>
                    {importValidation.errors.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        <p className="text-xs font-medium text-red-600 mb-1">错误详情:</p>
                        {importValidation.errors.slice(0, 5).map((error: string, index: number) => (
                          <p key={index} className="text-xs text-red-600">{error}</p>
                        ))}
                        {importValidation.errors.length > 5 && (
                          <p className="text-xs text-muted-foreground">
                            还有 {importValidation.errors.length - 5} 个错误...
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                    取消
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={!importData || !importValidation?.valid || loading}
                  >
                    {loading ? '导入中...' : '确认导入'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                添加食物
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>添加新食物</DialogTitle>
              </DialogHeader>
              <FoodItemForm
                item={newItem}
                onChange={setNewItem}
                onSubmit={handleCreateItem}
                onCancel={() => setIsAddDialogOpen(false)}
                loading={loading}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索食物名称..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部分类</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.name} value={cat.name}>
                    {cat.name} ({cat.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 食物列表 */}
      {loading && foodItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      ) : foodItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Utensils className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">暂无食物数据</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedCategory ? '没有找到匹配的食物' : '开始添加您的第一个食物吧'}
            </p>
            {!searchQuery && !selectedCategory && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                添加食物
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {foodItems.map(item => (
            <FoodItemCard
              key={item.id}
              item={item}
              onEdit={setEditingItem}
              onDelete={handleDeleteItem}
            />
          ))}
        </div>
      )}

      {/* 编辑对话框 */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑食物</DialogTitle>
            </DialogHeader>
            <FoodItemForm
              item={editingItem}
              onChange={setEditingItem}
              onSubmit={handleUpdateItem}
              onCancel={() => setEditingItem(null)}
              loading={loading}
            />
          </DialogContent>
        </Dialog>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg">
          <p>{error}</p>
          <Button variant="ghost" size="sm" onClick={clearError} className="mt-2">
            关闭
          </Button>
        </div>
      )}
    </div>
  );
}

// 食物项卡片组件
function FoodItemCard({ 
  item, 
  onEdit, 
  onDelete 
}: { 
  item: FoodItem; 
  onEdit: (item: FoodItem) => void; 
  onDelete: (item: FoodItem) => void; 
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{item.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {item.category && (
                <Badge variant="secondary" className="text-xs">
                  {item.category}
                </Badge>
              )}
              {item.usageCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>使用{item.usageCount}次</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
              <Edit2 className="h-3 w-3" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要删除"{item.name}"吗？此操作无法撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(item)}>
                    删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">{item.nutrition.calories}</span>
            <span className="text-muted-foreground"> 千卡/{item.nutritionPer}{item.nutritionUnit}</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">蛋白质</span>
              <div className="font-medium">{item.nutrition.protein}g</div>
            </div>
            <div>
              <span className="text-muted-foreground">脂肪</span>
              <div className="font-medium">{item.nutrition.fat}g</div>
            </div>
            <div>
              <span className="text-muted-foreground">碳水</span>
              <div className="font-medium">{item.nutrition.carbs}g</div>
            </div>
          </div>
          
          {item.sourceText && (
            <div className="text-xs text-muted-foreground truncate" title={item.sourceText}>
              来源：{item.sourceText}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 食物项表单组件
function FoodItemForm({ 
  item, 
  onChange, 
  onSubmit, 
  onCancel, 
  loading 
}: { 
  item: any; 
  onChange: (item: any) => void; 
  onSubmit: () => void; 
  onCancel: () => void; 
  loading: boolean; 
}) {
  const handleInputChange = (field: string, value: any) => {
    onChange({ ...item, [field]: value });
  };

  const handleNutritionChange = (key: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    onChange({
      ...item,
      nutrition: { ...item.nutrition, [key]: numValue }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">食物名称 *</Label>
        <Input
          id="name"
          value={item.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="输入食物名称"
        />
      </div>

      <div>
        <Label htmlFor="category">分类</Label>
        <Input
          id="category"
          value={item.category}
          onChange={(e) => handleInputChange('category', e.target.value)}
          placeholder="如：主食类、蛋白质类等"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="nutritionPer">营养成分基准</Label>
          <Input
            id="nutritionPer"
            type="number"
            value={item.nutritionPer}
            onChange={(e) => handleInputChange('nutritionPer', parseFloat(e.target.value) || 100)}
          />
        </div>
        <div>
          <Label htmlFor="nutritionUnit">单位</Label>
          <Input
            id="nutritionUnit"
            value={item.nutritionUnit}
            onChange={(e) => handleInputChange('nutritionUnit', e.target.value)}
            placeholder="g, ml, 份等"
          />
        </div>
      </div>

      <div>
        <Label>营养成分 (每{item.nutritionPer}{item.nutritionUnit})</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <Label htmlFor="calories" className="text-xs">卡路里 *</Label>
            <Input
              id="calories"
              type="number"
              step="0.1"
              value={item.nutrition.calories || ''}
              onChange={(e) => handleNutritionChange('calories', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="protein" className="text-xs">蛋白质(g)</Label>
            <Input
              id="protein"
              type="number"
              step="0.1"
              value={item.nutrition.protein || ''}
              onChange={(e) => handleNutritionChange('protein', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fat" className="text-xs">脂肪(g)</Label>
            <Input
              id="fat"
              type="number"
              step="0.1"
              value={item.nutrition.fat || ''}
              onChange={(e) => handleNutritionChange('fat', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="carbs" className="text-xs">碳水(g)</Label>
            <Input
              id="carbs"
              type="number"
              step="0.1"
              value={item.nutrition.carbs || ''}
              onChange={(e) => handleNutritionChange('carbs', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="sourceText">原始文本</Label>
        <Input
          id="sourceText"
          value={item.sourceText}
          onChange={(e) => handleInputChange('sourceText', e.target.value)}
          placeholder="原始输入文本"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          取消
        </Button>
        <Button
          onClick={onSubmit}
          disabled={loading || !item.name || !item.nutrition.calories}
        >
          {loading ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  );
}
