import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

// 获取单个食物记录
export const GET = withAuth(
  async (request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const userId = request.userId!;
      const { id } = await params;

      const foodEntry = await prisma.foodEntry.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!foodEntry) {
        return NextResponse.json({ error: "食物记录不存在" }, { status: 404 });
      }

      return NextResponse.json({ foodEntry });
    } catch (error) {
      console.error("Get food entry error:", error);
      return NextResponse.json({ error: "获取食物记录失败" }, { status: 500 });
    }
  }
);

// 更新食物记录
export const PUT = withAuth(
  async (request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const userId = request.userId!;
      const { id } = await params;
      const data = await request.json();

      // 验证必需字段
      if (
        !data.foodName ||
        data.consumedGrams === undefined ||
        !data.mealType
      ) {
        return NextResponse.json(
          { error: "缺少必需字段: foodName, consumedGrams, mealType" },
          { status: 400 }
        );
      }

      // 验证记录是否属于当前用户
      const existingEntry = await prisma.foodEntry.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!existingEntry) {
        return NextResponse.json({ error: "食物记录不存在" }, { status: 404 });
      }

      const foodEntry = await prisma.foodEntry.update({
        where: { id },
        data: {
          foodName: data.foodName,
          consumedGrams: data.consumedGrams,
          mealType: data.mealType,
          timePeriod: data.timePeriod,
          nutritionalInfoPer100g: JSON.stringify(data.nutritionalInfoPer100g),
          totalNutritionalInfoConsumed: JSON.stringify(
            data.totalNutritionalInfoConsumed
          ),
          isEstimated: data.isEstimated,
          timestamp: data.timestamp,
          // 保持原有的 logId，或者如果提供了新的 logId 则更新
          ...(data.logId && { logId: data.logId }),
        },
      });

      return NextResponse.json({ foodEntry });
    } catch (error) {
      console.error("Update food entry error:", error);
      console.error("Request data:", data);
      console.error("Food entry ID:", id);
      console.error("User ID:", userId);

      // 提供更详细的错误信息
      const errorMessage =
        error instanceof Error ? error.message : "更新食物记录失败";
      return NextResponse.json(
        {
          error: "更新食物记录失败",
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  }
);

// 删除食物记录
export const DELETE = withAuth(
  async (request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const userId = request.userId!;
      const { id } = await params;

      // 验证记录是否属于当前用户
      const existingEntry = await prisma.foodEntry.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!existingEntry) {
        return NextResponse.json({ error: "食物记录不存在" }, { status: 404 });
      }

      await prisma.foodEntry.delete({
        where: { id },
      });

      return NextResponse.json({ message: "食物记录已删除" });
    } catch (error) {
      console.error("Delete food entry error:", error);
      return NextResponse.json({ error: "删除食物记录失败" }, { status: 500 });
    }
  }
);
