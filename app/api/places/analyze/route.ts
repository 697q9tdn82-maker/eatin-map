import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request: Request) {
  const { storeName, reviews } = await request.json();

  if (!reviews || reviews.length === 0) {
    return Response.json({ hasEatIn: null, confidence: "low", reason: "口コミなし" });
  }

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `以下はコンビニ「${storeName}」の口コミです。イートインスペース（店内で飲食できる席）があるかどうかを判定してください。

口コミ：
${reviews.join("\n")}

以下のJSON形式のみで回答してください。他の文字は一切含めないでください：
{"hasEatIn": true or false or null, "confidence": "high" or "medium" or "low", "reason": "判定理由を20文字以内で"}

イートインに関する言及がない場合はnullにしてください。`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const result = JSON.parse(text);
    return Response.json(result);
  } catch (e) {
    console.error("Claude APIエラー:", e);
    return Response.json({ hasEatIn: null, confidence: "low", reason: "解析失敗" });
  }
}