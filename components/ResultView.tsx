import React, { useEffect, useRef, useState } from 'react';
import { AnalysisResult, ColorRecommendation, BodyPartColor } from '../types';
import RadarChartComponent from './RadarChartComponent';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface Props {
  result: AnalysisResult;
  userImage: string;
  onReset: () => void;
  onDownloadReady?: (downloadFn: () => Promise<{ [key: string]: string }>) => void;
}

const SeasonBadge: React.FC<{ season: string }> = ({ season }) => {
  const colors = {
    spring: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    summer: 'bg-blue-100 text-blue-700 border-blue-300',
    autumn: 'bg-orange-100 text-orange-700 border-orange-300',
    winter: 'bg-purple-100 text-purple-700 border-purple-300',
  };
  const bgClass = colors[season as keyof typeof colors] || colors.spring;

  const icons = {
    spring: '🌷',
    summer: '🍉',
    autumn: '🍁',
    winter: '❄️',
  };

  const seasonText = {
    spring: '春季型',
    summer: '夏季型',
    autumn: '秋季型',
    winter: '冬季型',
  } as const;

  return (
    <span className={`px-4 py-1 rounded-full border text-sm font-bold flex items-center gap-2 ${bgClass}`}>
      {icons[season as keyof typeof icons]} {(seasonText as any)[season] || season}
    </span>
  );
};

const subtypeText: Record<string, string> = {
  // Spring
  clear_spring: '净春型',
  light_spring: '浅春型',
  soft_spring: '柔春型',
  bright_spring: '亮春型',
  // Summer
  light_summer: '浅夏型',
  soft_summer: '柔夏型',
  bright_summer: '亮夏型',
  deep_summer: '深夏型',
  // Autumn
  soft_autumn: '柔秋型',
  bright_autumn: '亮秋型',
  deep_autumn: '深秋型',
  light_autumn: '浅秋型',
  // Winter
  soft_winter: '柔冬型',
  bright_winter: '亮冬型',
  deep_winter: '深冬型',
  clear_winter: '净冬型',
};

const getDisplaySubtype = (result: AnalysisResult) => {
  // 优先使用 AI 返回的中文名（若有）
  if (result.season_display_name && result.season_display_name.trim()) {
    return result.season_display_name.trim();
  }
  // 否则用前端映射兜底
  if (result.subtype && subtypeText[result.subtype]) {
    return subtypeText[result.subtype];
  }
  return result.subtype || '';
};

const ColorSwatch: React.FC<{ color: string; label: string; subLabel?: string }> = ({ color, label, subLabel }) => (
  <div className="flex flex-col items-center gap-2">
    <div 
      className="w-16 h-16 rounded-full shadow-md border-2 border-white" 
      style={{ backgroundColor: color }}
    />
    <div className="text-center">
      <p className="text-xs font-medium text-gray-700">{label}</p>
      {subLabel && <p className="text-[10px] text-gray-400 uppercase">{subLabel}</p>}
    </div>
  </div>
);

