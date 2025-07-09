import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth-middleware";
import type { FoodItem } from "@/lib/types";

// 导入饮食库数据
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.userId!;
    const { foodItems, options = {} } = await request.json();

    if (!Array.isArray(foodItems)) {
      return NextResponse.json({ error: "数据格式错误" }, { status: 400 });
    }

    const {
      skipDuplicates = true,
      overwriteExisting = false,
      mergeUsageCount = false
    } = options;

    const results = {
      imported: 0,
      skipped: 0,
      updated: 0,
      errors: [] as string[]
    };

    for (const item of foodItems) {
      try {
        // 验证必填字段
        if (!item.name || !item.nutrition || typeof item.nutritionPer !== 'number') {
          results.errors.push(`食物 "${item.name || '未知'}" 缺少必填字段`);
          continue;
        }

        // 检查是否已存在
        const existingItem = await prisma.foodItem.findFirst({
          where: {
            userId,
            name: item.name
          }
        });

        if (existingItem) {
          if (skipDuplicates && !overwriteExisting) {
            results.skipped++;
            continue;
          }

          if (overwriteExisting) {
            // 更新现有项目
            const updateData: any = {
              category: item.category,
              nutritionPer: item.nutritionPer,
              nutritionUnit: item.nutritionUnit || 'g',
              nutrition: JSON.stringify(item.nutrition),
              sourceText: item.sourceText || ''
            };

            if (mergeUsageCount && typeof item.usageCount === 'number') {
              updateData.usageCount = existingItem.usageCount + item.usageCount;
            }

            await prisma.foodItem.update({
              where: { id: existingItem.id },
              data: updateData
            });

            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          // 创建新项目
          await prisma.foodItem.create({
            data: {
              userId,
              name: item.name,
              category: item.category,
              nutritionPer: item.nutritionPer,
              nutritionUnit: item.nutritionUnit || 'g',
              nutrition: JSON.stringify(item.nutrition),
              sourceText: item.sourceText || '',
              usageCount: item.usageCount || 0
            }
          });

          results.imported++;
        }
      } catch (error) {
        console.error(`Error importing food item "${item.name}":`, error);
        results.errors.push(`导入食物 "${item.name}" 时出错: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error("Import food library error:", error);
    return NextResponse.json({ error: "导入饮食库失败" }, { status: 500 });
  }
});

// 验证导入数据格式
export const PUT = withAuth(async (request: NextRequest) => {
  try {
    const { foodItems } = await request.json();

    if (!Array.isArray(foodItems)) {
      return NextResponse.json({ 
        valid: false, 
        error: "数据必须是数组格式" 
      });
    }

    const validation = {
      valid: true,
      totalItems: foodItems.length,
      validItems: 0,
      invalidItems: 0,
      errors: [] as string[]
    };

    for (let i = 0; i < foodItems.length; i++) {
      const item = foodItems[i];
      const itemErrors: string[] = [];

      // 检查必填字段
      if (!item.name || typeof item.name !== 'string') {
        itemErrors.push('缺少食物名称');
      }

      if (!item.nutrition || typeof item.nutrition !== 'object') {
        itemErrors.push('缺少营养成分数据');
      } else {
        if (typeof item.nutrition.calories !== 'number') {
          itemErrors.push('缺少卡路里数据');
        }
      }

      if (typeof item.nutritionPer !== 'number' || item.nutritionPer <= 0) {
        itemErrors.push('营养成分基准数量无效');
      }

      if (!item.nutritionUnit || typeof item.nutritionUnit !== 'string') {
        itemErrors.push('缺少营养成分单位');
      }

      if (itemErrors.length > 0) {
        validation.invalidItems++;
        validation.errors.push(`第${i + 1}项 "${item.name || '未知'}": ${itemErrors.join(', ')}`);
      } else {
        validation.validItems++;
      }
    }

    if (validation.invalidItems > 0) {
      validation.valid = false;
    }

    return NextResponse.json(validation);
  } catch (error) {
    console.error("Validate import data error:", error);
    return NextResponse.json({
      valid: false,
      error: "数据验证失败"
    }, { status: 500 });
  }
});
