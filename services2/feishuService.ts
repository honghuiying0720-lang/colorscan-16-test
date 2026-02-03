import { XiaohongshuNote, SeasonalProfile, ALL_SUBTYPES } from '../types2';
import { AnalysisResult } from '../types';

// 飞书多维表格配置 - 从环境变量读取
const FEISHU_BASE_ID = import.meta.env.VITE_FEISHU_BASE_ID || '';
const FEISHU_TABLE_ID = import.meta.env.VITE_FEISHU_TABLE_ID || '';
// 使用代理路径避免 CORS 问题
const FEISHU_API_BASE = '/feishu-api';

// 飞书应用凭证配置 - 从环境变量读取
// 获取方式：访问 https://open.feishu.cn/ -> 创建企业自建应用 -> 获取 App ID 和 App Secret
const FEISHU_APP_ID = import.meta.env.VITE_FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = import.meta.env.VITE_FEISHU_APP_SECRET || '';

// 获取飞书访问令牌
async function getFeishuAccessToken(): Promise<string> {
  if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
    throw new Error(
      '飞书APP_ID和APP_SECRET未配置。\n' +
      '请在 .env.local 文件中添加以下配置：\n\n' +
      '# 飞书应用凭证\n' +
      'VITE_FEISHU_APP_ID=your_app_id\n' +
      'VITE_FEISHU_APP_SECRET=your_app_secret\n\n' +
      '# 飞书多维表格ID\n' +
      'VITE_FEISHU_BASE_ID=your_base_id\n' +
      'VITE_FEISHU_TABLE_ID=your_table_id\n\n' +
      '获取凭证：访问 https://open.feishu.cn/ 创建企业自建应用'
    );
  }

  try {
    const response = await fetch(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`获取飞书访问令牌失败: ${errorData.msg || response.statusText}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(`获取飞书访问令牌失败: ${data.msg || '未知错误'}`);
    }

    return data.tenant_access_token;
  } catch (error: any) {
    console.error('[飞书服务] 获取访问令牌失败:', error);
    throw new Error(`获取飞书访问令牌失败: ${error.message}`);
  }
}

// 获取表格字段信息（用于确定字段ID）
async function getTableFields(accessToken: string): Promise<Record<string, string>> {
  if (!FEISHU_BASE_ID || !FEISHU_TABLE_ID) {
    throw new Error(
      '飞书多维表格ID未配置。\n' +
      '请在 .env.local 文件中添加以下配置：\n\n' +
      'VITE_FEISHU_BASE_ID=your_base_id\n' +
      'VITE_FEISHU_TABLE_ID=your_table_id\n\n' +
      '获取方式：在飞书多维表格URL中获取，或在表格设置中查看'
    );
  }

  try {
    const response = await fetch(
      `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_BASE_ID}/tables/${FEISHU_TABLE_ID}/fields`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`获取表格字段失败: ${errorData.msg || response.statusText}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(`获取表格字段失败: ${data.msg || '未知错误'}`);
    }

    // 输出所有字段信息用于调试
    console.log('[飞书同步] 表格所有字段信息:', JSON.stringify(data.data?.items, null, 2));

    // 将字段名映射到字段名（中文）和类型
    // 注意：根据 Python 脚本，飞书API创建记录时应该使用字段名（中文），而不是字段ID
    const fieldMap: Record<string, string> = {};
    const fieldTypes: Record<string, string> = {}; // 保存字段类型

    if (data.data?.items) {
      data.data.items.forEach((field: any) => {
        // 支持多种可能的字段名（中英文）
        const fieldName = (field.field_name || '').toLowerCase();
        const fieldNameZh = field.field_name || ''; // 原始字段名（中文）
        const fieldType = field.type || '';

        // 简短标题字段匹配（必须在标题之前，因为"简短标题"包含"标题"）
        if (fieldName.includes('简短') || fieldName.includes('short') ||
            fieldNameZh.includes('简短') || fieldNameZh.includes('简短标题')) {
          if (!fieldMap['shorttitle']) {
            fieldMap['shorttitle'] = fieldNameZh; // 使用原始字段名（中文）
            fieldTypes['shorttitle'] = fieldType;
            console.log('[飞书同步] ✅ 找到简短标题字段:', fieldNameZh, '类型:', fieldType);
          }
        }
        // 标题字段匹配
        else if (fieldName.includes('标题') || fieldName.includes('title') ||
                 fieldNameZh.includes('标题')) {
          if (!fieldMap['title']) {
            fieldMap['title'] = fieldNameZh; // 使用原始字段名（中文）
            fieldTypes['title'] = fieldType;
          }
        }
        // 正文/内容字段匹配
        else if (fieldName.includes('正文') || fieldName.includes('内容') ||
                 fieldName.includes('content') || fieldName.includes('body') ||
                 fieldNameZh.includes('正文') || fieldNameZh.includes('内容')) {
          if (!fieldMap['content']) {
            fieldMap['content'] = fieldNameZh; // 使用原始字段名（中文）
            fieldTypes['content'] = fieldType;
          }
        }
        // 标签字段匹配
        else if (fieldName.includes('标签') || fieldName.includes('tag') ||
                 fieldNameZh.includes('标签')) {
          if (!fieldMap['tags']) {
            fieldMap['tags'] = fieldNameZh; // 使用原始字段名（中文）
            fieldTypes['tags'] = fieldType;
          }
        }
        // 序号字段匹配
        else if (fieldName.includes('序号') || fieldName.includes('顺序') ||
                 fieldName.includes('order') || fieldName.includes('index') ||
                 fieldName.includes('number') || fieldNameZh.includes('序号') ||
                 fieldNameZh.includes('顺序')) {
          if (!fieldMap['order']) {
            fieldMap['order'] = fieldNameZh; // 使用原始字段名（中文）
            fieldTypes['order'] = fieldType;
          }
        }
        // 完整JSON数据字段匹配 (识别 "ai返回的json数据" 字段)
        else if (fieldName.includes('ai') || fieldName.includes('json') ||
                 fieldName.includes('返回') || fieldName.includes('数据') ||
                 fieldNameZh.includes('AI') || fieldNameZh.includes('返回') ||
                 fieldNameZh.includes('ai返回') || fieldNameZh.includes('json数据') ||
                 fieldNameZh === 'ai返回的json数据') {
          if (!fieldMap['json_data']) {
            fieldMap['json_data'] = fieldNameZh; // 使用原始字段名（中文）
            fieldTypes['json_data'] = fieldType;
            console.log('[飞书同步] ✅ 找到JSON数据字段:', fieldNameZh, '类型:', fieldType);
          }
        }
        // 更新时间字段匹配
        else if (fieldName.includes('更新时间') || fieldName.includes('update') || fieldName.includes('time') ||
                 fieldNameZh.includes('更新时间') || fieldNameZh.includes('更新')) {
          if (!fieldMap['update_time']) {
            fieldMap['update_time'] = fieldNameZh; // 使用原始字段名（中文）
            fieldTypes['update_time'] = fieldType;
            console.log('[飞书同步] ✅ 找到更新时间字段:', fieldNameZh, '类型:', fieldType);
          }
        }
      });
    }

    console.log('[飞书同步] 字段映射结果（使用字段名）:', fieldMap);
    console.log('[飞书同步] 字段类型:', fieldTypes);

    // 将字段类型信息附加到 fieldMap 中（使用特殊键）
    (fieldMap as any).__types = fieldTypes;

    return fieldMap;
  } catch (error: any) {
    console.error('[飞书服务] 获取表格字段失败:', error);
    throw error;
  }
}

