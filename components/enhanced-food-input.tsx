"use client";

import React, { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FoodLibraryMatchComponent } from "./food-library-match";
import { FoodLibraryAddPrompt } from "./food-library-add-prompt";
import { useFoodLibraryContext } from "@/hooks/FoodLibraryContext";
import { detectInputPattern } from "@/lib/food-parser";
import type { FoodLibraryMatch, FoodItem, ParseContext } from "@/lib/types";

interface EnhancedFoodInputProps {
  value: string;
  onChange: (value: string) => void;
  onFoodLibrarySelect?: (match: FoodLibraryMatch) => void;
  onFoodLibraryAdd?: (foodItem: FoodItem) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// 待匹配的食物项类型
interface PendingFoodMatch {
  foodName: string;
  startIndex: number;
  endIndex: number;
  status: 'pending' | 'confirmed' | 'dismissed';
}

export function EnhancedFoodInput({
  value,
  onChange,
  onFoodLibrarySelect,
  onFoodLibraryAdd,
  placeholder = "输入饮食记录...",
  className,
  disabled,
}: EnhancedFoodInputProps) {
  const [cursorPosition, setCursorPosition] = useState(0);
  const [parseContext, setParseContext] = useState<ParseContext | null>(null);
  const [dismissedSegments, setDismissedSegments] = useState<Set<string>>(
    new Set()
  );
  const [justSelected, setJustSelected] = useState(false);
  const isSelectingRef = useRef(false);
  
  // 新增：跟踪所有待匹配的食物项
  const [pendingMatches, setPendingMatches] = useState<PendingFoodMatch[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { parseText } = useFoodLibraryContext();

  // 检测文本中所有的食物匹配项
  useEffect(() => {
    if (!value) {
      setPendingMatches([]);
      setParseContext(null);
      setJustSelected(false);
      return;
    }

    // 如果正在处理选择操作，跳过这次检测
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }

    // 使用正则表达式查找所有「食物」模式
    const foodMatches: PendingFoodMatch[] = [];
    const regex = /「([^」]+)」/g;
    let match;
    
    while ((match = regex.exec(value)) !== null) {
      const foodName = match[1];
      if (foodName && foodName.trim().length > 0) {
        foodMatches.push({
          foodName: foodName.trim(),
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          status: 'pending'
        });
      }
    }

    // 更新待匹配食物列表，保留已确认/已忽略的状态
    setPendingMatches(prevMatches => {
      // 保留之前已确认或已忽略的匹配项状态
      const statusMap = new Map(
        prevMatches.map(item => [`${item.startIndex}-${item.endIndex}-${item.foodName}`, item.status])
      );
      
      return foodMatches.map(match => {
        const key = `${match.startIndex}-${match.endIndex}-${match.foodName}`;
        const previousStatus = statusMap.get(key);
        return {
          ...match,
          status: previousStatus || 'pending'
        };
      });
    });

    // 解析整个文本以检测营养信息
    parseText(value)
      .then((context) => {
        if (context) {
          setParseContext(context);
        }
      })
      .catch(console.error);
  }, [value, parseText, justSelected]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newCursorPosition = e.target.selectionStart;

    onChange(newValue);
    setCursorPosition(newCursorPosition);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 更新光标位置
    setTimeout(() => {
      if (textareaRef.current) {
        setCursorPosition(textareaRef.current.selectionStart);
      }
    }, 0);
  };

  const handleLibrarySelect = (match: FoodLibraryMatch, pendingMatch: PendingFoodMatch) => {
    // 设置标志，防止重新触发匹配
    isSelectingRef.current = true;
    setJustSelected(true);

    // 生成完整的食物信息文本格式
    const foodItem = match.foodItem;
    const nutrition = foodItem.nutrition;

    // 构建营养信息文本
    const nutritionParts = [];
    if (nutrition.calories) nutritionParts.push(`${nutrition.calories}千卡`);
    if (nutrition.protein) nutritionParts.push(`蛋白质${nutrition.protein}g`);
    if (nutrition.fat) nutritionParts.push(`脂肪${nutrition.fat}g`);
    if (nutrition.carbs) nutritionParts.push(`碳水${nutrition.carbs}g`);
    if (nutrition.fiber) nutritionParts.push(`纤维${nutrition.fiber}g`);
    if (nutrition.sugar) nutritionParts.push(`糖${nutrition.sugar}g`);
    if (nutrition.sodium) nutritionParts.push(`钠${nutrition.sodium}mg`);

    const nutritionText = nutritionParts.join("，");
    const fullText = `「${foodItem.name}」（每${foodItem.nutritionPer}${foodItem.nutritionUnit}：${nutritionText}）`;

    // 替换当前「食物名称」为完整的食物信息
    const beforeMatch = value.substring(0, pendingMatch.startIndex);
    const afterMatch = value.substring(pendingMatch.endIndex);
    const newValue = beforeMatch + fullText + afterMatch;

    onChange(newValue);

    // 更新匹配项状态为已确认
    setPendingMatches(prevMatches => 
      prevMatches.map(item => 
        (item.startIndex === pendingMatch.startIndex && item.endIndex === pendingMatch.endIndex) 
          ? { ...item, status: 'confirmed' as const } 
          : item
      )
    );

    onFoodLibrarySelect?.(match);
  };

  const handleLibraryAdd = (foodItem: FoodItem) => {
    onFoodLibraryAdd?.(foodItem);
  };

  const handleDismissMatch = (pendingMatch: PendingFoodMatch) => {
    // 更新匹配项状态为已忽略
    setPendingMatches(prevMatches => 
      prevMatches.map(item => 
        (item.startIndex === pendingMatch.startIndex && item.endIndex === pendingMatch.endIndex) 
          ? { ...item, status: 'dismissed' as const } 
          : item
      )
    );
  };

  const handleDismissAddPrompt = (segmentKey: string) => {
    setDismissedSegments((prev) => new Set([...prev, segmentKey]));
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("min-h-[120px]", className)}
        disabled={disabled}
      />

      {/* 渲染所有待匹配的食物项 */}
      <div className="mt-2 space-y-2">
        {pendingMatches
          .filter(match => match.status === 'pending')
          .map((pendingMatch, index) => (
            <FoodLibraryMatchComponent
              key={`${pendingMatch.startIndex}-${pendingMatch.endIndex}`}
              foodName={pendingMatch.foodName}
              onSelect={(match) => handleLibrarySelect(match, pendingMatch)}
              onDismiss={() => handleDismissMatch(pendingMatch)}
              className="relative"
            />
          ))}
      </div>

      {/* 智能添加提示 */}
      {parseContext?.hasNutritionData && (
        <div className="mt-2 space-y-2">
          {parseContext.nutritionSegments
            .filter((segment) => {
              const segmentKey = `${segment.foodName}-${segment.rawText}`;
              return (
                segment.canAddToLibrary && !dismissedSegments.has(segmentKey)
              );
            })
            .map((segment, index) => {
              const segmentKey = `${segment.foodName}-${segment.rawText}`;
              return (
                <FoodLibraryAddPrompt
                  key={segmentKey}
                  segment={segment}
                  onAdd={handleLibraryAdd}
                  onDismiss={() => handleDismissAddPrompt(segmentKey)}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}
