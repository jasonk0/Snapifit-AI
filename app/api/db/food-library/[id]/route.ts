import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import type { FoodItem } from "@/lib/types";

// 获取单个饮食库项目
export const GET = withAuth(
  async (request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const userId = request.userId!;
      const { id } = await params;

      const foodItem = await prisma.foodItem.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!foodItem) {
        return NextResponse.json({ error: "食物不存在或无权限" }, { status: 404 });
      }

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
      console.error("Get food library item error:", error);
      return NextResponse.json({ error: "获取饮食库项目失败" }, { status: 500 });
    }
  }
);

// 更新饮食库项目
export const PUT = withAuth(
  async (request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const userId = request.userId!;
      const { id } = await params;
      const data = await request.json();

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
          ...data,
          nutrition: data.nutrition ? JSON.stringify(data.nutrition) : undefined
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
  }
);

// 删除饮食库项目
export const DELETE = withAuth(
  async (request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const userId = request.userId!;
      const { id } = await params;

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
  }
); 