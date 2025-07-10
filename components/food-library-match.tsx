"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFoodLibraryContext } from '@/hooks/FoodLibraryContext';
import type { FoodLibraryMatch } from '@/lib/types';

interface FoodLibraryMatchProps {
  foodName: string;
  onSelect: (match: FoodLibraryMatch) => void;
  onDismiss: () => void;
  className?: string;
}

export function FoodLibraryMatchComponent({ 
  foodName, 
  onSelect, 
  onDismiss, 
  className 
}: FoodLibraryMatchProps) {
  const [matches, setMatches] = useState<FoodLibraryMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { matchFoodItems, incrementUsage } = useFoodLibraryContext();
  const timeoutRef = useRef<NodeJS.Timeout>();

  // 搜索匹配项
  useEffect(() => {
    if (!foodName || foodName.length < 1) {
      setMatches([]);
      setVisible(false);
      setHighlightIndex(0);
      return;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await matchFoodItems(foodName, 5);
        setMatches(results);
        setVisible(results.length > 0);
        setHighlightIndex(0);
      } catch (error) {
        setMatches([]);
        setVisible(false);
        setHighlightIndex(0);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [foodName, matchFoodItems]);

  // 键盘事件处理
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        setHighlightIndex((prev) => Math.min(prev + 1, matches.length - 1));
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        setHighlightIndex((prev) => Math.max(prev - 1, 0));
        e.preventDefault();
      } else if (e.key === 'Enter') {
        if (matches[highlightIndex]) {
          handleSelect(matches[highlightIndex]);
          e.preventDefault();
        }
      } else if (e.key === 'Escape') {
        handleDismiss();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, matches, highlightIndex]);

  const handleSelect = async (match: FoodLibraryMatch) => {
    await incrementUsage(match.foodItem.id);
    onSelect(match); // match.foodItem 包含完整营养信息
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    onDismiss();
  };

  if (!visible && !loading) {
    return null;
  }

  return (
    <Card ref={containerRef} className={cn(
      "absolute z-50 w-full mt-1 shadow-lg border-2 border-blue-200 bg-white dark:bg-gray-800",
      className
    )}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              饮食库匹配
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">搜索中...</span>
          </div>
        ) : matches.length > 0 ? (
          <div className="space-y-2">
            {matches.map((match, index) => (
              <div
                key={match.foodItem.id}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors",
                  index === highlightIndex && "bg-blue-100 dark:bg-blue-900"
                )}
                onClick={() => handleSelect(match)}
                tabIndex={0}
                onMouseEnter={() => setHighlightIndex(index)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {match.foodItem.name}
                    </span>
                    <Badge 
                      variant={
                        match.matchType === 'exact' ? 'default' :
                        match.matchType === 'partial' ? 'secondary' : 'outline'
                      }
                      className="text-xs"
                    >
                      {match.matchType === 'exact' ? '完全匹配' :
                       match.matchType === 'partial' ? '部分匹配' : '模糊匹配'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {match.foodItem.nutrition.calories}千卡/{match.foodItem.nutritionPer}{match.foodItem.nutritionUnit}
                    </span>
                    {match.foodItem.category && (
                      <Badge variant="outline" className="text-xs">
                        {match.foodItem.category}
                      </Badge>
                    )}
                    {match.foodItem.usageCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>使用{match.foodItem.usageCount}次</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 ml-2"
                >
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="w-full text-xs text-muted-foreground"
              >
                继续手动输入
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-3">
            <span className="text-sm text-muted-foreground">
              未找到匹配的食物
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
