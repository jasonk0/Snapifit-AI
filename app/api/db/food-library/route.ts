import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth-middleware";
import type { FoodItem, FoodLibrarySearchParams } from "@/lib/types";
import { fuzzyMatchFoodName } from "@/lib/food-parser";

// 获取饮食库列表
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.userId!;
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('query') || '';
    const category = searchParams.get('category') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 构建查询条件
    const where: any = { userId };
    
    if (query) {
      where.OR = [
        { name: { contains: query } },
        { sourceText: { contains: query } }
      ];
    }
    
    if (category) {
      where.category = category;
    }

    // 查询数据
    const [foodItems, total] = await Promise.all([
      prisma.foodItem.findMany({
        where,
        orderBy: [
          { usageCount: 'desc' },
          { updatedAt: 'desc' }
        ],
        take: limit,
        skip: offset
      }),
      prisma.foodItem.count({ where })
    ]);

    // 转换数据格式
    const formattedItems: FoodItem[] = foodItems.map(item => ({
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
    }));

    return NextResponse.json({
      foodItems: formattedItems,
      total,
      hasMore: offset + limit < total
    });
  } catch (error) {
    console.error("Get food library error:", error);
    return NextResponse.json({ error: "获取饮食库失败" }, { status: 500 });
  }
});

// 创建饮食库项目
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.userId!;
    const data = await request.json();

    // 验证必填字段
    const requiredFields = [
      "name",
      "nutritionPer",
      "nutritionUnit", 
      "nutrition",
      "sourceText"
    ];
    
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return NextResponse.json(
          { error: `${field} 是必填字段` },
          { status: 400 }
        );
      }
    }

    // 检查是否已存在相同名称的食物
    const existingFood = await prisma.foodItem.findFirst({
      where: {
        userId,
        name: data.name
      }
    });

    if (existingFood) {
      return NextResponse.json(
        { error: "该食物已存在于饮食库中" },
        { status: 409 }
      );
    }

    // 创建饮食库项目
    const foodItem = await prisma.foodItem.create({
      data: {
        userId,
        name: data.name,
        category: data.category,
        nutritionPer: data.nutritionPer,
        nutritionUnit: data.nutritionUnit,
        nutrition: JSON.stringify(data.nutrition),
        sourceText: data.sourceText,
        usageCount: 0
      }
    });

    // 转换数据格式
    const formattedItem: FoodItem = {
      id: foodItem.id,
      userId: foodItem.userId,
      name: foodItem.name,
      category: foodItem.category || undefined,
      nutritionPer: foodItem.nutritionPer,
      nutritionUnit: foodItem.nutritionUnit,
      nutrition: JSON.parse(foodItem.nutrition),
      sourceText: foodItem.sourceText,
      usageCount: foodItem.usageCount,
      createdAt: foodItem.createdAt,
      updatedAt: foodItem.updatedAt
    };

    return NextResponse.json({ foodItem: formattedItem });
  } catch (error) {
    console.error("Create food library item error:", error);
    return NextResponse.json({ error: "创建饮食库项目失败" }, { status: 500 });
  }
});

// 更新饮食库项目
export const PUT = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.userId!;
    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json({ error: "缺少食物ID" }, { status: 400 });
    }

    // 验证权限
    const existingItem = await prisma.foodItem.findFirst({
      where: { id, userId }
    });

    if (!existingItem) {
      return NextResponse.json({ error: "食物不存在或无权限" }, { status: 404 });
    }

    // 更新数据
    const updatedItem = await prisma.foodItem.update({
      where: { id },
      data: {
        ...updateData,
        nutrition: updateData.nutrition ? JSON.stringify(updateData.nutrition) : undefined
      }
    });

    // 转换数据格式
    const formattedItem: FoodItem = {
      id: updatedItem.id,
      userId: updatedItem.userId,
      name: updatedItem.name,
      category: updatedItem.category || undefined,
      nutritionPer: updatedItem.nutritionPer,
      nutritionUnit: updatedItem.nutritionUnit,
      nutrition: JSON.parse(updatedItem.nutrition),
      sourceText: updatedItem.sourceText,
      usageCount: updatedItem.usageCount,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt
    };

    return NextResponse.json({ foodItem: formattedItem });
  } catch (error) {
    console.error("Update food library item error:", error);
    return NextResponse.json({ error: "更新饮食库项目失败" }, { status: 500 });
  }
});

// 删除饮食库项目
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.userId!;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "缺少食物ID" }, { status: 400 });
    }

    // 验证权限
    const existingItem = await prisma.foodItem.findFirst({
      where: { id, userId }
    });

    if (!existingItem) {
      return NextResponse.json({ error: "食物不存在或无权限" }, { status: 404 });
    }

    // 删除项目
    await prisma.foodItem.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete food library item error:", error);
    return NextResponse.json({ error: "删除饮食库项目失败" }, { status: 500 });
  }
});
