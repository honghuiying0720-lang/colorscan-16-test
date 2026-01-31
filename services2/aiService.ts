import { SeasonalProfile, XiaohongshuNote } from '../types2';

// 模型配置 - 从环境变量读取
const DOUBAO_MODEL_ID = import.meta.env.VITE_DOUBAO_MODEL_ID || 'ep-20260122143153-pswzb';
const DEEPSEEK_MODEL_ID = import.meta.env.VITE_DEEPSEEK_MODEL_ID || 'deepseek-reasoner';

export interface AIService {
  generateSeasonalProfile(subtype: string): Promise<SeasonalProfile>;
  generateXiaohongshuNote(profile: SeasonalProfile, promptVersion?: PromptVersion): Promise<XiaohongshuNote>;
  getModelName(): string;
}

export enum ModelType {
  DOUBAO = 'doubao',
  DEEPSEEK = 'deepseek'
}

// 提示词版本类型
export type PromptVersion = 'simple' | 'full';

// 简洁版提示词
function getSimpleXiaohongshuPrompt(profile: SeasonalProfile): string {
  return `# Role
你是一位拥有百万粉丝的小红书穿搭博主和深度色彩营销专家。你擅长将复杂的"四季16型色彩分析"转化为极具吸引力、高情绪价值的小红书种草文案。

# Task
请根据提供的【colorscan16 色彩测试JSON数据】，生成一篇符合小红书调性的爆款笔记。

# Input Data
${JSON.stringify(profile, null, 2)}

# Content Requirements
1. **标题 (Title)**：
   - 包含情绪词或痛点词（如：救命、绝绝子、后悔没早测、显白神色）
   - 必须包含测试结果关键词（如：净春型、冷冬型）
   - 长度在 20 字以内，使用 1-2 个表情符号

2. **正文内容 (Body)**：
   - **第一段 (Hook)**：直击痛点
   - **第二段 (Analysis)**：用口语化方式解读数据
   - **第三段 (Action)**：重点强调【最推荐色】和【避雷色】
   - **第四段 (Makeup/Celeb)**：明星同款背书
   - **结尾 (CTA)**：引导评论区互动

3. **语气调性**：
   - 亲切、闺蜜感、多用感叹号
   - 严禁使用"综上所述"、"首先其次"等AI感明显的词汇
   - 使用小红书热门词汇：氛围感、妈生皮、黄皮救星、伪素颜、高级感

# Output Format (Strict JSON)
{
  "title": "标题内容",
  "content": "正文内容，注意保留换行和表情",
  "tags": ["#个人色彩测试", "#16型人格色彩", "#显白穿搭", "#变美小技巧", "#colorscan16"]
}`;
}

