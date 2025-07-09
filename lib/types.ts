// 食物记录类型
export interface FoodEntry {
  id?: string; // 数据库中的唯一标识符
  log_id: string;
  food_name: string;
  consumed_grams: number;
  meal_type: string; // breakfast, lunch, dinner, snack
  time_period?: string; // 时间段：morning, noon, afternoon, evening
  nutritional_info_per_100g: {
    calories: number;
    carbohydrates: number;
    protein: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    [key: string]: number | undefined;
  };
  total_nutritional_info_consumed: {
    calories: number;
    carbohydrates: number;
    protein: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    [key: string]: number | undefined;
  };
  is_estimated: boolean;
  timestamp?: string;
}

// 运动记录类型
export interface ExerciseEntry {
  id?: string; // 数据库中的唯一标识符
  log_id: string;
  exercise_name: string;
  exercise_type: "cardio" | "strength" | "flexibility" | "other";
  duration_minutes: number;
  distance_km?: number; // 适用于有氧运动
  sets?: number; // 适用于力量训练
  reps?: number; // 适用于力量训练
  weight_kg?: number; // 适用于力量训练
  estimated_mets: number; // 代谢当量
  user_weight: number; // 用户体重，用于计算卡路里消耗
  calories_burned_estimated: number;
  muscle_groups?: string[]; // 锻炼的肌肉群
  is_estimated: boolean;
  timestamp?: string;
}

// 日常摘要类型
export interface DailySummaryType {
  totalCaloriesConsumed: number;
  totalCaloriesBurned: number;
  macros: {
    carbs: number;
    protein: number;
    fat: number;
  };
  micronutrients: Record<string, number>;
}

// TEF 分析结果类型
export interface TEFAnalysis {
  baseTEF: number; // 基础TEF (kcal)
  baseTEFPercentage: number; // 基础TEF百分比
  enhancementMultiplier: number; // AI分析的增强乘数
  enhancedTEF: number; // 增强后的TEF (kcal)
  enhancementFactors: string[]; // 影响因素列表
  analysisTimestamp: string; // 分析时间戳
}

// 智能建议类型
export interface SmartSuggestion {
  title: string;
  description: string;
  actionable: boolean;
  icon: string;
}

export interface SmartSuggestionCategory {
  key: string;
  category: string;
  priority: "high" | "medium" | "low";
  suggestions: SmartSuggestion[];
  summary: string;
}

export interface SmartSuggestionsResponse {
  suggestions: SmartSuggestionCategory[];
  generatedAt: string;
  dataDate: string;
}

// 每日状态记录类型
export interface DailyStatus {
  stress: number; // 压力水平 1-6
  mood: number; // 心情状态 1-6
  health: number; // 健康状况 1-6
  stressNotes?: string; // 压力补充说明
  moodNotes?: string; // 心情补充说明
  healthNotes?: string; // 健康状况补充说明
  bedTime?: string; // 睡眠时间 (HH:MM格式)
  wakeTime?: string; // 起床时间 (HH:MM格式)
  sleepQuality?: number; // 睡眠质量 1-6
  sleepNotes?: string; // 睡眠补充说明
}

// 日志类型
export interface DailyLog {
  date: string;
  foodEntries: FoodEntry[];
  exerciseEntries: ExerciseEntry[];
  summary: DailySummaryType;
  weight?: number; // 新增：记录当日体重
  activityLevel?: string; // 新增：记录当日的活动水平，用于TDEE计算
  calculatedBMR?: number; // 新增：当日计算的BMR
  calculatedTDEE?: number; // 新增：当日计算的TDEE
  tefAnalysis?: TEFAnalysis; // 新增：TEF分析结果
  dailyStatus?: DailyStatus; // 新增：每日状态记录
}

