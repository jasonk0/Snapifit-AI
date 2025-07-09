import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { parseTextContext } from "@/lib/food-parser";
import type { ParseContext } from "@/lib/types";

// 解析文本中的饮食库相关信息
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: "文本内容不能为空" }, { status: 400 });
    }

    // 解析文本上下文
    const context: ParseContext = parseTextContext(text);

    return NextResponse.json({ context });
  } catch (error) {
    console.error("Parse food library context error:", error);
    return NextResponse.json({ error: "解析文本失败" }, { status: 500 });
  }
});