// 完整版提示词（包含74个标题模板）
function getFullXiaohongshuPrompt(profile: SeasonalProfile): string {
  return `# Role

你是一位拥有百万粉丝的小红书穿搭博主和深度色彩营销专家。你擅长将复杂的"四季16型色彩分析"转化为极具吸引力、高情绪价值、且自带流量的小红书爆款笔记。

# Task

请根据提供的【colorscan16 色彩测试JSON数据】，生成一篇符合小红书调性的爆款笔记。

# Workflow (必须严格遵守执行)

1. **第一步：数据拆解**：分析 JSON 中的色彩结果（如：净春型、深秋型等），提取其核心特质（如：高饱和、暖调、浓郁感等）。
2. **第二步：标题策略匹配**：从底部的【74个爆款标题模版库】中，根据该色彩类型的性格逻辑（例如：冷冬适合"高级感/反差"，暖春适合"好气色/初恋感"），挑选最契合的**5个公式**。
3. **第三步：内容创作**：按照下述【Content Requirements】完成正文和标签编写。

# Content Requirements

### 1. 标题 (Title) 生成规则

* **核心要求**：严禁平铺直叙。必须从挑选的 5 个公式中，选出一个**视觉冲击力最强**的。
* **元素包含**：测试结果关键词 + 情绪痛点 + 1-2个表情。
* **字数**：20字以内。

### 2. 正文内容 (Body)

* **第一段 (Hook)**：拒绝废话！用第一人称（我/姐妹们）直击痛点（如：买衣服总显黄、素颜没气色）。
* **第二段 (Analysis)**：口语化解读数据。把专业术语变成人话（如："低明度高彩度" -> "自带电影滤镜的浓郁感"）。
* **第三段 (Action)**：重点列出【最推荐色】和【避雷色】。用"亲测"的口吻建议。
* **第四段 (Makeup/Celeb)**：安利适合的妆容风格或同类型明星，增加说服力。
* **结尾 (CTA)**：引导评论区互动（如："测完你是哪种？评论区我帮你排雷"）。

### 3. 语气调性

* **禁止词汇**：综上所述、首先、其次、总之、不仅如此。
* **高频词汇**：氛围感、妈生皮、黄皮救星、伪素颜、高级感、绝绝子、救命、谁懂啊。

### 4. 标签策略 (Tag Strategy)

按照以下阶梯分布（8-10个）：

* 核心流量词（2-3个）：#色彩测试 #16型人格色彩 #变美小技巧
* 精准分类词（2-3个）：#${profile.subtype} #${profile.season}型人 #色彩分析师
* 场景/痛点词（2-3个）：#显白穿搭 #网购不踩雷 #伪素颜神器

---

# 爆款标题模版参考库

1. 请大数据把XX推给... (例：请大数据把这份显白方案推给所有深秋型姐妹！！)
2. 真的拴Q... (例：真的拴Q！测完才发现我以前买的衣服都白买了...)
3. 我也不想...可是它真的... (例：我也不想心动啊！可是冷冬型穿这个真的太高级了)
4. 不允许还有人不知道... (例：我不允许还有人不知道这个自测显白的秘诀)
5. 救命！/ 绝绝子！ (例：救命！浅春型人换上这个色直接变身伪素颜女神)
6. 0成本/0基础... (例：0成本自测16型色彩，告别黄黑皮！)
7. 偷偷变...惊艳所有人 (例：偷偷换上这些颜色，开学惊艳所有人)
8. 后悔没早发现... (例：后悔没早点测出我是暖秋型！真的好显气色)
9. 建议反复观看... (例：黄皮必看的色彩自测手册！建议反复观看收藏)
10. XXX是我的神... (例：克莱因蓝你是我的神！净冬型姐妹给我冲)
11. **偷偷变……** (例：掌握这几个色彩逻辑，让你偷偷变美惊艳所有人！)
12. **0成本……** (例：0成本自测 16 型色彩，普通女孩翻身变美指南！)
13. **0基础……** (例：0基础搞定穿搭调色，一个公式教你穿出高级感！)
14. **x分钟get……** (例：3分钟get冷夏型显白公式，素颜也能出门了！)
15. **99%的人不知道的……** (例：99%的人不知道的暖冬避雷色，难怪你穿衣总显土！)
16. **这个xxx，我不允许有人不知道。** (例：这个深秋型本命色，我不允许任何一个姐妹不知道！)
17. **自从知道xxx，再也不愁xxx。** (例：自从知道自己是柔夏型，再也不愁买衣服显黄了！)
18. **这个xxx神器，我后悔没早点发现！** (例：这个色彩扫描自测神器，我后悔没早点发现！)
19. **大佬手把手教你xxx。** (例：穿搭大佬手把手教你 16 型色彩怎么搭，小白闭眼入！)
20. **近期大火的xxx，你DNA动了吗？** (例：近期大火的净春色彩学，看完真的DNA动了！)
21. **开挂了！这个新品xxx太牛了。** (例：穿搭审美开挂了！这个冷冬型配色方案太牛了！)
22. **XXX的隐藏用法！你知道几个** (例：大地色系的隐藏显白用法！深秋型人快看过来！)
23. **真正自律的，是那些XXX的人。** (例：真正自律的美女，是那些已经测过色彩并精准穿搭的人！)
24. **同样是XXX，差别居然这么大？** (例：同样是穿白色，冷皮和暖皮差别居然这么大？)
25. **我也不想买xxx啊！可真的太赞了。** (例：我也不想买这种亮粉色啊！可对净冬型来说真的太赞了！)
26. **家人们，强烈推荐这款xxx。** (例：家人们，强烈推荐这款柔秋型必备的氛围感口红！)
27. **藏不住了，xxx好用哭了。** (例：藏不住了，这些显白神色真的好用到哭！)
28. **OMG！被夸爆的xxx在这里。** (例：OMG！被同事夸爆的通勤配色都在这里了！)
29. **救命！我真的太喜欢xxx。** (例：救命！我真的太喜欢这套冷夏型富家千金风了！)
30. **小白必备，有手就会。** (例：四季色彩判断大法，小白必备，有手就会！)
31. **救命！求求你们试试这个！** (例：救命！求求柔春型姐妹去试试这个嫩草绿！)
32. **万万没想到这么好用。** (例：万万没想到，选对肤色色调后整个人都亮了！)
33. **超实用xxx，给我冲啊！** (例：超实用黄皮显白配色总结，给我全家冲啊！)
34. **女生xxx小心机。** (例：女生变美小心机：不同场合的 16 型色彩运用法！)
35. **王炸级xxx，太绝了吧！** (例：王炸级暖秋穿搭，这质感也太绝了吧！)
36. **任何人错过xxx，我都会伤心的。** (例：任何深冬型女孩错过这支口红，我都会伤心的！)
37. **XXX！这是免费能看的吗？** (例：全网最全 16 型色彩干货！这是免费能看的吗？)
38. **熬夜急救XXX！我真的太爱了。** (例：柔夏型熬夜急救配色！穿对衣服真的不显憔悴！)
39. **后悔没有早点用xxx。** (例：后悔没有早点学会四季色彩分析，少走了多少弯路！)
40. **别拉我，我要这个xxx。** (例：别拉我，我要把这个暖春色系焊在身上！)
41. **有被这款xxx惊艳到！** (例：真的有被这款净冬型的蓝紫色惊艳到，高级感拉满！)
42. **人人都能学的xxx。** (例：人人都能学的"妈生皮"显白法，全靠选对色！)
43. **神仙颜值xxx，精致感爆棚。** (例：神仙颜值配色方案，穿上精致感爆棚！)
44. **被问爆的xxx，可盐可甜。** (例：被问了N遍的冷秋穿搭，可盐可甜太飒了！)
45. **不一定斩男，但一定斩女。** (例：这种冷冬型的克莱因蓝，不一定斩男但一定斩女！)
46. **宝子们，我又挖到宝了！** (例：宝子们，我又挖到适合柔秋型女孩的小众宝藏品牌了！)
47. **干货！XX技巧大总结。** (例：干货！16 型人格色彩穿搭技巧大总结！)
48. **XXX的正确打开方式。** (例：莫兰迪色系的正确打开方式，柔夏人必看！)
49. **被问了N遍的xxx，全在这儿了。** (例：被问了N遍的显白公式，今天全在这儿分享了！)
50. **性价比超高的xxx，闭眼入！** (例：性价比超高的百搭色彩手册，学生党闭眼入！)
51. **朋友圈刷屏的XXX，终于找到了** (例：朋友圈刷屏的氛围感色彩大片，原理终于找到了！)
52. **xxx大总结！不知道的进来看！** (例：四季色彩避雷清单大总结！不知道的赶紧进来看！)
53. **卧槽！一不小心发现了xxx秘诀。** (例：卧槽！一不小心发现了柔秋型黑黄皮逆袭的秘诀！)
54. **XXX平价分享！低至X元。** (例：冷夏型平价配饰分享！低至 9.9 元！)
55. **关于XXX的10条真相，你了解吗？** (例：关于色彩分析的 10 条真相，别再被乱收税了！)
56. **这个xxx真的绝了，疯狂打call！** (例：这个净春型的多巴胺穿搭真的绝了，疯狂打call！)
57. **看完这些XXX，瞬间不想努力了。** (例：看完这些冷冬型的高级感搭配，美到不想努力了！)
58. **30天就能让你XXX的宝贝。** (例：30天就能让你审美进阶的色彩训练营！)
59. **靠谱实用的XXX！建议收藏。** (例：最靠谱实用的四季色彩图谱！建议人手收藏一份！)
60. **盘点8个适合XX穿的搭配** (例：盘点 8 个适合暖秋型姐妹穿的复古风搭配！)
61. **听劝改造的第一天……** (例：听劝改造的第一天，找对色彩后我妈都不敢认了！)
62. **不会选衣服？5招教你……** (例：不会选颜色？5 招教你快速锁定本命色！)
63. **2024年为什么你还……？** (例：2024 年了，为什么你还不测试自己的 16 型色彩？)
64. **如果不按这个方法做，你……** (例：如果不按这个方法自测，你买再贵的衣服也显土！)
65. **吐血整理了6种……** (例：吐血整理了 6 种显白天花板色系，黄黑皮速存！)
66. **只有 1% 知道的 xx，却能让你……** (例：只有 1% 知道的肤色对比法，却能让你显白 3 个度！)
67. **你是不是和我一样，xxxx！** (例：你是不是和我一样，明明不黑却总穿得土气沉沉？)
68. **说真话，深秋型人真的……** (例：说真话，深秋型人真的别碰马卡龙色，太灾难了！)
69. **面对面交流，这些颜色……** (例：面试和相亲，穿这些颜色能让你好感度瞬间拉满！)
70. **一针见血！选对颜色到底多重要？** (例：一针见血！选对颜色到底能让你年轻多少岁？)
71. **如果不看这个，你可能一直……** (例：如果不看这个测试，你可能一直都在买让自己显黄的色！)
72. **恨不得马上行动起来！** (例：看完这篇配色攻略，恨不得马上行动起来把衣柜清理了！)
73. **这怎么可能！穿对衣服效果堪比医美？** (例：这怎么可能！穿对颜色后效果真的堪比医美！)
74. **先人一步，掌握明年的流行色逻辑。** (例：先人一步，掌握净冬型的 2026 流行色穿法！)

# Input Data
${JSON.stringify(profile, null, 2)}

# Output Format (Strict JSON)
{
"title_logic": "说明选择了哪个模版编号及理由",
"title": "最终生成的标题",
"content": "正文内容，保留换行和表情",
"tags": ["#标签1", "#标签2"...]
}`;
}

