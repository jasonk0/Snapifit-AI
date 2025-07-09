import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { createOpenAIClient } from "@/lib/openai-client";
import type { AIConfig } from "@/lib/types";

// 使用AI生成食物分类
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { foodName, sourceText } = await request.json();
    
    if (!foodName) {
      return NextResponse.json({ error: "食物名称不能为空" }, { status: 400 });
    }

    // 获取AI配置
    const aiConfigHeader = request.headers.get("x-ai-config");
    if (!aiConfigHeader) {
      return NextResponse.json({ error: "缺少AI配置" }, { status: 400 });
    }

    const aiConfig: AIConfig = JSON.parse(aiConfigHeader);
    const client = createOpenAIClient(aiConfig.agentModel);

    // 构建提示词
    const prompt = `
      请为以下食物生成一个合适的分类标签。分类应该简洁明了，便于用户管理饮食库。

      食物名称: "${foodName}"
      ${sourceText ? `原始描述: "${sourceText}"` : ''}

      请从以下常见分类中选择最合适的一个，或者提供一个更准确的分类：
      - 主食类 (米饭、面条、面包等)
      - 蛋白质类 (肉类、蛋类、豆类等)
      - 蔬菜类 (各种蔬菜)
      - 水果类 (各种水果)
      - 乳制品类 (牛奶、酸奶、奶酪等)
      - 坚果类 (各种坚果)
      - 饮品类 (各种饮料)
      - 零食类 (各种零食)
      - 调料类 (各种调料)
      - 其他

      请只返回分类名称，不要包含其他文字。
    `;

    const { text: category } = await client.generateText({
      model: aiConfig.agentModel.name,
      prompt,
      max_tokens: 50,
      temperature: 0.3
    });

    // 清理返回的分类名称
    const cleanCategory = category.trim().replace(/["""]/g, '');

    return NextResponse.json({ category: cleanCategory });
  } catch (error) {
    console.error("Generate food category error:", error);
    return NextResponse.json({ error: "生成分类失败" }, { status: 500 });
  }
});