const PaletteCard: React.FC<{ title: string; items: ColorRecommendation[]; type: 'recommend' | 'avoid' }> = ({ title, items, type }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
    <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${type === 'recommend' ? 'text-gray-800' : 'text-gray-800'}`}>
       {type === 'recommend' ? '✨ 最适合的推荐色' : '⚠️ 应避开的雷区色'}
    </h3>
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item, idx) => (
        <div key={idx} className="bg-gray-50 rounded-lg p-3 flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
            <div 
                className="w-16 h-16 rounded-full shadow-inner border-2 border-white"
                style={{ backgroundColor: item.hex }}
            ></div>
            <div className="text-center w-full">
                <p className="text-xs font-medium text-gray-700">{item.name}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-mono mb-1">{item.hex}</p>
                <p className="text-[10px] text-gray-500 line-clamp-2">
                    {type === 'recommend' ? item.description : item.reason}
                </p>
            </div>
        </div>
      ))}
    </div>
  </div>
);

const ProgressBar: React.FC<{ label: string; value: number; leftLabel: string; rightLabel: string }> = ({ label, value, leftLabel, rightLabel }) => (
  <div className="mb-6">
    <div className="flex justify-between items-end mb-2">
        <span className="font-bold text-gray-700 text-sm">{label} <span className="text-xs font-normal text-gray-500">({leftLabel}/{rightLabel})</span></span>
        <span className="text-xl font-bold text-gray-900">{value}</span>
    </div>
    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden relative">
      <div 
        className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
    <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
    </div>
  </div>
);

const ResultView: React.FC<Props> = ({ result, userImage, onReset, onDownloadReady }) => {
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  
  // Refs for components
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyPartsRef = useRef<HTMLDivElement>(null);
  const dimensionsRef = useRef<HTMLDivElement>(null);
  const radarRef = useRef<HTMLDivElement>(null);
  const recommendRef = useRef<HTMLDivElement>(null);
  const avoidRef = useRef<HTMLDivElement>(null);
  const advicePart1Ref = useRef<HTMLDivElement>(null);
  const advicePart2Ref = useRef<HTMLDivElement>(null);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);
  
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // 导出当前页面的所有模块为图片（返回base64数据）
  const exportCurrentPageModules = async (): Promise<{ [key: string]: string }> => {
    const modules: Array<{ name: string; ref: React.RefObject<HTMLDivElement> }> = [
      { name: 'header', ref: headerRef },
      { name: 'body-parts', ref: bodyPartsRef },
      { name: 'dimensions', ref: dimensionsRef },
      { name: 'radar-chart', ref: radarRef },
      { name: 'recommended-colors', ref: recommendRef },
      { name: 'avoid-colors', ref: avoidRef },
      { name: 'advice-part1', ref: advicePart1Ref },
      { name: 'advice-part2', ref: advicePart2Ref },
    ];
    
    const results: { [key: string]: string } = {};
    
    // 隐藏下载按钮
    if (downloadButtonRef.current) {
      downloadButtonRef.current.style.display = 'none';
    }
    
    for (const module of modules) {
      if (!module.ref.current) continue;
      try {
        const dataUrl = await exportModuleToPng(module.ref.current, module.name);
        results[module.name] = dataUrl;
      } catch (error) {
        console.error(`Error capturing ${module.name}:`, error);
      }
    }
    
    // 恢复下载按钮
    if (downloadButtonRef.current) {
      downloadButtonRef.current.style.display = '';
    }
    
    return results;
  };
  
  // 当组件挂载且onDownloadReady存在时，暴露下载方法
  useEffect(() => {
    if (onDownloadReady) {
      onDownloadReady(exportCurrentPageModules);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDownloadReady, result]);

  // Get body part color by part name
  const getBodyPartColor = (partName: string) => {
    return result.body_part_colors?.find(part => part.part === partName);
  };

  // Wait for fonts + layout to settle
  const waitForStableLayout = async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  };

  // Export single module to PNG
  const exportModuleToPng = async (node: HTMLDivElement, moduleName: string) => {
    await waitForStableLayout();
    return await toPng(node, {
      backgroundColor: '#ffffff',
      cacheBust: true,
      pixelRatio: 2,
      skipFonts: true,
      fontEmbedCSS: '',
      style: {
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
      },
      filter: () => true, // No filtering needed, download button is already hidden via display: none
    });
  };

  // One-click download all modules as ZIP
  const downloadAllScreenshots = async () => {
    if (isDownloadingAll) return;
    setIsDownloadingAll(true);
    
    // Hide download button to avoid capturing it in screenshots
    if (downloadButtonRef.current) {
      downloadButtonRef.current.style.display = 'none';
    }
    
    try {
      const modules: Array<{ name: string; ref: React.RefObject<HTMLDivElement> }> = [
        { name: 'header', ref: headerRef },
        { name: 'body-parts', ref: bodyPartsRef },
        { name: 'dimensions', ref: dimensionsRef },
        { name: 'radar-chart', ref: radarRef },
        { name: 'recommended-colors', ref: recommendRef },
        { name: 'avoid-colors', ref: avoidRef },
        { name: 'advice-part1', ref: advicePart1Ref },
        { name: 'advice-part2', ref: advicePart2Ref },
      ];

      const zip = new JSZip();
      
      for (const module of modules) {
        if (!module.ref.current) continue;
        try {
          const dataUrl = await exportModuleToPng(module.ref.current, module.name);
          const base64 = dataUrl.split(',')[1] || '';
          zip.file(`colorscan-${module.name}-${Date.now()}.png`, base64, { base64: true });
        } catch (error) {
          console.error(`Error capturing ${module.name}:`, error);
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `colorscan-all-modules-${Date.now()}.zip`);
    } catch (error) {
      console.error('Error downloading all screenshots:', error);
      alert('下载失败，请重试');
    } finally {
      setIsDownloadingAll(false);
      // Show download button again after all screenshots are done
      if (downloadButtonRef.current) {
        downloadButtonRef.current.style.display = '';
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-20 pt-8 animate-fade-in">

      
      {/* 1. Header Section */}
      <div ref={headerRef} data-module="header" className="bg-white rounded-[2rem] shadow-xl p-8 mb-8 text-center relative overflow-hidden border border-yellow-50/50">
        <div className="absolute top-4 left-4 flex gap-2">
          <button
            ref={downloadButtonRef}
            onClick={downloadAllScreenshots}
            disabled={isDownloadingAll}
            className="bg-amber-400 hover:bg-amber-500 disabled:bg-amber-300 text-white rounded-full px-4 py-2 text-sm font-bold shadow-md transition-colors duration-200 flex items-center gap-2"
            title="一键下载所有模块截图"
          >
            {isDownloadingAll ? '⏳ 打包中...' : '📦 一键下载全部'}
          </button>
        </div>
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300"></div>
        
        <div className="relative inline-block mb-6">
            <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-lg mx-auto">
                {userImage ? (
                    <img src={userImage} alt="User" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <span className="text-gray-400 text-4xl">👤</span>
                    </div>
                )}
            </div>
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
                <SeasonBadge season={result.season} />
            </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-2 mt-4">{getDisplaySubtype(result)}</h1>
        <p className="text-gray-500 italic font-light font-serif mb-6">
          "{result.season === 'spring' ? '你如同春日里的第一缕阳光，温暖而明媚' :
            result.season === 'summer' ? '你如同夏日雨后的荷塘，清爽而柔和' :
            result.season === 'autumn' ? '你如同秋日午后的麦田，醇厚而丰富' :
            '你如同冬日雪原的松柏，纯粹而冷艳'}"
        </p>

        {/* Five Dimensions Summary Icons */}
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
             {(() => {
                const tags = [];
                
                // 基于明度 (value_score) 决定是否显示明亮/深邃
                if (result.value_score > 50) {
                    tags.push('明亮');
                } else {
                    tags.push('深邃');
                }
                
                // 基于色调 (temperature) 决定是否显示温暖/冷艳
                if (result.temperature > 50) {
                    tags.push('温暖');
                } else {
                    tags.push('冷艳');
                }
                
                // 基于清浊 (clarity) 决定是否显示清透/柔雾
                if (result.clarity > 50) {
                    tags.push('清透');
                } else {
                    tags.push('柔雾');
                }
                
                // 基于彩度 (chroma) 决定是否显示鲜艳/柔和
                if (result.chroma > 50) {
                    tags.push('鲜艳');
                } else {
                    tags.push('柔和');
                }
                
                return tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-block h-9 px-5 bg-yellow-400 text-white text-xs rounded-full font-bold shadow-sm text-center"
                    style={{ lineHeight: '36px' }}
                  >
                    {tag}
                  </span>
                ));
             })()}
        </div>

        {/* Text Analysis Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left bg-gray-50 p-6 rounded-xl">
            <div className="flex gap-3">
                <span className="text-xl">🌸</span>
                <div>
                    <h4 className="font-bold text-gray-800 text-sm">肤色</h4>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {result.temperature > 50 ? '肤色基调偏暖，在自然光下呈现出温暖的蜜桃色或金色，散发健康光泽。' : '肤色基调偏冷，具有玫瑰色或青色的底调，呈现出清透的粉白感。'}
                    </p>
                </div>
            </div>
            <div className="flex gap-3">
                <span className="text-xl">👁️</span>
                <div>
                    <h4 className="font-bold text-gray-800 text-sm">瞳孔</h4>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {result.contrast > 60 ? '瞳色深邃明亮，眼白与瞳孔边界清晰，具有强烈的对比度和神采。' : '瞳色柔和朦胧，眼白与瞳孔边界柔和，具有温柔的透明感和亲和力。'}
                    </p>
                </div>
            </div>
            <div className="flex gap-3">
                <span className="text-xl">💇</span>
                <div>
                    <h4 className="font-bold text-gray-800 text-sm">发色</h4>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {(() => {
                            // 获取发色信息
                            const hairColor = getBodyPartColor('自然发色');
                            if (hairColor) {
                                // 结合多个维度来描述发色
                                const descriptions = [];
                                
                                // 基于明度描述深浅
                                if (result.value_score > 70) {
                                    descriptions.push('浅棕色、金色或亚麻色');
                                } else if (result.value_score > 40) {
                                    descriptions.push('棕色、栗色或铜色');
                                } else {
                                    descriptions.push('深棕色、黑色或深褐色');
                                }
                                
                                // 基于色调描述冷暖
                                if (result.temperature > 60) {
                                    descriptions.push('暖色调');
                                } else if (result.temperature > 40) {
                                    descriptions.push('中性色调');
                                } else {
                                    descriptions.push('冷色调');
                                }
                                
                                // 基于彩度描述饱和度
                                if (result.chroma > 60) {
                                    descriptions.push('高饱和度');
                                } else if (result.chroma > 30) {
                                    descriptions.push('中等饱和度');
                                } else {
                                    descriptions.push('低饱和度');
                                }
                                
                                // 基于清晰度描述质感
                                if (result.clarity > 60) {
                                    descriptions.push('清透明亮');
                                } else if (result.clarity > 30) {
                                    descriptions.push('柔和自然');
                                } else {
                                    descriptions.push('深沉浓郁');
                                }
                                
                                return `自然发色为${descriptions.join('，')}，具有独特的个人风格。`;
                            }
                            return '自然发色分析中...';
                        })()}
                    </p>
                </div>
            </div>
            <div className="flex gap-3">
                <span className="text-xl">⚖️</span>
                <div>
                    <h4 className="font-bold text-gray-800 text-sm">对比度</h4>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {(() => {
                            if (result.contrast > 70) {
                                return '面部五官立体感强，肤色与发色形成鲜明对比，给人留下深刻印象。';
                            } else if (result.contrast > 40) {
                                return '面部五官具有一定立体感，肤色与发色对比适中，给人和谐平衡的感觉。';
                            } else {
                                return '面部五官轮廓柔和，肤色与发色对比较弱，给人温柔内敛的印象。';
                            }
                        })()}
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* 2. Body Part Analysis */}
      <div ref={bodyPartsRef} data-module="body-parts" className="bg-white rounded-2xl shadow-lg p-8 mb-8 relative">
        <h2 className="text-xl font-bold text-gray-800 text-center mb-2">部位色号分析</h2>
        <p className="text-xs text-gray-400 text-center mb-8">AI 识别您各部位的精准色号</p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-4 justify-items-center">
            {(result.body_part_colors || []).map((part, idx) => (
                <ColorSwatch key={idx} color={part.color} label={part.part} subLabel={part.color} />
            ))}
        </div>
      </div>

      {/* 3. Color Dimensions (Bars & Radar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div ref={dimensionsRef} data-module="dimensions" className="bg-white rounded-2xl shadow-lg p-8 relative">
            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">色彩维度分析</h2>
            <ProgressBar label="色调 (冷暖倾向)" value={result.temperature} leftLabel="冷色调" rightLabel="暖色调" />
            <ProgressBar label="明度 (深浅程度)" value={result.value_score} leftLabel="深色系" rightLabel="浅色系" />
            <ProgressBar label="彩度 (饱和程度)" value={result.chroma} leftLabel="低饱和" rightLabel="高饱和" />
            <ProgressBar label="清浊 (清透程度)" value={result.clarity} leftLabel="柔雾感" rightLabel="清透感" />
            <ProgressBar label="对比度 (明暗反差)" value={result.contrast} leftLabel="低对比" rightLabel="高对比" />
          </div>
          <div ref={radarRef} data-module="radar-chart" className="bg-white rounded-2xl shadow-lg p-8 relative">
            <RadarChartComponent data={result} />
          </div>
      </div>

      {/* 4. Recommendations */}
      <div className="space-y-8 mb-8">
          <div ref={recommendRef} data-module="recommended-colors" className="relative">
            <PaletteCard title="最适合的推荐色" items={result.recommended_colors} type="recommend" />
          </div>
          <div ref={avoidRef} data-module="avoid-colors" className="relative">
            <PaletteCard title="应避开的雷区色" items={result.avoid_colors} type="avoid" />
          </div>
      </div>

      {/* 5. Detailed Advice - Part 1 (前2部分) */}
      <div ref={advicePart1Ref} data-module="advice-part1" className="bg-amber-50 rounded-2xl p-8 border border-amber-100 shadow-sm space-y-8 relative">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">美学建议</h2>

          {(() => {
            // 检查 detailed_styling_tips 是否为对象
            if (typeof result.detailed_styling_tips === 'object' && result.detailed_styling_tips !== null) {
              return (
                <>
                  <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h3 className="font-bold text-lg text-amber-600 mb-3 flex items-center gap-2">
                        🎨 色彩时尚搭配建议
                    </h3>
                    <p className="text-gray-700 text-sm leading-7 whitespace-pre-line">{result.detailed_styling_tips.fashion_matching}</p>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm">
                     <h3 className="font-bold text-lg text-amber-600 mb-3 flex items-center gap-2">
                        ⭐ 明星参考
                    </h3>
                     <p className="text-gray-700 text-sm leading-7 whitespace-pre-line">
                         {result.detailed_styling_tips.celebrity_reference}
                     </p>
                  </div>
                </>
              );
            } else {
              // 保持原来的渲染方式（如果它仍然是字符串）
              return (
                <>
                  <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h3 className="font-bold text-lg text-amber-600 mb-3 flex items-center gap-2">
                        🎨 色彩时尚搭配建议
                    </h3>
                    <p className="text-gray-700 text-sm leading-7 whitespace-pre-line">{result.detailed_styling_tips}</p>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm">
                     <h3 className="font-bold text-lg text-amber-600 mb-3 flex items-center gap-2">
                        ⭐ 明星参考
                    </h3>
                     <p className="text-gray-700 text-sm leading-7 whitespace-pre-line">
                         {result.star_reference || "该色型通常具有鲜明的个人特色，参考同类型明星的穿搭能更快找到灵感。"}
                     </p>
                  </div>
                </>
              );
            }
          })()}
      </div>

      {/* 6. Detailed Advice - Part 2 (后3部分) */}
      <div ref={advicePart2Ref} data-module="advice-part2" className="bg-amber-50 rounded-2xl p-8 border border-amber-100 shadow-sm space-y-8 relative mt-8">

          {(() => {
            // 检查 detailed_styling_tips 是否为对象
            if (typeof result.detailed_styling_tips === 'object' && result.detailed_styling_tips !== null) {
              return (
                <>
                  <div className="bg-white p-6 rounded-xl shadow-sm">
                     <h3 className="font-bold text-lg text-amber-600 mb-3 flex items-center gap-2">
                        💎 饰品颜色建议
                    </h3>
                     <p className="text-gray-700 text-sm leading-7 whitespace-pre-line">
                         {result.detailed_styling_tips.jewelry_colors}
                     </p>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm">
                     <h3 className="font-bold text-lg text-amber-600 mb-3 flex items-center gap-2">
                        💋 口红腮红妆容建议
                    </h3>
                     <p className="text-gray-700 text-sm leading-7 whitespace-pre-line">{result.detailed_styling_tips.makeup_details}</p>
                  </div>
                </>
              );
            } else {
              // 保持原来的渲染方式（如果它仍然是字符串）
              return (
                <>
                  <div className="bg-white p-6 rounded-xl shadow-sm">
                     <h3 className="font-bold text-lg text-amber-600 mb-3 flex items-center gap-2">
                        💎 饰品颜色建议
                    </h3>
                     <p className="text-gray-700 text-sm leading-7 whitespace-pre-line">
                         {result.accessories_tips || "选择与肤色色调一致的金属颜色能增加和谐感。"}
                     </p>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm">
                     <h3 className="font-bold text-lg text-amber-600 mb-3 flex items-center gap-2">
                        💋 口红腮红妆容建议
                    </h3>
                     <p className="text-gray-700 text-sm leading-7 whitespace-pre-line">{result.makeup_tips}</p>
                  </div>
                </>
              );
            }
          })()}

          <div className="bg-white p-6 rounded-xl shadow-sm">
             <h3 className="font-bold text-lg text-amber-600 mb-3 flex items-center gap-2">
                👗 穿搭风格
            </h3>
             <p className="text-gray-700 text-sm leading-7 whitespace-pre-line">{result.styling_tips}</p>
          </div>
      </div>

      <div className="text-center mt-12">
        <button 
            onClick={onReset}
            className="bg-amber-400 hover:bg-amber-500 text-white text-lg font-bold py-4 px-12 rounded-full shadow-lg transform transition hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重新测试
        </button>
        <p className="text-gray-400 text-xs mt-4">© 2025 ColorScan 16 · 原创保护</p>
      </div>

    </div>
  );
};

export default ResultView;