// 根据版本获取提示词
export function getXiaohongshuPrompt(profile: SeasonalProfile, version: PromptVersion = 'simple'): string {
  return version === 'full' ? getFullXiaohongshuPrompt(profile) : getSimpleXiaohongshuPrompt(profile);
}

// 共享的业务逻辑：解析API响应并提取文本
interface APIResponse {
  getText(): string;
}

// 共享的业务逻辑：生成小红书笔记（包含日志和错误处理）
async function generateXiaohongshuNoteWithLogging(
  profile: SeasonalProfile,
  modelName: string,
  apiCall: () => Promise<Response>,
  extractText: (data: any) => string
): Promise<XiaohongshuNote> {
  console.log(`[笔记生成] 开始为 ${profile.subtype} 生成小红书笔记 (使用 ${modelName} 模型)`);
  const startTime = performance.now();

  try {
    console.log(`[笔记生成] 准备发送API请求到 ${modelName}...`);
    const fetchStartTime = performance.now();

    const response = await apiCall();

    const fetchEndTime = performance.now();
    console.log(`[笔记生成] API响应接收完成，耗时 ${(fetchEndTime - fetchStartTime).toFixed(2)}ms`);
    console.log(`[笔记生成] HTTP状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`${modelName} API error: ${errorData.error?.message || response.statusText}`);
    }

    const parseStartTime = performance.now();
    const data = await response.json();
    console.log(`[笔记生成] 响应JSON解析完成，耗时 ${(performance.now() - parseStartTime).toFixed(2)}ms`);

    let text = extractText(data);
    if (!text) throw new Error(`No response text from ${modelName}`);

    console.log(`[笔记生成] 响应文本长度: ${text.length} 字符`);

    // 移除Markdown代码块
    text = text.replace(/^```json\n|^```\n|```$/g, '').trim();

    const jsonParseStartTime = performance.now();
    const note = JSON.parse(text) as XiaohongshuNote;
    console.log(`[笔记生成] 笔记JSON解析完成，耗时 ${(performance.now() - jsonParseStartTime).toFixed(2)}ms`);

    const totalTime = performance.now() - startTime;
    console.log(`[笔记生成] ✅ ${profile.subtype} 的小红书笔记生成完成，总耗时 ${totalTime.toFixed(2)}ms`);
    console.log(`[笔记生成] 笔记标题: ${note.title}`);
    console.log(`[笔记生成] 笔记内容长度: ${note.content.length} 字符`);
    console.log(`[笔记生成] 标签数量: ${note.tags.length}`);

    return note;
  } catch (error) {
    const totalTime = performance.now() - startTime;
    console.error(`[笔记生成] ❌ ${profile.subtype} 的小红书笔记生成失败，耗时 ${totalTime.toFixed(2)}ms`);
    console.error(`[笔记生成] 错误详情:`, error);
    throw error;
  }
}

