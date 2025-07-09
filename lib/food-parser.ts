import type { ParseContext, NutritionSegment, ParsedNutrition } from './types';

// 营养成分关键词映射
const NUTRITION_KEYWORDS = {
  calories: ['卡路里', '千卡', 'kcal', '大卡', '卡', '千焦', 'kj'],
  protein: ['蛋白质', '蛋白', 'protein'],
  fat: ['脂肪', '脂', 'fat'],
  carbs: ['碳水化合物', '碳水', '糖类', 'carb', 'carbohydrate'],
  fiber: ['纤维', '膳食纤维', 'fiber'],
  sugar: ['糖', 'sugar'],
  sodium: ['钠', 'sodium', '盐']
};

// 单位映射
const UNIT_MAPPING = {
  'g': 'g',
  '克': 'g',
  'ml': 'ml',
  '毫升': 'ml',
  '份': '份',
  '个': '个',
  '只': '只',
  '片': '片',
  '块': '块'
};

/**
 * 检测文本中的「」包裹的食物名称
 */
export function extractQuotedFoods(text: string): string[] {
  const regex = /「([^」]+)」/g;
  const matches = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  
  return matches;
}

/**
 * 检测文本中的（）包裹的营养信息
 */
export function extractNutritionSegments(text: string): NutritionSegment[] {
  const segments: NutritionSegment[] = [];
  
  // 匹配「食物名称」...（营养信息）的模式
  const regex = /「([^」]+)」[^（]*（([^）]+)）/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const foodName = match[1];
    const rawText = match[2];
    const parsedNutrition = parseNutritionText(rawText);
    
    segments.push({
      foodName,
      rawText,
      parsedNutrition,
      canAddToLibrary: !!parsedNutrition && hasValidNutritionData(parsedNutrition)
    });
  }
  
  return segments;
}

/**
 * 解析营养成分文本
 */
export function parseNutritionText(text: string): ParsedNutrition | undefined {
  try {
    const nutrition: Record<string, number> = {};
    let nutritionPer = 100; // 默认每100g
    let nutritionUnit = 'g'; // 默认单位
    
    // 提取基准量和单位（如"每100g"、"每份"等）
    const baseRegex = /每(\d+)([a-zA-Z\u4e00-\u9fa5]+)/;
    const baseMatch = text.match(baseRegex);
    if (baseMatch) {
      nutritionPer = parseInt(baseMatch[1]);
      nutritionUnit = UNIT_MAPPING[baseMatch[2]] || baseMatch[2];
    }
    
    // 解析各种营养成分
    for (const [key, keywords] of Object.entries(NUTRITION_KEYWORDS)) {
      for (const keyword of keywords) {
        // 匹配数字+关键词的模式
        const regex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*[a-zA-Z]*\\s*${keyword}`, 'i');
        const match = text.match(regex);
        
        if (match) {
          let value = parseFloat(match[1]);
          
          // 千焦转千卡
          if (keyword === '千焦' || keyword === 'kj') {
            value = value / 4.184;
          }
          
          nutrition[key] = value;
          break;
        }
      }
    }
    
    // 如果没有找到任何营养成分，返回undefined
    if (Object.keys(nutrition).length === 0) {
      return undefined;
    }
    
    return {
      nutritionPer,
      nutritionUnit,
      nutrition
    };
  } catch (error) {
    console.error('Error parsing nutrition text:', error);
    return undefined;
  }
}

/**
 * 检查是否有有效的营养数据
 */
function hasValidNutritionData(parsed: ParsedNutrition): boolean {
  const { nutrition } = parsed;
  
  // 至少需要有卡路里或者三大营养素中的一个
  return !!(
    nutrition.calories ||
    nutrition.protein ||
    nutrition.fat ||
    nutrition.carbs
  );
}

/**
 * 解析文本上下文
 */
export function parseTextContext(text: string): ParseContext {
  const quotedFoods = extractQuotedFoods(text);
  const nutritionSegments = extractNutritionSegments(text);
  
  return {
    hasQuotedFoods: quotedFoods.length > 0,
    quotedFoods,
    hasNutritionData: nutritionSegments.some(segment => segment.canAddToLibrary),
    nutritionSegments
  };
}

/**
 * 模糊匹配食物名称
 */
export function fuzzyMatchFoodName(query: string, foodName: string): number {
  // 简单的模糊匹配算法
  const queryLower = query.toLowerCase();
  const nameLower = foodName.toLowerCase();
  
  // 完全匹配
  if (queryLower === nameLower) {
    return 1.0;
  }
  
  // 包含匹配
  if (nameLower.includes(queryLower) || queryLower.includes(nameLower)) {
    return 0.8;
  }
  
  // 字符相似度匹配（简化版）
  let matches = 0;
  const minLength = Math.min(queryLower.length, nameLower.length);
  
  for (let i = 0; i < minLength; i++) {
    if (queryLower[i] === nameLower[i]) {
      matches++;
    }
  }
  
  const similarity = matches / Math.max(queryLower.length, nameLower.length);
  return similarity > 0.3 ? similarity : 0;
}

/**
 * 检测实时输入中的模式
 */
export function detectInputPattern(text: string, cursorPosition: number): {
  isInQuotes: boolean;
  isInNutrition: boolean;
  currentFood?: string;
  shouldShowLibraryMatch: boolean;
  shouldShowNutritionHelper: boolean;
} {
  const beforeCursor = text.substring(0, cursorPosition);
  
  // 检测是否在「」内
  const lastQuoteStart = beforeCursor.lastIndexOf('「');
  const lastQuoteEnd = beforeCursor.lastIndexOf('」');
  const isInQuotes = lastQuoteStart > lastQuoteEnd;
  
  // 检测是否在（）内
  const lastParenStart = beforeCursor.lastIndexOf('（');
  const lastParenEnd = beforeCursor.lastIndexOf('）');
  const isInNutrition = lastParenStart > lastParenEnd;
  
  // 提取当前食物名称
  let currentFood: string | undefined;
  if (isInQuotes && lastQuoteStart !== -1) {
    currentFood = beforeCursor.substring(lastQuoteStart + 1);
  }
  
  // 检测前面是否有「食物」模式
  const foodPattern = /「([^」]+)」[^（]*（?$/;
  const foodMatch = beforeCursor.match(foodPattern);
  const hasRecentFood = !!foodMatch;
  
  return {
    isInQuotes,
    isInNutrition,
    currentFood,
    shouldShowLibraryMatch: isInQuotes && !!currentFood && currentFood.length > 0,
    shouldShowNutritionHelper: isInNutrition && hasRecentFood
  };
}
