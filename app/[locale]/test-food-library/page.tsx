"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EnhancedFoodInput } from '@/components/enhanced-food-input';
import { useFoodLibrary } from '@/hooks/use-food-library';
import type { FoodLibraryMatch, FoodItem } from '@/lib/types';

export default function TestFoodLibraryPage() {
  const [inputValue, setInputValue] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const { parseText } = useFoodLibrary();

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleFoodLibrarySelect = (match: FoodLibraryMatch) => {
    addLog(`选择了饮食库项目: ${match.foodItem.name} (相似度: ${match.similarity.toFixed(2)})`);
  };

  const handleFoodLibraryAdd = (foodItem: FoodItem) => {
    addLog(`添加到饮食库: ${foodItem.name}`);
  };

  const handleParseText = async () => {
    if (!inputValue.trim()) return;
    
    const context = await parseText(inputValue);
    if (context) {
      addLog(`解析结果: 找到 ${context.quotedFoods.length} 个食物，${context.nutritionSegments.length} 个营养片段`);
      context.nutritionSegments.forEach((segment, index) => {
        addLog(`  片段${index + 1}: ${segment.foodName} - ${segment.canAddToLibrary ? '可添加' : '不可添加'}`);
      });
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">饮食库功能测试</h1>
        <p className="text-muted-foreground">
          测试增强的食物输入功能，包括饮食库匹配和智能添加提示
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 输入测试区域 */}
        <Card>
          <CardHeader>
            <CardTitle>增强食物输入测试</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                输入食物信息（尝试使用「」包裹食物名称）
              </label>
              <EnhancedFoodInput
                value={inputValue}
                onChange={setInputValue}
                onFoodLibrarySelect={handleFoodLibrarySelect}
                onFoodLibraryAdd={handleFoodLibraryAdd}
                placeholder="例如：「苹果」100g（每100g含52千卡，0.3g蛋白质，0.2g脂肪，14g碳水）"
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleParseText} disabled={!inputValue.trim()}>
                解析文本
              </Button>
              <Button variant="outline" onClick={() => setInputValue('')}>
                清空
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 日志显示区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              操作日志
              <Button variant="outline" size="sm" onClick={clearLogs}>
                清空日志
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-y-auto bg-muted/30 p-3 rounded-lg">
              {logs.length === 0 ? (
                <p className="text-muted-foreground text-sm">暂无日志</p>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="text-xs font-mono">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 测试用例 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>测试用例</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="font-medium mb-2">1. 饮食库匹配测试</h4>
              <p className="text-sm text-muted-foreground mb-2">
                输入「苹果」或「鸡胸肉」等已存在的食物名称，应该显示匹配提示
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputValue('「苹果」100g')}
              >
                测试苹果匹配
              </Button>
            </div>

            <div>
              <h4 className="font-medium mb-2">2. 智能添加测试</h4>
              <p className="text-sm text-muted-foreground mb-2">
                输入包含营养信息的完整描述，应该显示添加到饮食库的提示
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputValue('「牛排」150g（每100g含250千卡，26g蛋白质，15g脂肪，0g碳水）')}
              >
                测试牛排添加
              </Button>
            </div>

            <div>
              <h4 className="font-medium mb-2">3. 复合输入测试</h4>
              <p className="text-sm text-muted-foreground mb-2">
                输入多个食物的组合，测试解析能力
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputValue('早餐：「燕麦」50g（每100g含389千卡，16.9g蛋白质），「牛奶」200ml，「香蕉」1根')}
              >
                测试复合输入
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>饮食库匹配：</strong> 当您输入「食物名称」时，系统会自动搜索饮食库中的匹配项目</p>
            <p><strong>智能添加：</strong> 当您输入「食物名称」+（营养信息）格式时，系统会提示您将其添加到饮食库</p>
            <p><strong>实时解析：</strong> 系统会实时检测您的输入模式，提供相应的交互提示</p>
            <p><strong>键盘友好：</strong> 所有操作都支持键盘快捷键，无需鼠标操作</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