// 用户配置类型
export interface UserProfile {
  weight: number;
  height: number;
  age: number;
  gender: string;
  activityLevel: string;
  goal: string;
  targetWeight?: number;
  targetCalories?: number;
  notes?: string;
  bmrFormula?: "mifflin-st-jeor" | "harris-benedict"; // 新增：BMR计算公式选择
  bmrCalculationBasis?: "totalWeight" | "leanBodyMass"; // 新增：BMR计算依据
  bodyFatPercentage?: number; // 新增：体脂率，用于去脂体重计算
  // 专业模式字段
  professionalMode?: boolean; // 是否启用专业模式
  medicalHistory?: string; // 现有疾病、过敏、药物/补充剂、家族病史
  lifestyle?: string; // 食物偏好/禁忌、睡眠质量、压力水平、烟酒习惯
  healthAwareness?: string; // 健康认知与目标期望
}

// 模型配置类型
export interface ModelConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
}

// AI 配置类型
export interface AIConfig {
  agentModel: ModelConfig; // 工作模型/Agents模型
  chatModel: ModelConfig; // 对话模型
  visionModel: ModelConfig; // 视觉模型
}

// AI助手记忆类型（客户端简单版本）
export interface AIMemory {
  expertId: string; // 对应专家角色ID
  content?: string; // 记忆内容，限制500字（向后兼容）
  lastUpdated: string; // 最后更新时间
  version?: number; // 版本号，用于跟踪更新（向后兼容）
  // 服务器端结构化字段
  conversationCount?: number;
  keyInsights?: string[];
  userPreferences?: Record<string, any>;
  healthPatterns?: string[];
  goals?: string[];
  concerns?: string[];
}

// AI记忆更新请求类型
export interface AIMemoryUpdateRequest {
  expertId: string;
  newContent?: string; // 向后兼容
  reason?: string; // 更新原因
  // 服务器端结构化更新
  keyInsights?: string[];
  userPreferences?: Record<string, any>;
  healthPatterns?: string[];
  goals?: string[];
  concerns?: string[];
}

// 扩展的消息类型，支持思考过程
export interface ExtendedMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoning_content?: string; // 思考过程内容
  timestamp?: string;
}

// 饮食库相关类型
export interface FoodItem {
  id: string;
  userId: string;
  name: string; // 从「」中提取的食物名称
  category?: string; // AI生成的分类标签
  nutritionPer: number; // 营养成分对应的数量（如100）
  nutritionUnit: string; // 单位：'g', 'ml', '份', '个'等
  nutrition: {
    calories: number; // 卡路里/千焦
    protein: number; // 蛋白质(g)
    fat: number; // 脂肪(g)
    carbs: number; // 碳水化合物(g)
    fiber?: number; // 纤维(g)
    sugar?: number; // 糖(g)
    sodium?: number; // 钠(mg)
    [key: string]: number | undefined;
  };
  sourceText: string; // 原始输入文本，用于用户参考
  usageCount: number; // 使用次数统计
  createdAt: Date;
  updatedAt: Date;
}

// 解析上下文
export interface ParseContext {
  hasQuotedFoods: boolean; // 是否包含「」食物
  quotedFoods: string[]; // 提取的「」食物列表
  hasNutritionData: boolean; // 是否包含营养成分数据
  nutritionSegments: NutritionSegment[]; // 营养成分片段
}

export interface NutritionSegment {
  foodName: string; // 从「」提取的食物名称
  rawText: string; // （）内的原始文本
  parsedNutrition?: ParsedNutrition; // 解析后的营养数据
  canAddToLibrary: boolean; // 是否可添加到饮食库
}

export interface ParsedNutrition {
  nutritionPer: number; // 营养成分对应的数量
  nutritionUnit: string; // 单位
  nutrition: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    [key: string]: number | undefined;
  };
}

// 饮食库匹配结果
export interface FoodLibraryMatch {
  foodItem: FoodItem;
  similarity: number; // 相似度分数 0-1
  matchType: 'exact' | 'partial' | 'fuzzy'; // 匹配类型
}

// 饮食库搜索参数
export interface FoodLibrarySearchParams {
  query?: string;
  category?: string;
  limit?: number;
  offset?: number;
}
