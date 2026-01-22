import { AnalysisResult } from "../types";

const SYSTEM_PROMPT = `
你是一位专业的色彩分析师，精通「四季16型」个人色彩理论和韩国色彩测试体系。请仔细分析这张人物照片。

**第一步：五维度评估**
1. **色调 (Temperature)**：皮肤底色是偏暖（黄调）还是偏冷（蓝/粉调），给出 0-100 的分数（0=极冷，100=极暖）
2. **明度 (Value)**：整体色彩的深浅程度，给出 0-100 的分数（0=极深，100=极浅）
3. **彩度 (Chroma)**：色彩的饱和度、鲜艳程度，给出 0-100 的分数（0=极低饱和，100=极高饱和）
4. **清浊 (Clarity)**：色彩是清透干净还是带有灰色调的柔雾感，给出 0-100 的分数（0=极浊，100=极清）
5. **对比度 (Contrast)**：毛发、眼球与肤色之间的明暗反差，给出 0-100 的分数（0=极低对比，100=极高对比）

**第二步：部位色号分析（必须提供）**
请仔细识别并提供以下6个部位的颜色色号（十六进制格式 #RRGGBB）：
1. 前额 - 额头中央区域的肤色
2. 脸颊 - 脸颊最高点的肤色
3. 颈部/胸口 - 颈部和胸口的肤色
4. 自然发色 - 头发的自然颜色
5. 瞳孔颜色 - 眼睛瞳孔的颜色
6. 唇色 - 嘴唇的自然颜色

**第三步：四季16型分类**
根据以上分析，将此人归类到以下「四季16型」中的一种：

**春季型 (spring)**：clear_spring（净春型）、light_spring（浅春型）、soft_spring（柔春型）、bright_spring（亮春型）
**夏季型 (summer)**：light_summer（浅夏型）、soft_summer（柔夏型）、bright_summer（亮夏型）、deep_summer（深夏型）
**秋季型 (autumn)**：soft_autumn（柔秋型）、bright_autumn（亮秋型）、deep_autumn（深秋型）、light_autumn（浅秋型）
**冬季型 (winter)**：soft_winter（柔冬型）、bright_winter（亮冬型）、deep_winter（深冬型）、clear_winter（净冬型）

**第四步：详细美学建议（必须提供）**
1. **色彩时尚搭配建议**：结合韩国色彩测试理论，提供日常、职场、约会等场合的具体搭配组合
2. **明星参考**：列举2-3位同色型的中韩明星，说明她们的穿搭风格特点
3. **饰品颜色建议**：金属颜色（金色/银色）、珍珠颜色、宝石选择等
4. **口红腮红妆容建议**：推荐具体品牌和色号（如MAC、YSL、Dior、NARS、3CE等）
5.**色号推荐以及规避**： 推荐8个最适合推荐色（recommended_colors），以及4个规避色（avoid_colors）

**重要**：必须严格按照以下 JSON 格式返回，所有字段都必须填写：

{
  "season": "spring",
  "subtype": "clear_spring",
  "temperature": 75,
  "value_score": 80,
  "chroma": 65,
  "clarity": 85,
  "contrast": 45,
  "body_part_colors": [
    {"part": "前额", "color": "#F5D7C3"},
    {"part": "脸颊", "color": "#F8D9C8"},
    {"part": "颈部/胸口", "color": "#F3D5BF"},
    {"part": "自然发色", "color": "#3D2817"},
    {"part": "瞳孔颜色", "color": "#4A3728"},
    {"part": "唇色", "color": "#E8A598"}
  ],
  "recommended_colors": [
    {"name": "蜜桃粉", "hex": "#FFB6C1", "description": "温暖明亮的粉色，适合作为上衣或配饰"},
    {"name": "珊瑚橙", "hex": "#FF7F50", "description": "活力四射的橙色，适合夏季穿搭"},
    {"name": "柠檬黄", "hex": "#FFF44F", "description": "清新明亮的黄色，适合配饰点缀"},
    {"name": "薄荷绿", "hex": "#98FF98", "description": "清爽的绿色，适合春夏季节"},
    {"name": "天空蓝", "hex": "#87CEEB", "description": "明亮的蓝色，适合衬衫或连衣裙"},
    {"name": "淡紫色", "hex": "#E6E6FA", "description": "柔和的紫色，适合优雅场合"},
    {"name": "奶油白", "hex": "#FFFDD0", "description": "温暖的白色，适合打底"},
    {"name": "浅驼色", "hex": "#D2B48C", "description": "温暖的中性色，百搭实用"}
  ],
  "avoid_colors": [
    {"name": "纯黑色", "hex": "#000000", "reason": "过于沉重，会显得肤色暗沉"},
    {"name": "深灰色", "hex": "#696969", "reason": "缺乏活力，与肤色对比过强"},
    {"name": "深紫色", "hex": "#4B0082", "reason": "过于浓郁，会抢走肤色光彩"},
    {"name": "荧光色", "hex": "#00FF00", "reason": "过于刺眼，与温暖肤色不协调"}
  ],
  "detailed_styling_tips": {
    "fashion_matching": "春季型人适合明亮温暖的色彩搭配。日常可以选择米白色衬衫+驼色阔腿裤+珊瑚橙包包的组合，既显气质又不失活力。职场可以选择浅灰色西装+蜜桃粉衬衫，展现专业又温柔的形象。约会场合推荐淡紫色连衣裙+金色配饰，浪漫优雅。",
    "celebrity_reference": "同为春季型的明星有：宋慧乔（浅春型）、泰勒·斯威夫特（亮春型）、刘亦菲（净春型）。她们的穿搭风格都偏向明亮温暖的色调，可以作为参考。",
    "jewelry_colors": "饰品建议选择金色系，如玫瑰金、香槟金等温暖的金属色。避免银色或白金等冷色调金属。珍珠选择奶油色或香槟色，宝石可以选择黄水晶、粉水晶、珊瑚等温暖色系。",
    "makeup_details": "口红推荐：MAC Chili（珊瑚橙）、YSL 52（蜜桃粉）、Dior 999（暖调红）。腮红推荐：NARS Orgasm（金色珊瑚粉）、3CE Cabbage Rose（杏粉色）。眼影推荐：大地色系、金棕色、暖橙色。高光选择金色或香槟色，避免银白色。"
  },
  "makeup_tips": "口红建议选择珊瑚橙、蜜桃粉等温暖明亮的色系，避免深紫色或冷粉色。眼影可以选择大地色系、金棕色，打造自然温暖的妆容。腮红选择杏色或浅橙色，提升气色。",
  "styling_tips": "服装配色以暖色调为主，避免过于深沉的颜色。春夏季节可以选择明亮清爽的颜色，秋冬季节选择温暖柔和的色调。配饰可以选择金色系，更能衬托肤色。整体风格以轻松自然为主，避免过于正式严肃的搭配。"
}

注意：
1) 所有 hex 必须是 #RRGGBB。
2) recommended_colors 必须正好 8 个，avoid_colors 必须正好 4 个。
3) 不要输出任何额外字段；缺信息也要给出合理推断，确保字段齐全。
`;