// 获取所有现有记录
async function getAllRecords(accessToken: string): Promise<any[]> {
  try {
    const response = await fetch(
      `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_BASE_ID}/tables/${FEISHU_TABLE_ID}/records?page_size=100`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`获取现有记录失败: ${errorData.msg || response.statusText}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(`获取现有记录失败: ${data.msg || '未知错误'}`);
    }

    const records = data.data?.items || [];
    // 按创建时间排序（从旧到新），确保顺序一致
    records.sort((a: any, b: any) => (a.created_time || 0) - (b.created_time || 0));

    console.log(`[飞书同步] 获取到 ${records.length} 条现有记录`);
    return records;
  } catch (error: any) {
    console.error('[飞书同步] 获取现有记录失败:', error);
    return [];
  }
}

// 生成格式化的时间字符串，格式：20260105-1212
function getFormattedUpdateTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}-${hour}${minute}`;
}

// 更新记录
async function updateRecord(
  accessToken: string,
  recordId: string,
  fieldMap: Record<string, string>,
  order: number,
  note: XiaohongshuNote
): Promise<void> {
  // 获取字段类型信息
  const fieldTypes = (fieldMap as any).__types || {};

  // 构建记录数据
  const fields: Record<string, any> = {};

  // 设置标题（文本类型）
  if (fieldMap['title']) {
    fields[fieldMap['title']] = note.title;
  }

  // 设置简短标题
  if (fieldMap['shorttitle'] && note.shorttitle) {
    fields[fieldMap['shorttitle']] = note.shorttitle;
  }

  // 设置正文（多行文本类型）
  if (fieldMap['content']) {
    fields[fieldMap['content']] = note.content;
  }

  // 设置标签
  if (fieldMap['tags']) {
    const tagType = fieldTypes['tags'];
    // 根据字段类型处理标签
    if (tagType === 15) { // 15 是多行文本
      fields[fieldMap['tags']] = note.tags.join('\n');
    } else if (tagType === 2) { // 2 是文本
      fields[fieldMap['tags']] = note.tags.join(' ');
    } else {
      // 默认用空格连接
      fields[fieldMap['tags']] = note.tags.join(' ');
    }
  }

  // 设置序号（数字类型）
  if (fieldMap['order']) {
    const orderType = fieldTypes['order'];
    if (orderType === 2) { // 2 是数字类型
      fields[fieldMap['order']] = order;
    } else {
      // 如果不是数字类型，尝试作为文本
      fields[fieldMap['order']] = String(order);
    }
  }

  // 设置更新时间（格式：20260105-1212）
  if (fieldMap['update_time']) {
    fields[fieldMap['update_time']] = getFormattedUpdateTime();
    console.log(`[飞书同步] ✅ 设置更新时间: ${getFormattedUpdateTime()}`);
  }

  const updateResponse = await fetch(
    `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_BASE_ID}/tables/${FEISHU_TABLE_ID}/records/${recordId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields,
      }),
    }
  );

  if (!updateResponse.ok) {
    const errorData = await updateResponse.json().catch(() => ({}));
    throw new Error(`更新飞书记录失败: ${errorData.msg || updateResponse.statusText}`);
  }

  const updateData = await updateResponse.json();
  if (updateData.code !== 0) {
    console.error('[飞书同步] 更新记录失败，完整错误信息:', JSON.stringify(updateData, null, 2));
    throw new Error(`更新飞书记录失败: ${updateData.msg || updateData.error?.msg || '未知错误'} (错误码: ${updateData.code})`);
  }

  console.log(`[飞书同步] ✅ 已更新第 ${order} 条记录 (${recordId})`);
}

// 创建新记录
async function createRecord(
  accessToken: string,
  fieldMap: Record<string, string>,
  order: number,
  note: XiaohongshuNote
): Promise<void> {
  // 获取字段类型信息
  const fieldTypes = (fieldMap as any).__types || {};

  // 构建记录数据
  const fields: Record<string, any> = {};

  // 设置标题（文本类型）
  if (fieldMap['title']) {
    fields[fieldMap['title']] = note.title;
  }

  // 设置简短标题
  if (fieldMap['shorttitle'] && note.shorttitle) {
    fields[fieldMap['shorttitle']] = note.shorttitle;
  }

  // 设置正文（多行文本类型）
  if (fieldMap['content']) {
    fields[fieldMap['content']] = note.content;
  }

  // 设置标签
  if (fieldMap['tags']) {
    const tagType = fieldTypes['tags'];
    // 根据字段类型处理标签
    if (tagType === 15) { // 15 是多行文本
      fields[fieldMap['tags']] = note.tags.join('\n');
    } else if (tagType === 2) { // 2 是文本
      fields[fieldMap['tags']] = note.tags.join(' ');
    } else {
      // 默认用空格连接
      fields[fieldMap['tags']] = note.tags.join(' ');
    }
  }

  // 设置序号（数字类型）
  if (fieldMap['order']) {
    const orderType = fieldTypes['order'];
    if (orderType === 2) { // 2 是数字类型
      fields[fieldMap['order']] = order;
    } else {
      // 如果不是数字类型，尝试作为文本
      fields[fieldMap['order']] = String(order);
    }
  }

  // 设置更新时间（格式：20260105-1212）
  if (fieldMap['update_time']) {
    fields[fieldMap['update_time']] = getFormattedUpdateTime();
    console.log(`[飞书同步] ✅ 设置更新时间: ${getFormattedUpdateTime()}`);
  }

  const createResponse = await fetch(
    `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_BASE_ID}/tables/${FEISHU_TABLE_ID}/records`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields,
      }),
    }
  );

  if (!createResponse.ok) {
    const errorData = await createResponse.json().catch(() => ({}));
    throw new Error(`创建飞书记录失败: ${errorData.msg || createResponse.statusText}`);
  }

  const createData = await createResponse.json();
  if (createData.code !== 0) {
    console.error('[飞书同步] 创建记录失败，完整错误信息:', JSON.stringify(createData, null, 2));
    throw new Error(`创建飞书记录失败: ${createData.msg || createData.error?.msg || '未知错误'} (错误码: ${createData.code})`);
  }

  console.log(`[飞书同步] ✅ 已创建第 ${order} 条记录`);
}

// 批量同步所有笔记到飞书表格
export async function syncNotesToFeishu(
  notes: Record<string, XiaohongshuNote>
): Promise<{ success: number; failed: number; errors: string[] }> {
  console.log('[飞书同步] 开始同步笔记到飞书多维表格...');
  const startTime = performance.now();

  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  try {
    // 获取访问令牌
    const accessToken = await getFeishuAccessToken();
    console.log('[飞书同步] 访问令牌获取成功');

    // 获取表格字段映射
    const fieldMap = await getTableFields(accessToken);
    console.log('[飞书同步] 表格字段映射:', fieldMap);

    if (!fieldMap['title'] || !fieldMap['content']) {
      throw new Error('表格中未找到"标题"或"正文"字段，请检查表格字段名称');
    }

    // 获取所有现有记录
    const existingRecords = await getAllRecords(accessToken);
    console.log(`[飞书同步] 现有记录数: ${existingRecords.length}`);

    // 输出16种类型的编号对应关系
    console.log('[飞书同步] 16种类型编号对应关系:');
    ALL_SUBTYPES.forEach((subtype, index) => {
      console.log(`  序号 ${index + 1} -> ${subtype} (对应第 ${index + 1} 行)`);
    });

    // 按照ALL_SUBTYPES的顺序同步（1-16）
    for (let i = 0; i < ALL_SUBTYPES.length; i++) {
      const subtype = ALL_SUBTYPES[i];
      const order = i + 1; // 1-16

      if (!notes[subtype]) {
        console.warn(`[飞书同步] ⚠️ 第 ${order} 条记录 (${subtype}) 没有笔记数据，跳过`);
        failedCount++;
        errors.push(`第 ${order} 条 (${subtype}): 没有笔记数据`);
        continue;
      }

      try {
        // 如果存在对应顺序的记录，则更新；否则创建新记录
        if (i < existingRecords.length) {
          // 更新现有记录（第1行对应第1种类型，第2行对应第2种类型...）
          const recordId = existingRecords[i].record_id;
          await updateRecord(accessToken, recordId, fieldMap, order, notes[subtype]);
          console.log(`[飞书同步] ✅ 已更新第 ${order} 行 (${subtype})`);
        } else {
          // 记录数不足，创建新记录
          await createRecord(accessToken, fieldMap, order, notes[subtype]);
          console.log(`[飞书同步] ✅ 已创建第 ${order} 行 (${subtype})`);
        }
        successCount++;

        // 添加延迟，避免请求过快
        if (i < ALL_SUBTYPES.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error: any) {
        failedCount++;
        const errorMsg = `第 ${order} 条 (${subtype}): ${error.message}`;
        errors.push(errorMsg);
        console.error(`[飞书同步] ${errorMsg}`);
      }
    }

    const totalTime = performance.now() - startTime;
    console.log(`[飞书同步] 同步完成！成功: ${successCount}, 失败: ${failedCount}, 耗时: ${totalTime.toFixed(2)}ms`);

    return {
      success: successCount,
      failed: failedCount,
      errors,
    };
  } catch (error: any) {
    console.error('[飞书同步] 同步过程出错:', error);
    throw error;
  }
}

// 同步单个笔记到飞书表格
export async function syncSingleNoteToFeishu(
  subtype: string,
  note: XiaohongshuNote
): Promise<void> {
  const order = ALL_SUBTYPES.indexOf(subtype) + 1;
  if (order === 0) {
    throw new Error(`未知的色彩类型: ${subtype}`);
  }

  console.log(`[飞书同步] 同步 ${subtype} -> 序号 ${order} (对应第 ${order} 行)`);

  try {
    const accessToken = await getFeishuAccessToken();
    const fieldMap = await getTableFields(accessToken);

    // 获取所有现有记录
    const existingRecords = await getAllRecords(accessToken);
    console.log(`[飞书同步] 现有记录数: ${existingRecords.length}`);

    // 如果存在对应顺序的记录，则更新；否则创建新记录
    if (order <= existingRecords.length) {
      // 第 order 行对应索引 order - 1
      const recordId = existingRecords[order - 1].record_id;
      await updateRecord(accessToken, recordId, fieldMap, order, note);
      console.log(`[飞书同步] ✅ 已更新第 ${order} 行 (${subtype}, 序号 ${order})`);
    } else {
      await createRecord(accessToken, fieldMap, order, note);
      console.log(`[飞书同步] ✅ 已创建第 ${order} 行 (${subtype}, 序号 ${order})`);
    }
  } catch (error: any) {
    console.error(`[飞书同步] ❌ 同步 ${subtype} (序号 ${order}) 的笔记失败:`, error);
    throw error;
  }
}

// 测试同步功能（使用测试数据）
export async function testSyncToFeishu(): Promise<void> {
  const testNote: XiaohongshuNote = {
    title: '救命！测出净春型，显白绝绝子！🌸',
    shorttitle: '净春型显白绝绝子！',
    content: `总觉得自己穿衣服显土？颜色选不对，气质全无！

原来我是净春型！测试数据超惊喜：温度80，自带暖阳感，明度70，色度85，清晰度90，对比度80，简直是妈生皮的天选之女，元气满满！

最推荐蜜桃粉和珊瑚橙，黄皮救星，高级感满满，穿对秒变伪素颜美女！避雷纯黑色和柔灰色，穿错显黄又老气，姐妹们一定要绕道！

明星同款来背书！金泰熙的珊瑚粉穿搭，刘亦菲的天蓝色造型，孙艺珍的柠檬黄，学起来氛围感爆棚！

快来评论区分享你的色彩类型吧，一起做显白小仙女！💕`,
    tags: ['#个人色彩测试', '#16型人格色彩', '#显白穿搭', '#变美小技巧', '#colorscan16']
  };

  console.log('[飞书测试] 开始测试同步功能...');
  try {
    await syncSingleNoteToFeishu('clear_spring', testNote);
    console.log('[飞书测试] ✅ 测试成功！');
  } catch (error: any) {
    console.error('[飞书测试] ❌ 测试失败:', error);
    throw error;
  }
}

// ==================== 同步 Profile 数据到飞书 ====================

// 同步单个 SeasonalProfile 到飞书表格的 "ai返回的json数据" 字段
export async function syncProfileToFeishu(
  profile: SeasonalProfile,
  note?: XiaohongshuNote
): Promise<void> {
  const order = ALL_SUBTYPES.indexOf(profile.subtype) + 1;
  if (order === 0) {
    throw new Error(`未知的色彩类型: ${profile.subtype}`);
  }

  console.log(`[飞书同步Profile] 同步 ${profile.subtype} -> 序号 ${order} (对应第 ${order} 行)`);

  try {
    const accessToken = await getFeishuAccessToken();
    const fieldMap = await getTableFields(accessToken);

    // 获取字段类型
    const fieldTypes = (fieldMap as any).__types || {};

    // 检查是否有 JSON 数据字段
    if (!fieldMap['json_data']) {
      console.warn('[飞书同步Profile] 未找到"ai返回的json数据"字段，跳过同步');
      return;
    }

    // 获取所有现有记录
    const existingRecords = await getAllRecords(accessToken);
    console.log(`[飞书同步Profile] 现有记录数: ${existingRecords.length}`);

    // 构建记录数据
    const fields: Record<string, any> = {};

    // 设置 JSON 数据
    const jsonDataType = fieldTypes['json_data'];
    if (jsonDataType === 15) { // 15 是多行文本类型
      fields[fieldMap['json_data']] = JSON.stringify(profile, null, 2);
    } else {
      // 默认用多行文本存储
      fields[fieldMap['json_data']] = JSON.stringify(profile, null, 2);
    }

    // 如果有笔记数据，也同步更新笔记字段
    if (note) {
      // 设置标题
      if (fieldMap['title']) {
        fields[fieldMap['title']] = note.title;
      }
      // 设置简短标题
      if (fieldMap['shorttitle'] && note.shorttitle) {
        fields[fieldMap['shorttitle']] = note.shorttitle;
      }
      // 设置正文
      if (fieldMap['content']) {
        fields[fieldMap['content']] = note.content;
      }
      // 设置标签
      if (fieldMap['tags']) {
        fields[fieldMap['tags']] = note.tags.join('\n');
      }
    }

    // 设置更新时间（格式：20260105-1212）
    if (fieldMap['update_time']) {
      fields[fieldMap['update_time']] = getFormattedUpdateTime();
      console.log(`[飞书同步Profile] ✅ 设置更新时间: ${getFormattedUpdateTime()}`);
    }

    // 如果存在对应顺序的记录，则更新；否则创建新记录
    if (order <= existingRecords.length) {
      const recordId = existingRecords[order - 1].record_id;

      // 更新记录
      const updateResponse = await fetch(
        `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_BASE_ID}/tables/${FEISHU_TABLE_ID}/records/${recordId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields }),
        }
      );

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}));
        throw new Error(`更新飞书记录失败: ${errorData.msg || updateResponse.statusText}`);
      }

      const updateData = await updateResponse.json();
      if (updateData.code !== 0) {
        throw new Error(`更新飞书记录失败: ${updateData.msg || '未知错误'}`);
      }

      console.log(`[飞书同步Profile] ✅ 已更新第 ${order} 行 (${profile.subtype})`);
    } else {
      // 创建新记录
      const createResponse = await fetch(
        `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_BASE_ID}/tables/${FEISHU_TABLE_ID}/records`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields }),
        }
      );

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        throw new Error(`创建飞书记录失败: ${errorData.msg || createResponse.statusText}`);
      }

      const createData = await createResponse.json();
      if (createData.code !== 0) {
        throw new Error(`创建飞书记录失败: ${createData.msg || '未知错误'}`);
      }

      console.log(`[飞书同步Profile] ✅ 已创建第 ${order} 行 (${profile.subtype})`);
    }
  } catch (error: any) {
    console.error(`[飞书同步Profile] ❌ 同步 ${profile.subtype} 失败:`, error);
    throw error;
  }
}

