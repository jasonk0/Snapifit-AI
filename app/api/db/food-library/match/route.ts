import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth-middleware";
import type { FoodLibraryMatch } from "@/lib/types";
import { fuzzyMatchFoodName } from "@/lib/food-parser";

// 匹配饮食库中的食物
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.userId!;
    const { foodName, limit = 5 } = await request.json();

    if (!foodName || typeof foodName !== 'string') {
      return NextResponse.json({ error: "食物名称不能为空" }, { status: 400 });
    }

    // 获取用户的所有饮食库项目
    const allFoodItems = await prisma.foodItem.findMany({
      where: { userId },
      orderBy: [
        { usageCount: 'desc' },
        { updatedAt: 'desc' }
      ]
    });

    // 计算匹配度并排序
    const matches: FoodLibraryMatch[] = [];
    
    for (const item of allFoodItems) {
      const similarity = fuzzyMatchFoodName(foodName, item.name);
      if (similarity > 0) {
        let matchType: 'exact' | 'partial' | 'fuzzy';
        
        if (similarity === 1.0) {
          matchType = 'exact';
        } else if (similarity >= 0.8) {
          matchType = 'partial';
        } else {
          matchType = 'fuzzy';
        }

        matches.push({
          foodItem: {
            id: item.id,
            userId: item.userId,
            name: item.name,
            category: item.category || undefined,
            nutritionPer: item.nutritionPer,
            nutritionUnit: item.nutritionUnit,
            nutrition: JSON.parse(item.nutrition),
            sourceText: item.sourceText,
            usageCount: item.usageCount,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
          },
          similarity,
          matchType
        });
      }
    }

    // 按相似度和使用频率排序
    matches.sort((a, b) => {
      // 首先按相似度排序
      if (a.similarity !== b.similarity) {
        return b.similarity - a.similarity;
      }
      // 相似度相同时按使用频率排序
      return b.foodItem.usageCount - a.foodItem.usageCount;
    });

    // 返回前N个匹配结果
    const topMatches = matches.slice(0, limit);

    return NextResponse.json({
      matches: topMatches,
      total: matches.length
    });
  } catch (error) {
    console.error("Match food library error:", error);
    return NextResponse.json({ error: "匹配饮食库失败" }, { status: 500 });
  }
});

// 增加食物使用次数
export const PATCH = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.userId!;
    const { foodItemId } = await request.json();

    if (!foodItemId) {
      return NextResponse.json({ error: "食物ID不能为空" }, { status: 400 });
    }

    // 验证权限并增加使用次数
    const updatedItem = await prisma.foodItem.updateMany({
      where: {
        id: foodItemId,
        userId
      },
      data: {
        usageCount: {
          increment: 1
        }
      }
    });

    if (updatedItem.count === 0) {
      return NextResponse.json({ error: "食物不存在或无权限" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update food usage count error:", error);
    return NextResponse.json({ error: "更新使用次数失败" }, { status: 500 });
  }
});