export class AIServiceFactory {
  static createService(modelType: ModelType): AIService {
    switch (modelType) {
      case ModelType.DOUBAO:
        return new DoubaoService();
      case ModelType.DEEPSEEK:
        return new DeepSeekService();
      default:
        return new DoubaoService();
    }
  }
}

class DoubaoService implements AIService {
  getModelName(): string {
    return 'Doubao';
  }

  async generateSeasonalProfile(subtype: string): Promise<SeasonalProfile> {
    const DOUBAO_API_KEY = import.meta.env.VITE_DOUBAO_API_KEY;
    const DOUBAO_API_URL = "/doubao-api/api/v3/chat/completions";
    const modelId = DOUBAO_MODEL_ID;
    const BASE_PROMPT = `
你是一位专业的色彩分析师，精通「四季16型」个人色彩理论和韩国色彩测试体系。
请生成一个非常典型的 **{{SUBTYPE}}** 类型人物的虚拟色彩分析报告。
请模拟该类型人物最典型的特征数据。

**第一步：五维度评估**
1. **色调 (Temperature)**：给出 0-100 的分数（0=极冷，100=极暖）
2. **明度 (Value)**：给出 0-100 的分数（0=极深，100=极浅）
3. **彩度 (Chroma)**：给出 0-100 的分数（0=极低饱和，100=极高饱和）
4. **清浊 (Clarity)**：给出 0-100 的分数（0=极浊，100=极清）
5. **对比度 (Contrast)**：给出 0-100 的分数（0=极低对比，100=极高对比）

**第二步：部位色号分析（必须提供）**
请提供该类型典型的6个部位的颜色色号（十六进制格式 #RRGGBB）：
1. 前额
2. 脸颊
3. 颈部/胸口
4. 自然发色
5. 瞳孔颜色
6. 唇色

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

    console.log(`=== Starting regeneration for ${subtype} with Doubao ===`);
    const startTime = performance.now();

    const prompt = BASE_PROMPT.replace('{{SUBTYPE}}', subtype);
    console.log(`Prompt prepared in ${(performance.now() - startTime).toFixed(2)}ms`);

    // ========== 调试日志：打印完整提示词 ==========
    console.log(`\n========== [${subtype}] 发送给AI的完整提示词 ==========`);
    console.log(prompt);
    console.log(`========== 提示词结束 ==========\n`);

    try {
      const fetchStartTime = performance.now();
      console.log(`Sending API request to Doubao for ${subtype}...`);

      const response = await fetch(DOUBAO_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DOUBAO_API_KEY}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that generates seasonal color profiles in JSON format. Please return only pure JSON without any Markdown formatting.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          response_format: {
            type: 'text'
          }
        })
      });

      const fetchEndTime = performance.now();
      console.log(`API response received in ${(fetchEndTime - fetchStartTime).toFixed(2)}ms`);
      console.log(`HTTP status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Doubao API error: ${errorData.error?.message || response.statusText}`);
      }

      const parseStartTime = performance.now();
      const data = await response.json();

      // ========== 调试日志：打印AI原始响应 ==========
      console.log(`\n========== [${subtype}] AI原始响应数据 ==========`);
      console.log(JSON.stringify(data, null, 2));
      console.log(`========== 原始响应结束 ==========\n`);

      console.log(`Response JSON parsed in ${(performance.now() - parseStartTime).toFixed(2)}ms`);

      let text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error("No response text from Doubao");

      console.log(`Response text length: ${text.length} characters`);

      // Remove Markdown code blocks if present
      text = text.replace(/^```json\n|^```\n|```$/g, '').trim();