// 批量同步所有 SeasonalProfile 到飞书表格
// 优化版：只同步传入的 profiles，不遍历所有16种类型
export async function syncAllProfilesToFeishu(
  profiles: SeasonalProfile[],
  notes: Record<string, XiaohongshuNote>
): Promise<{ success: number; failed: number; errors: string[] }> {
  console.log(`[飞书同步Profile] 开始批量同步 ${profiles.length} 个 profiles 到飞书...`);
  const startTime = performance.now();

  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  try {
    // 获取访问令牌
    const accessToken = await getFeishuAccessToken();
    const fieldMap = await getTableFields(accessToken);

    if (!fieldMap['json_data']) {
      throw new Error('表格中未找到"ai返回的json数据"字段，请检查表格字段名称');
    }

    // 获取所有现有记录
    const existingRecords = await getAllRecords(accessToken);
    console.log(`[飞书同步Profile] 现有记录数: ${existingRecords.length}`);

    // 获取字段类型
    const fieldTypes = (fieldMap as any).__types || {};

    // 只处理传入的 profiles，不再遍历所有16种类型
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      const order = ALL_SUBTYPES.indexOf(profile.subtype) + 1;

      if (order === 0) {
        console.warn(`[飞书同步Profile] ⚠️ 跳过未知的色彩类型: ${profile.subtype}`);
        continue;
      }

      try {
        const note = notes[profile.subtype];

        // 构建记录数据
        const fields: Record<string, any> = {};

        // 设置 JSON 数据
        fields[fieldMap['json_data']] = JSON.stringify(profile, null, 2);

        // 如果有笔记数据，同步笔记字段
        if (note) {
          if (fieldMap['title']) fields[fieldMap['title']] = note.title;
          if (fieldMap['shorttitle'] && note.shorttitle) fields[fieldMap['shorttitle']] = note.shorttitle;
          if (fieldMap['content']) fields[fieldMap['content']] = note.content;
          if (fieldMap['tags']) fields[fieldMap['tags']] = note.tags.join('\n');
        }

        // 设置更新时间（格式：20260105-1212）
        if (fieldMap['update_time']) {
          fields[fieldMap['update_time']] = getFormattedUpdateTime();
          console.log(`[飞书同步Profile] ✅ 设置更新时间: ${getFormattedUpdateTime()}`);
        }

        // 如果存在对应顺序的记录，则更新；否则创建新记录
        if (order <= existingRecords.length) {
          const recordId = existingRecords[order - 1].record_id;

          const updateResponse = await fetch(
            `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_BASE_ID}/tables/${FEISHU_TABLE_ID}/records/${recordId}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ fields }),
            }
          );

          if (!updateResponse.ok) {
            throw new Error(`更新失败: ${updateResponse.statusText}`);
          }

          const updateData = await updateResponse.json();
          if (updateData.code !== 0) {
            throw new Error(updateData.msg || '未知错误');
          }

          console.log(`[飞书同步Profile] ✅ 已更新第 ${order} 行 (${profile.subtype})`);
        } else {
          const createResponse = await fetch(
            `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_BASE_ID}/tables/${FEISHU_TABLE_ID}/records`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ fields }),
            }
          );

          if (!createResponse.ok) {
            throw new Error(`创建失败: ${createResponse.statusText}`);
          }

          const createData = await createResponse.json();
          if (createData.code !== 0) {
            throw new Error(createData.msg || '未知错误');
          }

          console.log(`[飞书同步Profile] ✅ 已创建第 ${order} 行 (${profile.subtype})`);
        }

        successCount++;

        // 添加延迟，避免请求过快
        if (i < profiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error: any) {
        failedCount++;
        const errorMsg = `第 ${order} 条 (${profile.subtype}): ${error.message}`;
        errors.push(errorMsg);
        console.error(`[飞书同步Profile] ${errorMsg}`);
      }
    }

    const totalTime = performance.now() - startTime;
    console.log(`[飞书同步Profile] 同步完成！成功: ${successCount}, 失败: ${failedCount}, 耗时: ${totalTime.toFixed(2)}ms`);

    return {
      success: successCount,
      failed: failedCount,
      errors,
    };
  } catch (error: any) {
    console.error('[飞书同步Profile] 同步过程出错:', error);
    throw error;
  }
}

// 批量同步所有 SeasonalProfile 到飞书表格（带进度回调）
export async function syncAllProfilesToFeishuWithProgress(
  profiles: SeasonalProfile[],
  notes: Record<string, XiaohongshuNote>,
  onProgress?: (current: number, total: number, subtype: string) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  console.log(`[飞书同步Profile] 开始批量同步 ${profiles.length} 个 profiles 到飞书...`);
  const startTime = performance.now();

  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  try {
    // 获取访问令牌
    console.log('[飞书同步Profile] 1/4 获取访问令牌...');
    const accessToken = await getFeishuAccessToken();
    console.log('[飞书同步Profile] ✅ 访问令牌获取成功');

    console.log('[飞书同步Profile] 2/4 获取表格字段...');
    const fieldMap = await getTableFields(accessToken);
    console.log('[飞书同步Profile] 字段映射:', JSON.stringify(fieldMap));

    if (!fieldMap['json_data']) {
      throw new Error('表格中未找到"ai返回的json数据"字段，请检查表格字段名称');
    }

    console.log('[飞书同步Profile] 3/4 获取现有记录...');
    const existingRecords = await getAllRecords(accessToken);
    console.log(`[飞书同步Profile] ✅ 现有记录数: ${existingRecords.length}`);

    // 获取字段类型
    const fieldTypes = (fieldMap as any).__types || {};

    // 只处理传入的 profiles，不再遍历所有16种类型
    console.log(`[飞书同步Profile] 4/4 开始同步 ${profiles.length} 个 profiles...`);
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      const order = ALL_SUBTYPES.indexOf(profile.subtype) + 1;

      // 回调进度
      onProgress?.(i + 1, profiles.length, profile.subtype);

      if (order === 0) {
        console.warn(`[飞书同步Profile] ⚠️ 跳过未知的色彩类型: ${profile.subtype}`);
        continue;
      }

      try {
        const note = notes[profile.subtype];
        console.log(`[飞书同步Profile] 处理 ${profile.subtype}: ${note ? '有笔记数据' : '无笔记数据'}`);

        // 构建记录数据
        const fields: Record<string, any> = {};

        // 设置 JSON 数据
        const jsonDataStr = JSON.stringify(profile, null, 2);
        fields[fieldMap['json_data']] = jsonDataStr;
        console.log(`[飞书同步Profile] JSON数据长度: ${jsonDataStr.length} 字符`);

        // 如果有笔记数据，同步笔记字段
        if (note) {
          if (fieldMap['title']) {
            fields[fieldMap['title']] = note.title;
            console.log(`[飞书同步Profile] 标题: ${note.title.substring(0, 30)}...`);
          }
          if (fieldMap['shorttitle'] && note.shorttitle) {
            fields[fieldMap['shorttitle']] = note.shorttitle;
            console.log(`[飞书同步Profile] 简短标题: ${note.shorttitle}`);
          }
          if (fieldMap['content']) {
            fields[fieldMap['content']] = note.content;
            console.log(`[飞书同步Profile] 正文长度: ${note.content.length} 字符`);
          }
          if (fieldMap['tags']) {
            fields[fieldMap['tags']] = note.tags.join('\n');
            console.log(`[飞书同步Profile] 标签: ${note.tags.join(', ')}`);
          }
        } else {
          console.log(`[飞书同步Profile] ⚠️ ${profile.subtype} 没有笔记数据，只同步JSON`);
        }

        // 设置更新时间（格式：20260105-1212）
        if (fieldMap['update_time']) {
          fields[fieldMap['update_time']] = getFormattedUpdateTime();
          console.log(`[飞书同步Profile] ✅ 设置更新时间: ${getFormattedUpdateTime()}`);
        }

        console.log(`[飞书同步Profile] 处理 ${profile.subtype} (第${order}行, record_id: ${existingRecords[order - 1]?.record_id || 'new'})`);

        // 如果存在对应顺序的记录，则更新；否则创建新记录
        if (order <= existingRecords.length && existingRecords[order - 1]) {
          const recordId = existingRecords[order - 1].record_id;
          console.log(`[飞书同步Profile] 更新记录 ${recordId}...`);

          const updateResponse = await fetch(
            `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_BASE_ID}/tables/${FEISHU_TABLE_ID}/records/${recordId}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ fields }),
            }
          );

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`更新失败 (${updateResponse.status}): ${errorText}`);
          }

          const updateData = await updateResponse.json();
          if (updateData.code !== 0) {
            throw new Error(updateData.msg || '未知错误');
          }

          console.log(`[飞书同步Profile] ✅ 已更新第 ${order} 行 (${profile.subtype})`);
        } else {
          console.log(`[飞书同步Profile] 创建新记录...`);
          const createResponse = await fetch(
            `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_BASE_ID}/tables/${FEISHU_TABLE_ID}/records`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ fields }),
            }
          );

          if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`创建失败 (${createResponse.status}): ${errorText}`);
          }

          const createData = await createResponse.json();
          if (createData.code !== 0) {
            throw new Error(createData.msg || '未知错误');
          }

          console.log(`[飞书同步Profile] ✅ 已创建第 ${order} 行 (${profile.subtype})`);
        }

        successCount++;

        // 添加延迟，避免请求过快
        if (i < profiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error: any) {
        failedCount++;
        const errorMsg = `第 ${order} 条 (${profile.subtype}): ${error.message}`;
        errors.push(errorMsg);
        console.error(`[飞书同步Profile] ${errorMsg}`);
      }
    }

    const totalTime = performance.now() - startTime;
    console.log(`[飞书同步Profile] 同步完成！成功: ${successCount}, 失败: ${failedCount}, 耗时: ${totalTime.toFixed(2)}ms`);

    return {
      success: successCount,
      failed: failedCount,
      errors,
    };
  } catch (error: any) {
    console.error('[飞书同步Profile] 同步过程出错:', error);
    throw error;
  }
}

