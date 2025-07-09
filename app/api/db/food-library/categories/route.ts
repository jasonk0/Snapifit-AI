import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth-middleware";

// 获取用户饮食库的所有分类
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.userId!;

    // 获取所有不为空的分类
    const categories = await prisma.foodItem.findMany({
      where: {
        userId,
        category: {
          not: null
        }
      },
      select: {
        category: true
      },
      distinct: ['category']
    });

    // 统计每个分类的食物数量
    const categoryStats = await Promise.all(
      categories.map(async (cat) => {
        const count = await prisma.foodItem.count({
          where: {
            userId,
            category: cat.category
          }
        });
        
        return {
          name: cat.category!,
          count
        };
      })
    );

    // 按数量排序
    categoryStats.sort((a, b) => b.count - a.count);

    return NextResponse.json({ categories: categoryStats });
  } catch (error) {
    console.error("Get food library categories error:", error);
    return NextResponse.json({ error: "获取分类失败" }, { status: 500 });
  }
});
