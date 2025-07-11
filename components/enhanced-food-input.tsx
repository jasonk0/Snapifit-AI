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
  const [showLibraryMatch, setShowLibraryMatch] = useState(false);
  const [currentFood, setCurrentFood] = useState("");
  const [parseContext, setParseContext] = useState<ParseContext | null>(null);
  const [dismissedSegments, setDismissedSegments] = useState<Set<string>>(
    new Set()
  );
  const [justSelected, setJustSelected] = useState(false); // 新增：标记刚刚选择了匹配项
  const isSelectingRef = useRef(false); // 用于跟踪是否正在处理选择操作

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { parseText } = useFoodLibraryContext();

  // 检测输入模式
  useEffect(() => {
    if (!value) {
      setShowLibraryMatch(false);
      setCurrentFood("");
      setParseContext(null);
      setJustSelected(false);
      return;
    }

    // 如果正在处理选择操作，跳过这次检测
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }

    const pattern = detectInputPattern(value, cursorPosition);

    // 显示饮食库匹配
    if (pattern.shouldShowLibraryMatch && pattern.currentFood) {
      setCurrentFood(pattern.currentFood);
      setShowLibraryMatch(true);
    } else {
      setShowLibraryMatch(false);
      setCurrentFood("");
    }

    // 解析整个文本以检测营养信息
    parseText(value)
      .then((context) => {
        if (context) {
          setParseContext(context);
        }
      })
      .catch(console.error);
  }, [value, cursorPosition, parseText, justSelected]);

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

  const handleLibrarySelect = (match: FoodLibraryMatch) => {
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
    const beforeCursor = value.substring(0, cursorPosition);
    const afterCursor = value.substring(cursorPosition);

    const lastQuoteStart = beforeCursor.lastIndexOf("「");
    if (lastQuoteStart !== -1) {
      const newValue =
        value.substring(0, lastQuoteStart) + fullText + afterCursor;

      onChange(newValue);
    }

    setShowLibraryMatch(false);
    onFoodLibrarySelect?.(match);
  };

  const handleLibraryAdd = (foodItem: FoodItem) => {
    onFoodLibraryAdd?.(foodItem);
  };

  const handleDismissMatch = () => {
    setShowLibraryMatch(false);
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

      {/* 饮食库匹配提示 */}
      {showLibraryMatch && currentFood && (
        <FoodLibraryMatchComponent
          foodName={currentFood}
          onSelect={handleLibrarySelect}
          onDismiss={handleDismissMatch}
          className="top-full left-0 right-0"
        />
      )}

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