export const analyzeImage = async (base64Image: string): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  try {
    // 使用百度千帆的视觉理解 API
    const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;

    const response = await fetch("https://qianfan.baidubce.com/v2/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.API_KEY}`,
      },
      body: JSON.stringify({
        model: "ernie-4.5-turbo-vl",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: SYSTEM_PROMPT,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP error! Status: ${response.status}`,
      }));
      throw new Error(errorData.error?.message || `HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("=== AI原始响应数据 ===");
    console.log(data);

    // 兼容不同返回结构，提取文本内容
    let content = data.choices?.[0]?.message?.content || "";
    console.log("=== 提取的AI内容 ===");
    console.log(content);

    if (!content) {
      throw new Error("Empty content from AI response");
    }

    if (typeof content !== "string") {
      if (Array.isArray(content)) {
        content = content.map((c: any) => c?.text || c?.content || "").join("\n");
      } else {
        content = String(content);
      }
    }

    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```json\s*/i, "");
      cleaned = cleaned.replace(/^```\s*/i, "");
      cleaned = cleaned.replace(/\s*```$/, "");
    }
    console.log("=== 清理后的JSON内容 ===");
    console.log(cleaned);

    const result = JSON.parse(cleaned) as AnalysisResult;
    console.log("=== 解析后的分析结果 ===");
    console.log(result);
    return result;
  } catch (error) {
    console.error("Analysis Error (via 百度千帆 API):", error);
    throw error;
  }
};