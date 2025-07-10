"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { FoodLibraryMatchComponent } from './food-library-match';
import { FoodLibraryAddPrompt } from './food-library-add-prompt';
import { useFoodLibraryContext } from '@/hooks/FoodLibraryContext';
import { detectInputPattern } from '@/lib/food-parser';
import type { FoodLibraryMatch, FoodItem, ParseContext } from '@/lib/types';

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
  disabled
}: EnhancedFoodInputProps) {
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showLibraryMatch, setShowLibraryMatch] = useState(false);
  const [currentFood, setCurrentFood] = useState('');
  const [parseContext, setParseContext] = useState<ParseContext | null>(null);
  const [dismissedSegments, setDismissedSegments] = useState<Set<string>>(new Set());
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { parseText } = useFoodLibraryContext();

  // 检测输入模式
  useEffect(() => {
    if (!value) {
      setShowLibraryMatch(false);
      setCurrentFood('');
      setParseContext(null);
      return;
    }

    const pattern = detectInputPattern(value, cursorPosition);
    
    // 显示饮食库匹配
    if (pattern.shouldShowLibraryMatch && pattern.currentFood) {
      setCurrentFood(pattern.currentFood);
      setShowLibraryMatch(true);
    } else {
      setShowLibraryMatch(false);
      setCurrentFood('');
    }

    // 解析整个文本以检测营养信息
    parseText(value).then(context => {
      if (context) {
        setParseContext(context);
      }
    }).catch(console.error);
  }, [value, cursorPosition, parseText]);

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
    // 替换当前「食物名称」为选中的食物
    const beforeCursor = value.substring(0, cursorPosition);
    const afterCursor = value.substring(cursorPosition);
    
    const lastQuoteStart = beforeCursor.lastIndexOf('「');
    if (lastQuoteStart !== -1) {
      const newValue = 
        value.substring(0, lastQuoteStart + 1) + 
        match.foodItem.name + 
        '」' + 
        afterCursor;
      
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
    setDismissedSegments(prev => new Set([...prev, segmentKey]));
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
            .filter(segment => {
              const segmentKey = `${segment.foodName}-${segment.rawText}`;
              return segment.canAddToLibrary && !dismissedSegments.has(segmentKey);
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
