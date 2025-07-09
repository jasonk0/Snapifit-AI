import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth-middleware";

// 导出饮食库数据
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.userId!;
    const { searchParams } = new URL(request.url);
    
    const format = searchParams.get('format') || 'json';
    const category = searchParams.get('category');
    const includeUsageStats = searchParams.get('includeUsageStats') === 'true';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // 构建查询条件
    const where: any = { userId };
    
    if (category) {
      where.category = category;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // 查询数据
    const foodItems = await prisma.foodItem.findMany({
      where,
      orderBy: [
        { usageCount: 'desc' },
        { name: 'asc' }
      ]
    });

    // 转换数据格式
    const exportData = foodItems.map(item => ({
      name: item.name,
      category: item.category,
      nutritionPer: item.nutritionPer,
      nutritionUnit: item.nutritionUnit,
      nutrition: JSON.parse(item.nutrition),
      sourceText: item.sourceText,
      ...(includeUsageStats && {
        usageCount: item.usageCount,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString()
      })
    }));

    // 添加导出元数据
    const exportMetadata = {
      exportedAt: new Date().toISOString(),
      totalItems: exportData.length,
      exportOptions: {
        category: category || 'all',
        includeUsageStats,
        dateRange: {
          from: dateFrom,
          to: dateTo
        }
      },
      version: '1.0'
    };

    const fullExportData = {
      metadata: exportMetadata,
      foodItems: exportData
    };

    if (format === 'csv') {
      // CSV格式导出
      const csvHeaders = [
        'name',
        'category',
        'nutritionPer',
        'nutritionUnit',
        'calories',
        'protein',
        'fat',
        'carbs',
        'fiber',
        'sugar',
        'sodium',
        'sourceText'
      ];

      if (includeUsageStats) {
        csvHeaders.push('usageCount', 'createdAt', 'updatedAt');
      }

      const csvRows = exportData.map(item => {
        const row = [
          `"${item.name}"`,
          `"${item.category || ''}"`,
          item.nutritionPer,
          `"${item.nutritionUnit}"`,
          item.nutrition.calories || 0,
          item.nutrition.protein || 0,
          item.nutrition.fat || 0,
          item.nutrition.carbs || 0,
          item.nutrition.fiber || 0,
          item.nutrition.sugar || 0,
          item.nutrition.sodium || 0,
          `"${item.sourceText}"`
        ];

        if (includeUsageStats && 'usageCount' in item) {
          row.push(
            (item as any).usageCount,
            `"${(item as any).createdAt}"`,
            `"${(item as any).updatedAt}"`
          );
        }

        return row.join(',');
      });

      const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="food-library-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else {
      // JSON格式导出
      return new NextResponse(JSON.stringify(fullExportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="food-library-${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    }
  } catch (error) {
    console.error("Export food library error:", error);
    return NextResponse.json({ error: "导出饮食库失败" }, { status: 500 });
  }
});
