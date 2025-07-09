"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, X, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFoodLibrary } from '@/hooks/use-food-library';
import type { NutritionSegment, FoodItem } from '@/lib/types';

interface FoodLibraryAddPromptProps {
  segment: NutritionSegment;
  onAdd: (foodItem: FoodItem) => void;
  onDismiss: () => void;
  className?: string;
}

export function FoodLibraryAddPrompt({ 
  segment, 
  onAdd, 
  onDismiss, 
  className 
}: FoodLibraryAddPromptProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: segment.foodName,
    category: '',
    nutritionPer: segment.parsedNutrition?.nutritionPer || 100,
    nutritionUnit: segment.parsedNutrition?.nutritionUnit || 'g',
    nutrition: segment.parsedNutrition?.nutrition || {},
    sourceText: segment.rawText
  });

  const { createFoodItem, generateCategory } = useFoodLibrary();

  const handleOpenDialog = async () => {
    setIsDialogOpen(true);
    
    // 自动生成分类
    if (!formData.category) {
      try {
        const category = await generateCategory(segment.foodName, segment.rawText);
        if (category) {
          setFormData(prev => ({ ...prev, category }));
        }
      } catch (error) {
        console.error('Generate category error:', error);
      }
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const foodItem = await createFoodItem({
        name: formData.name,
        category: formData.category || undefined,
        nutritionPer: formData.nutritionPer,
        nutritionUnit: formData.nutritionUnit,
        nutrition: formData.nutrition,
        sourceText: formData.sourceText
      });

      if (foodItem) {
        onAdd(foodItem);
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error('Create food item error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNutritionChange = (key: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      nutrition: { ...prev.nutrition, [key]: numValue }
    }));
  };

  if (!segment.canAddToLibrary) {
    return null;
  }

  return (
    <>
      {/* 提示按钮 */}
      <Card className={cn(
        "inline-block ml-2 border-2 border-green-200 bg-green-50 dark:bg-green-900/20",
        className
      )}>
        <CardContent className="p-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              📝 可添加到饮食库
            </span>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenDialog}
                  className="h-6 px-2 text-green-700 hover:text-green-800 hover:bg-green-100"
                >
                  <PlusCircle className="h-3 w-3 mr-1" />
                  添加
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>添加到饮食库</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* 食物名称 */}
                  <div>
                    <Label htmlFor="name">食物名称</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="输入食物名称"
                    />
                  </div>

                  {/* 分类 */}
                  <div>
                    <Label htmlFor="category">分类</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      placeholder="如：主食类、蛋白质类等"
                    />
                  </div>

                  {/* 营养成分基准 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="nutritionPer">营养成分基准</Label>
                      <Input
                        id="nutritionPer"
                        type="number"
                        value={formData.nutritionPer}
                        onChange={(e) => handleInputChange('nutritionPer', parseFloat(e.target.value) || 100)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="nutritionUnit">单位</Label>
                      <Input
                        id="nutritionUnit"
                        value={formData.nutritionUnit}
                        onChange={(e) => handleInputChange('nutritionUnit', e.target.value)}
                        placeholder="g, ml, 份等"
                      />
                    </div>
                  </div>

                  {/* 营养成分 */}
                  <div>
                    <Label>营养成分 (每{formData.nutritionPer}{formData.nutritionUnit})</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.entries(formData.nutrition).map(([key, value]) => (
                        <div key={key}>
                          <Label htmlFor={key} className="text-xs">
                            {key === 'calories' ? '卡路里' :
                             key === 'protein' ? '蛋白质(g)' :
                             key === 'fat' ? '脂肪(g)' :
                             key === 'carbs' ? '碳水(g)' :
                             key === 'fiber' ? '纤维(g)' :
                             key === 'sugar' ? '糖(g)' :
                             key === 'sodium' ? '钠(mg)' : key}
                          </Label>
                          <Input
                            id={key}
                            type="number"
                            step="0.1"
                            value={value || ''}
                            onChange={(e) => handleNutritionChange(key, e.target.value)}
                            className="text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 原始文本 */}
                  <div>
                    <Label htmlFor="sourceText">原始文本</Label>
                    <Input
                      id="sourceText"
                      value={formData.sourceText}
                      onChange={(e) => handleInputChange('sourceText', e.target.value)}
                      placeholder="原始输入文本"
                      className="text-xs"
                    />
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={loading}
                    >
                      取消
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={loading || !formData.name}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          添加中...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          添加到饮食库
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0 ml-1"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
