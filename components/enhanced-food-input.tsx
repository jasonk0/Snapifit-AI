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
  status: "pending" | "confirmed" | "dismissed";
}

// 实时输入匹配类型
interface LiveInputMatch {
  foodName: string;
  startIndex: number;
  isActive: boolean;
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
  // 实时输入匹配状态
  const [liveInputMatch, setLiveInputMatch] = useState<LiveInputMatch | null>(
    null
  );

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

    // 使用正则表达式查找所有「食物」模式，但排除已经有括号的完整营养信息
    const foodMatches: PendingFoodMatch[] = [];
    // 匹配「食物」但不匹配「食物」（营养信息）的模式
    const regex = /「([^」]+)」(?!\s*（[^）]*）)/g;
    let match;

    while ((match = regex.exec(value)) !== null) {
      const foodName = match[1];
      if (foodName && foodName.trim().length > 0) {
        foodMatches.push({
          foodName: foodName.trim(),
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          status: "pending",
        });
      }
    }

    // 更新待匹配食物列表，保留已确认/已忽略的状态，但需要考虑位置变化
    setPendingMatches((prevMatches) => {
      // 创建一个基于食物名称的状态映射，而不是基于位置
      const statusMap = new Map(
        prevMatches.map((item) => [item.foodName, item.status])
      );

      return foodMatches.map((match) => {
        // 优先使用食物名称匹配状态，如果没有则默认为pending
        const previousStatus = statusMap.get(match.foodName);
        return {
          ...match,
          status: previousStatus || "pending",
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

    // 检测实时输入中的「食物」模式
    const inputPattern = detectInputPattern(newValue, newCursorPosition);
    if (inputPattern.shouldShowLibraryMatch && inputPattern.currentFood) {
      // 找到当前输入的「开始位置
      const beforeCursor = newValue.substring(0, newCursorPosition);
      const lastQuoteStart = beforeCursor.lastIndexOf("「");

      setLiveInputMatch({
        foodName: inputPattern.currentFood,
        startIndex: lastQuoteStart,
        isActive: true,
      });
    } else {
      setLiveInputMatch(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 更新光标位置
    setTimeout(() => {
      if (textareaRef.current) {
        setCursorPosition(textareaRef.current.selectionStart);
      }
    }, 0);
  };

  const handleLibrarySelect = (
    match: FoodLibraryMatch,
    pendingMatch: PendingFoodMatch
  ) => {
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

    // 计算长度变化
    const originalLength = pendingMatch.endIndex - pendingMatch.startIndex;
    const newLength = fullText.length;
    const lengthDiff = newLength - originalLength;

    onChange(newValue);

    // 更新所有匹配项的位置和状态
    setPendingMatches((prevMatches) =>
      prevMatches.map((item) => {
        if (
          item.startIndex === pendingMatch.startIndex &&
          item.endIndex === pendingMatch.endIndex
        ) {
          // 当前匹配项标记为已确认
          return { ...item, status: "confirmed" as const };
        } else if (item.startIndex > pendingMatch.endIndex) {
          // 位于当前匹配项之后的项目需要调整位置
          return {
            ...item,
            startIndex: item.startIndex + lengthDiff,
            endIndex: item.endIndex + lengthDiff,
          };
        }
        return item;
      })
    );

    onFoodLibrarySelect?.(match);
  };

  const handleLiveInputSelect = (
    match: FoodLibraryMatch,
    liveMatch: LiveInputMatch
  ) => {
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

    // 替换当前未完成的「食物输入为完整的食物信息
    const beforeMatch = value.substring(0, liveMatch.startIndex);
    const afterMatch = value.substring(cursorPosition);
    const newValue = beforeMatch + fullText + afterMatch;

    onChange(newValue);
    setLiveInputMatch(null);

    // 设置光标位置到替换文本的末尾
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = liveMatch.startIndex + fullText.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);

    onFoodLibrarySelect?.(match);
  };

  const handleLibraryAdd = (foodItem: FoodItem) => {
    onFoodLibraryAdd?.(foodItem);
  };

  const handleDismissMatch = (pendingMatch: PendingFoodMatch) => {
    // 更新匹配项状态为已忽略
    setPendingMatches((prevMatches) =>
      prevMatches.map((item) =>
        item.startIndex === pendingMatch.startIndex &&
        item.endIndex === pendingMatch.endIndex
          ? { ...item, status: "dismissed" as const }
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

      {/* 实时输入匹配 */}
      {liveInputMatch && liveInputMatch.isActive && (
        <div className="mt-2">
          <FoodLibraryMatchComponent
            key={`live-${liveInputMatch.startIndex}`}
            foodName={liveInputMatch.foodName}
            onSelect={(match) => handleLiveInputSelect(match, liveInputMatch)}
            onDismiss={() => setLiveInputMatch(null)}
            className="relative"
          />
        </div>
      )}

      {/* 渲染所有待匹配的食物项 */}
      <div className="mt-2 space-y-2">
        {pendingMatches
          .filter((match) => match.status === "pending")
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