// ==================== 从飞书读取 Profile 数据 ====================

// 从飞书表格读取所有 profiles
export async function fetchAllProfilesFromFeishu(): Promise<Record<string, SeasonalProfile>> {
  console.log('[飞书读取] 开始从飞书读取所有 profiles...');
  const startTime = performance.now();

  try {
    const accessToken = await getFeishuAccessToken();
    const fieldMap = await getTableFields(accessToken);

    // 检查是否有 JSON 数据字段
    if (!fieldMap['json_data']) {
      console.warn('[飞书读取] 未找到"ai返回的json数据"字段，返回空对象');
      return {};
    }

    // 获取所有记录（使用分页获取所有数据）
    const records: any[] = [];
    let hasMore = true;
    let pageToken = '';

    while (hasMore) {
      const url = pageToken
        ? `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_BASE_ID}/tables/${FEISHU_TABLE_ID}/records?page_size=100&page_token=${pageToken}`
        : `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_BASE_ID}/tables/${FEISHU_TABLE_ID}/records?page_size=100`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`获取记录失败: ${errorData.msg || response.statusText}`);
      }

      const data = await response.json();
      if (data.code !== 0) {
        throw new Error(`获取记录失败: ${data.msg || '未知错误'}`);
      }

      if (data.data?.items) {
        records.push(...data.data.items);
      }

      hasMore = data.data?.has_more || false;
      pageToken = data.data?.page_token || '';
    }

    console.log(`[飞书读取] 获取到 ${records.length} 条记录`);

    // 解析 JSON 数据
    const profiles: Record<string, SeasonalProfile> = {};

    // 序号与 subtype 的对应关系
    const ORDER_TO_SUBTYPE: Record<number, string> = {};
    ALL_SUBTYPES.forEach((subtype, index) => {
      ORDER_TO_SUBTYPE[index + 1] = subtype;
    });

    for (const record of records) {
      try {
        const fields = record.fields || {};
        const jsonDataField = fieldMap['json_data'];
        const jsonData = fields[jsonDataField];

        if (!jsonData) {
          console.warn(`[飞书读取] ⚠️ 记录 ${record.record_id} 没有 json_data 字段`);
          continue;
        }

        if (typeof jsonData === 'string') {
          // 尝试解析 JSON
          let profile: SeasonalProfile;
          try {
            profile = JSON.parse(jsonData) as SeasonalProfile;
          } catch (parseErr: any) {
            console.warn(`[飞书读取] ⚠️ JSON解析失败 for record ${record.record_id}:`, parseErr.message);
            console.warn(`[飞书读取] 原始数据（前200字符）: ${jsonData.substring(0, 200)}...`);
            continue;
          }

          // 验证 subtype 是否有效
          if (profile.subtype && ALL_SUBTYPES.includes(profile.subtype)) {
            profiles[profile.subtype] = profile;
            console.log(`[飞书读取] ✅ 成功读取 ${profile.subtype}`);
          } else {
            console.warn(`[飞书读取] ⚠️ 无效的 subtype: ${profile.subtype}, 跳过`);
          }
        } else {
          console.warn(`[飞书读取] ⚠️ json_data 不是字符串类型: ${typeof jsonData}`);
        }
      } catch (parseError: any) {
        console.warn(`[飞书读取] ⚠️ 处理记录失败:`, parseError.message);
      }
    }

    const totalTime = performance.now() - startTime;
    console.log(`[飞书读取] 完成！成功读取 ${Object.keys(profiles).length} 个 profiles，耗时: ${totalTime.toFixed(2)}ms`);

    return profiles;
  } catch (error: any) {
    console.error('[飞书读取] 从飞书读取失败:', error);
    throw error;
  }
}

// 测试从飞书读取功能
export async function testFetchFromFeishu(): Promise<void> {
  console.log('[飞书读取测试] 开始测试读取功能...');
  try {
    const profiles = await fetchAllProfilesFromFeishu();
    console.log(`[飞书读取测试] ✅ 测试成功！读取到 ${Object.keys(profiles).length} 个 profiles`);
    console.log('读取到的类型:', Object.keys(profiles));
  } catch (error: any) {
    console.error('[飞书读取测试] ❌ 测试失败:', error);
    throw error;
  }
}