      // ========== 调试日志：打印清理后的文本 ==========
      console.log(`\n========== [${subtype}] 清理后的JSON文本 ==========`);
      console.log(text);
      console.log(`========== 清理后文本结束 ==========\n`);

      // Parse JSON
      const jsonParseStartTime = performance.now();
      const profile = JSON.parse(text) as SeasonalProfile;

      // ========== 调试日志：打印解析后的完整数据 ==========
      console.log(`\n========== [${subtype}] 解析后的完整数据 ==========`);
      console.log(JSON.stringify(profile, null, 2));
      console.log(`========== 完整数据结束 ==========\n`);

      console.log(`Profile JSON parsed in ${(performance.now() - jsonParseStartTime).toFixed(2)}ms`);

      // Safety Check: Ensure subtype matches what we asked for
      profile.subtype = subtype;

      const totalTime = performance.now() - startTime;
      console.log(`=== Regeneration for ${subtype} completed in ${totalTime.toFixed(2)}ms ===`);
      console.log(`Generated profile:`, {
        subtype: profile.subtype,
        season: profile.season,
        temperature: profile.temperature,
        contrast: profile.contrast,
        recommendedColors: profile.recommended_colors?.length || 0,
        avoidColors: profile.avoid_colors?.length || 0
      });

      return profile;
    } catch (error) {
      const totalTime = performance.now() - startTime;
      console.error(`=== Regeneration for ${subtype} failed in ${totalTime.toFixed(2)}ms ===`);
      console.error(`Error generating profile for ${subtype}:`, error);
      throw error;
    }
  }

  async generateXiaohongshuNote(profile: SeasonalProfile, promptVersion: PromptVersion = 'simple'): Promise<XiaohongshuNote> {
    const DOUBAO_API_KEY = import.meta.env.VITE_DOUBAO_API_KEY;
    const DOUBAO_API_URL = "/doubao-api/api/v3/chat/completions";
    const modelId = DOUBAO_MODEL_ID;
    const prompt = getXiaohongshuPrompt(profile, promptVersion);

    return generateXiaohongshuNoteWithLogging(
      profile,
      'Doubao',
      async () => {
        return await fetch(DOUBAO_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DOUBAO_API_KEY}`,
          },
          body: JSON.stringify({
            model: modelId,
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant that generates Xiaohongshu notes in JSON format. Please return only pure JSON without any Markdown formatting.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.8,
            response_format: {
              type: 'text'
            }
          })
        });
      },
      (data) => data.choices?.[0]?.message?.content
    );
  }
}

class DeepSeekService implements AIService {
  getModelName(): string {
    return 'DeepSeek';
  }

  async generateSeasonalProfile(subtype: string): Promise<SeasonalProfile> {
    const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
    const DEEPSEEK_API_URL = "/deepseek-api/v1/chat/completions";
    const modelId = DEEPSEEK_MODEL_ID;
    const BASE_PROMPT = `
你是一位专业的色彩分析师，精通「四季16型」个人色彩理论和韩国色彩测试体系。
请生成一个非常典型的 **{{SUBTYPE}}** 类型人物的虚拟色彩分析报告。
请模拟该类型人物最典型的特征数据。

**第一步：五维度评估**
1. **色调 (Temperature)**：给出 0-100 的分数（0=极冷，100=极暖）
2. **明度 (Value)**：给出 0-100 的分数（0=极深，100=极浅）
3. **彩度 (Chroma)**：给出 0-100 的分数（0=极低饱和，100=极高饱和）
4. **清浊 (Clarity)**：给出 0-100 的分数（0=极浊，100=极清）
5. **对比度 (Contrast)**：给出 0-100 的分数（0=极低对比，100=极高对比）

**第二步：部位色号分析（必须提供）**
请提供该类型典型的6个部位的颜色色号（十六进制格式 #RRGGBB）：
1. 前额
2. 脸颊
3. 颈部/胸口
4. 自然发色
5. 瞳孔颜色
6. 唇色

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

    console.log(`=== Starting regeneration for ${subtype} with DeepSeek ===`);
    const startTime = performance.now();

    const prompt = BASE_PROMPT.replace('{{SUBTYPE}}', subtype);
    console.log(`Prompt prepared in ${(performance.now() - startTime).toFixed(2)}ms`);

    // ========== 调试日志：打印完整提示词 ==========
    console.log(`\n========== [${subtype}] 发送给AI的完整提示词 ==========`);
    console.log(prompt);
    console.log(`========== 提示词结束 ==========\n`);

    try {
      const fetchStartTime = performance.now();
      console.log(`Sending API request to DeepSeek for ${subtype}...`);

      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that generates seasonal color profiles in JSON format. Please return only pure JSON without any Markdown formatting.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7
        })
      });

      const fetchEndTime = performance.now();
      console.log(`API response received in ${(fetchEndTime - fetchStartTime).toFixed(2)}ms`);
      console.log(`HTTP status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DeepSeek API error: ${errorData.error?.message || response.statusText}`);
      }

      const parseStartTime = performance.now();
      const data = await response.json();

      // ========== 调试日志：打印AI原始响应 ==========
      console.log(`\n========== [${subtype}] AI原始响应数据 ==========`);
      console.log(JSON.stringify(data, null, 2));
      console.log(`========== 原始响应结束 ==========\n`);

      console.log(`Response JSON parsed in ${(performance.now() - parseStartTime).toFixed(2)}ms`);

      let text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error("No response text from DeepSeek");

      console.log(`Response text length: ${text.length} characters`);

      // Remove Markdown code blocks if present
      text = text.replace(/^```json\n|^```\n|```$/g, '').trim();

      // ========== 调试日志：打印清理后的文本 ==========
      console.log(`\n========== [${subtype}] 清理后的JSON文本 ==========`);
      console.log(text);
      console.log(`========== 清理后文本结束 ==========\n`);

      // Parse JSON
      const jsonParseStartTime = performance.now();
      const profile = JSON.parse(text) as SeasonalProfile;

      // ========== 调试日志：打印解析后的完整数据 ==========
      console.log(`\n========== [${subtype}] 解析后的完整数据 ==========`);
      console.log(JSON.stringify(profile, null, 2));
      console.log(`========== 完整数据结束 ==========\n`);

      console.log(`Profile JSON parsed in ${(performance.now() - jsonParseStartTime).toFixed(2)}ms`);

      // Safety Check: Ensure subtype matches what we asked for
      profile.subtype = subtype;

      const totalTime = performance.now() - startTime;
      console.log(`=== Regeneration for ${subtype} completed in ${totalTime.toFixed(2)}ms ===`);
      console.log(`Generated profile:`, {
        subtype: profile.subtype,
        season: profile.season,
        temperature: profile.temperature,
        contrast: profile.contrast,
        recommendedColors: profile.recommended_colors?.length || 0,
        avoidColors: profile.avoid_colors?.length || 0
      });

      return profile;
    } catch (error) {
      const totalTime = performance.now() - startTime;
      console.error(`=== Regeneration for ${subtype} failed in ${totalTime.toFixed(2)}ms ===`);
      console.error(`Error generating profile for ${subtype}:`, error);
      throw error;
    }
  }

  async generateXiaohongshuNote(profile: SeasonalProfile, promptVersion: PromptVersion = 'simple'): Promise<XiaohongshuNote> {
    const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
    const DEEPSEEK_API_URL = "/deepseek-api/v1/chat/completions";
    const modelId = DEEPSEEK_MODEL_ID;
    const prompt = getXiaohongshuPrompt(profile, promptVersion);

    return generateXiaohongshuNoteWithLogging(
      profile,
      'DeepSeek',
      async () => {
        return await fetch(DEEPSEEK_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: modelId,
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant that generates Xiaohongshu notes in JSON format. Please return only pure JSON without any Markdown formatting.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.8
          })
        });
      },
      (data) => data.choices?.[0]?.message?.content
    );
  }
}
