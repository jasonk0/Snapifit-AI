import { NextResponse } from "next/server";
import { OpenAICompatibleClient } from "@/lib/openai-client";
import { v4 as uuidv4 } from "uuid";
import { withAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

export const POST = withAuth(async (request) => {
  try {
    const userId = request.userId!;
    const formData = await request.formData();
    const text = (formData.get("text") as string) || "";
    const type = formData.get("type") as string;
    const userWeight = formData.get("userWeight") as string;
    const logId = formData.get("logId") as string;
    const aiConfigStr = formData.get("aiConfig") as string;

    // 收集所有图片
    const images: File[] = [];
    for (let i = 0; i < 5; i++) {
      const image = formData.get(`image${i}`) as File;
      if (image) {
        images.push(image);
      }
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 }
      );
    }

    if (!logId) {
      return NextResponse.json({ error: "logId is required" }, { status: 400 });
    }

    if (!aiConfigStr) {
      return NextResponse.json(
        { error: "AI configuration not found" },
        { status: 400 }
      );
    }

    const aiConfig = JSON.parse(aiConfigStr);
    const modelConfig = aiConfig.visionModel;

    // 创建客户端
    const client = new OpenAICompatibleClient(
      modelConfig.baseUrl,
      modelConfig.apiKey
    );

    // 将图片转换为 base64
    const imageDataURIs = await Promise.all(
      images.map(async (image) => {
        const imageBuffer = await image.arrayBuffer();
        const imageBase64 = Buffer.from(imageBuffer).toString("base64");
        return `data:${image.type};base64,${imageBase64}`;
      })
    );

    // 根据类型选择不同的提示词和解析逻辑
    if (type === "food") {
      // 食物图片解析提示词
      const prompt = `
        请分析${images.length > 1 ? "这些" : "这张"}食物图片${
        text ? "和文本描述" : ""
      }，识别图中的食物，并将其转换为结构化的 JSON 格式。
        ${text ? `用户文本描述: "${text}"` : ""}
        
        请直接输出 JSON，不要有额外文本。如果无法确定数值，请给出合理估算，并在相应字段标记 is_estimated: true。
        
        每个食物项应包含以下字段:
        - log_id: 唯一标识符
        - food_name: 食物名称
        - consumed_grams: 消耗的克数
        - meal_type: 餐次类型 (breakfast, lunch, dinner, snack)
        - time_period: 时间段 (morning, noon, afternoon, evening)，根据图片内容和文本描述推断
        - nutritional_info_per_100g: 每100克的营养成分，包括 calories, carbohydrates, protein, fat 等
        - total_nutritional_info_consumed: 基于消耗克数计算的总营养成分
        - is_estimated: 是否为估算值
        
        示例输出格式:
        {
          "food": [
            {
              "log_id": "uuid",
              "food_name": "全麦面包",
              "consumed_grams": 80,
              "meal_type": "breakfast",
              "time_period": "morning",
              "nutritional_info_per_100g": {
                "calories": 265,
                "carbohydrates": 48.5,
                "protein": 9.0,
                "fat": 3.2,
                "fiber": 7.4
              },
              "total_nutritional_info_consumed": {
                "calories": 212,
                "carbohydrates": 38.8,
                "protein": 7.2,
                "fat": 2.56,
                "fiber": 5.92
              },
              "is_estimated": true
            }
          ]
        }
      `;

      const { text: resultText } = await client.generateText({
        model: modelConfig.name,
        prompt,
        images: imageDataURIs,
        response_format: { type: "json_object" },
      });

      // 解析结果
      const result = JSON.parse(resultText);

      // 为每个食物项添加唯一 ID 并保存到数据库
      if (result.food && Array.isArray(result.food)) {
        const savedFoodEntries = [];

        for (const item of result.food) {
          const id = uuidv4();
          item.log_id = id;

          // 保存到数据库
          try {
            const savedEntry = await prisma.foodEntry.create({
              data: {
                id,
                userId,
                logId,
                foodName: item.food_name,
                consumedGrams: item.consumed_grams,
                mealType: item.meal_type,
                timePeriod: item.time_period,
                nutritionalInfoPer100g: JSON.stringify(
                  item.nutritional_info_per_100g
                ),
                totalNutritionalInfoConsumed: JSON.stringify(
                  item.total_nutritional_info_consumed
                ),
                isEstimated: item.is_estimated || false,
                timestamp: new Date().toISOString(),
              },
            });

            // 转换为前端格式
            savedFoodEntries.push({
              ...item,
              id: savedEntry.id,
            });
          } catch (error) {
            console.error("Failed to save food entry:", error);
            // 如果保存失败，仍然返回解析结果，但标记为未保存
            savedFoodEntries.push({
              ...item,
              _saveError: true,
            });
          }
        }

        result.food = savedFoodEntries;
      }

      return NextResponse.json(result);
    } else if (type === "exercise") {
      // 运动图片解析提示词
      const prompt = `
        请分析${images.length > 1 ? "这些" : "这张"}运动相关的图片${
        text ? "和文本描述" : ""
      }，识别图中的运动类型，并将其转换为结构化的 JSON 格式。
        ${text ? `用户文本描述: "${text}"` : ""}
        用户体重: ${userWeight || 70} kg
        
        请直接输出 JSON，不要有额外文本。如果无法确定数值，请给出合理估算，并在相应字段标记 is_estimated: true。
        
        每个运动项应包含以下字段:
        - log_id: 唯一标识符
        - exercise_name: 运动名称
        - exercise_type: 运动类型 (cardio, strength, flexibility, other)
        - duration_minutes: 持续时间(分钟)
        - distance_km: 距离(公里，仅适用于有氧运动)
        - sets: 组数(仅适用于力量训练)
        - reps: 次数(仅适用于力量训练)
        - weight_kg: 重量(公斤，仅适用于力量训练)
        - estimated_mets: 代谢当量(MET值)
        - user_weight: 用户体重(公斤)
        - calories_burned_estimated: 估算的卡路里消耗
        - muscle_groups: 锻炼的肌肉群
        - is_estimated: 是否为估算值
        
        示例输出格式:
        {
          "exercise": [
            {
              "log_id": "uuid",
              "exercise_name": "跑步",
              "exercise_type": "cardio",
              "duration_minutes": 30,
              "distance_km": 5,
              "estimated_mets": 8.3,
              "user_weight": 70,
              "calories_burned_estimated": 290.5,
              "muscle_groups": ["腿部", "核心"],
              "is_estimated": true
            }
          ]
        }
      `;

      const { text: resultText } = await client.generateText({
        model: modelConfig.name,
        prompt,
        images: imageDataURIs,
        response_format: { type: "json_object" },
      });

      // 解析结果
      const result = JSON.parse(resultText);

      // 为每个运动项添加唯一 ID 并保存到数据库
      if (result.exercise && Array.isArray(result.exercise)) {
        const savedExerciseEntries = [];

        for (const item of result.exercise) {
          const id = uuidv4();
          item.log_id = id;

          // 保存到数据库
          try {
            const savedEntry = await prisma.exerciseEntry.create({
              data: {
                id,
                userId,
                logId,
                exerciseName: item.exercise_name,
                exerciseType: item.exercise_type,
                durationMinutes: item.duration_minutes,
                distanceKm: item.distance_km,
                sets: item.sets,
                reps: item.reps,
                weightKg: item.weight_kg,
                estimatedMets: item.estimated_mets,
                userWeight: item.user_weight || userWeight,
                caloriesBurnedEstimated: item.calories_burned_estimated,
                muscleGroups: item.muscle_groups
                  ? JSON.stringify(item.muscle_groups)
                  : null,
                isEstimated: item.is_estimated || false,
                timestamp: new Date().toISOString(),
              },
            });

            // 转换为前端格式
            savedExerciseEntries.push({
              ...item,
              id: savedEntry.id,
            });
          } catch (error) {
            console.error("Failed to save exercise entry:", error);
            // 如果保存失败，仍然返回解析结果，但标记为未保存
            savedExerciseEntries.push({
              ...item,
              _saveError: true,
            });
          }
        }

        result.exercise = savedExerciseEntries;
      }

      return NextResponse.json(result);
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
});
