import React, { useState, useRef, useEffect } from 'react';
import { Step, AnalysisResult } from './types';
import { analyzeImage } from './services/geminiService';
import ResultView from './components/ResultView';
import * as demoDataModule from './demo-data.json';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import BatchGeneratorPage from './batch-generator/BatchGeneratorPage';
import { SeasonalProfile, XiaohongshuNote } from './types2';
import { Database, Scan, ArrowRightLeft } from 'lucide-react';
import { AIServiceFactory, ModelType } from './services2/aiService';
import { fetchAllProfilesFromFeishu } from './services2/feishuService';
import { PromptVersion } from './batch-generator/BatchGeneratorPage';
const demoData = demoDataModule.default || [];

// --- Sub-components for Landing, Upload, Loading ---

const Landing: React.FC<{
  onStart: () => void;
  onDemoSelect: (demo: AnalysisResult) => void;
  onBatchDownload: () => void;
  isBatchDownloading: boolean;
  batchDownloadProgress: { current: number; total: number };
  demoResults: AnalysisResult[];
}> = ({ onStart, onDemoSelect, onBatchDownload, isBatchDownloading, batchDownloadProgress, demoResults }) => {
  const [selectedSeason, setSelectedSeason] = useState<string>('spring');

  // 从对象结构中提取所有色彩数据并过滤出对应季节的
  const seasonDemos = demoResults.filter(demo => demo.season === selectedSeason);
  
  const subtypeNames: Record<string, string> = {
    clear_spring: '净春型',
    light_spring: '浅春型',
    soft_spring: '柔春型',
    bright_spring: '亮春型',
    light_summer: '浅夏型',
    soft_summer: '柔夏型',
    bright_summer: '亮夏型',
    deep_summer: '深夏型',
    soft_autumn: '柔秋型',
    bright_autumn: '亮秋型',
    deep_autumn: '深秋型',
    light_autumn: '浅秋型',
    soft_winter: '柔冬型',
    bright_winter: '亮冬型',
    deep_winter: '深冬型',
    clear_winter: '净冬型'
  };
  
  
  const seasons = ['spring', 'summer', 'autumn', 'winter'];
  const seasonNames = {
    spring: '春季型',
    summer: '夏季型',
    autumn: '秋季型',
    winter: '冬季型'
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full -z-10 bg-[#FDFBF7]">
           <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-200 rounded-full blur-[100px] opacity-30"></div>
           <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-yellow-200 rounded-full blur-[100px] opacity-30"></div>
      </div>
      
      <div className="mb-8 relative">
          <div className="w-24 h-24 bg-gradient-to-tr from-pink-400 to-yellow-400 rounded-2xl mx-auto rotate-3 shadow-xl flex items-center justify-center text-4xl">
              ✨
          </div>
      </div>
      
      <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4 tracking-tight">
        ColorScan <span className="text-amber-500">16</span>
      </h1>
      <h2 className="text-xl md:text-2xl font-light text-gray-600 mb-8">
        找到属于你的专属天命色彩
      </h2>
      <p className="max-w-md text-gray-500 mb-12 leading-relaxed">
        不论你是买衣服总是踩雷，还是妆容显脏？<br/>
        AI 智能分析 16 型四季色彩，为您量身定制<br/>
        <span className="font-semibold text-gray-700">穿搭方案</span> 与 <span className="font-semibold text-gray-700">妆容建议</span>。
      </p>

      <div className="grid grid-cols-4 gap-2 mb-12 max-w-sm w-full opacity-80">
          <div className="h-12 bg-green-200 rounded-lg"></div>
          <div className="h-12 bg-blue-200 rounded-lg"></div>
          <div className="h-12 bg-orange-200 rounded-lg"></div>
          <div className="h-12 bg-purple-200 rounded-lg"></div>
      </div>

      <div className="flex flex-col gap-4 mb-16">
        <button
          onClick={onStart}
          className="bg-gray-900 text-white text-lg font-bold py-4 px-16 rounded-full shadow-xl hover:bg-gray-800 transform transition hover:scale-105 active:scale-95"
        >
          开始测试
        </button>

        <button
          onClick={onBatchDownload}
          disabled={isBatchDownloading}
          className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-lg font-bold py-4 px-16 rounded-full shadow-xl transform transition hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
        >
          {isBatchDownloading ? (
            <>
              <span className="animate-spin">⏳</span>
              正在下载 {batchDownloadProgress.current}/{batchDownloadProgress.total}...
            </>
          ) : (
            <>
              📦 依次打开并下载所有16种类型（全部模块）
            </>
          )}
        </button>
        {isBatchDownloading && (
          <div className="text-sm text-gray-500 mt-2 space-y-1">
            <p>正在依次打开每个类型的结果页面并下载...</p>
            <p>进度: {batchDownloadProgress.current}/{batchDownloadProgress.total} ({Math.round((batchDownloadProgress.current / batchDownloadProgress.total) * 100)}%)</p>
            <p className="text-xs">共 {batchDownloadProgress.total * 8} 张截图，请耐心等待...</p>
          </div>
        )}
      </div>
      
      {/* Demo Section */}
      <div className="w-full max-w-4xl mt-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6">🎨 色彩类型演示</h3>
        
        {/* Season Selector */}
        <div className="flex justify-center gap-4 mb-8">
          {seasons.map(season => (
            <button
              key={season}
              onClick={() => setSelectedSeason(season)}
              className={`px-6 py-2 rounded-full font-medium transition-all ${selectedSeason === season 
                ? 'bg-gray-900 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {seasonNames[season as keyof typeof seasonNames]}
            </button>
          ))}
        </div>
        
        {/* Demo Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {seasonDemos.map((demo, index) => {
            return (
              <div
                key={index}
                onClick={() => onDemoSelect(demo)}
                className="bg-white rounded-xl shadow-md p-4 border border-gray-100 hover:shadow-lg cursor-pointer transition-all transform hover:scale-105"
              >
                <div className="h-12 rounded-lg mb-4" style={{
                  background: demo.recommended_colors && demo.recommended_colors.length >= 2
                    ? `linear-gradient(45deg, ${demo.recommended_colors[0].hex}, ${demo.recommended_colors[1].hex})`
                    : '#E5E7EB'
                }}></div>
                <h4 className="font-bold text-gray-800 mb-1">{subtypeNames[demo.subtype as keyof typeof subtypeNames]}</h4>
                <p className="text-sm text-gray-500 mb-3">
                  色调: {demo.temperature} | 明度: {demo.value_score}
                </p>
                <button className="text-sm text-blue-600 font-medium hover:text-blue-800">
                  查看详情
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const UploadSection: React.FC<{ onAnalyze: (file: File) => void; remainingUsage: number }> = ({ onAnalyze, remainingUsage }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      
      if (selected.size > 5 * 1024 * 1024) {
        alert("图片大小不能超过 5MB");
        return;
      }
      
      // 图片预处理：转换为 JPEG 格式，大小控制在 200-300KB
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // 使用原始分辨率
        canvas.width = img.width;
        canvas.height = img.height;
        
        // 绘制图片
        ctx?.drawImage(img, 0, 0, img.width, img.height);
        
        // 转换为 JPEG 格式，质量设为 0.6（控制大小在 200-300KB）
        canvas.toBlob((blob) => {
          if (blob) {
            // 创建新的 File 对象，使用 JPEG 格式
            const jpegFile = new File([blob], selected.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            
            setFile(jpegFile);
            
            // 创建预览
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(jpegFile);
          }
        }, 'image/jpeg', 0.6);
      };
      
      img.src = URL.createObjectURL(selected);
    }
  };

  const handleAnalyzeClick = () => {
    if (file) {
      onAnalyze(file);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#FDFBF7]">
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">上传您的照片</h2>
        
        {/* 显示剩余使用次数 */}
        <div className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-100 text-center">
          <p className="text-sm font-medium text-amber-800">今日剩余使用次数: <span className="font-bold text-lg">{remainingUsage}/10</span></p>
        </div>
        
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
           {/* Upload Area */}
           <div className="relative aspect-[3/4] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden mb-6 group">
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-6">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-amber-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400 group-hover:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-gray-500 text-sm font-medium">点击选择相册照片</p>
                    <p className="text-gray-400 text-xs mt-2">支持 JPG, PNG (Max 5MB)<br/>建议自然光、无滤镜、素颜</p>
                </div>
              )}
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
           </div>

           {/* Change Photo Button if preview exists */}
           {preview && (
               <div className="text-center mb-6">
                   <button 
                    onClick={() => { 
                      setFile(null); 
                      setPreview(null); 
                      // 重置文件输入框，以便用户可以重新选择同一张照片
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="text-gray-400 text-sm underline hover:text-gray-600"
                   >
                       重新选择照片
                   </button>
               </div>
           )}

           <button 
             onClick={handleAnalyzeClick}
             disabled={!file}
             className="w-full bg-gray-900 disabled:bg-gray-300 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-gray-800 transition-all transform active:scale-95 flex items-center justify-center gap-2"
           >
             <span className="text-lg">✨ 开始 AI 分析</span>
           </button>
        </div>
      </div>
    </div>
  );
};

const LoadingScreen: React.FC<{ onTimeout: () => void }> = ({ onTimeout }) => {
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('正在初始化 AI 模型...');
    const [isTimeout, setIsTimeout] = useState(false);
    
    useEffect(() => {
        // 进度更新计时器（30秒完成）
        const progressTimer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) return prev;
                if (prev === 20) setMessage('正在识别面部特征...');
                if (prev === 40) setMessage('分析皮肤底色与冷暖调...');
                if (prev === 60) setMessage('计算五维度色彩数据...');
                if (prev === 80) setMessage('生成专属穿搭与妆容建议...');
                return prev + 1;
            });
        }, 300); // 30s approximate total

        // 超时检测计时器（3分钟）
        const timeoutTimer = setTimeout(() => {
            setIsTimeout(true);
            setMessage('分析超时，请重新测试');
            onTimeout(); // 调用超时回调函数
        }, 3 * 60 * 1000); // 3分钟

        return () => {
            clearInterval(progressTimer);
            clearTimeout(timeoutTimer);
        };
    }, [onTimeout]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] p-8">
            <div className="relative w-32 h-32 mb-8">
                 <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                 <div className="absolute inset-0 border-4 border-amber-400 rounded-full border-t-transparent animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center font-bold text-gray-700 text-xl">
                     {progress}%
                 </div>
            </div>
            
            <h2 className="text-xl font-bold text-gray-800 mb-2">AI 深度分析中</h2>
            <p className="text-gray-500 animate-pulse text-sm">{message}</p>
            <p className="text-gray-400 text-xs mt-4">预计需要 30 秒左右，请耐心等待 ⏳</p>
            
            {isTimeout && (
                <div className="mt-8 p-4 bg-red-50 rounded-lg border border-red-100 text-center">
                    <p className="text-red-600 text-sm font-medium">分析已超时（超过3分钟）</p>
                    <p className="text-red-500 text-xs mt-2">可能是网络问题或服务器繁忙</p>
                    <button 
                        onClick={onTimeout}
                        className="mt-4 px-6 py-2 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors"
                    >
                        重新测试
                    </button>
                </div>
            )}
        </div>
    );
};

const AppLoading: React.FC = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7]">
        <div className="relative w-24 h-24 mb-6">
             <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
             <div className="absolute inset-0 border-4 border-amber-400 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">正在加载 ColorScan 16...</h2>
        <p className="text-gray-500 text-sm">请稍候，我们正在准备您的个性化色彩分析</p>
    </div>
);

// --- Main App Component ---

// 检查并更新使用次数，限制为10次
const checkAndUpdateUsage = (): { canUse: boolean; remaining: number } => {
  const today = new Date().toDateString();
  const usageKey = `usage_${today}`;
  const currentUsage = parseInt(localStorage.getItem(usageKey) || '0');
  const maxUsage = 10;
  
  return {
    canUse: currentUsage < maxUsage,
    remaining: maxUsage - currentUsage
  };
};

// 增加使用次数
const incrementUsage = () => {
  const today = new Date().toDateString();
  const usageKey = `usage_${today}`;
  const currentUsage = parseInt(localStorage.getItem(usageKey) || '0');
  localStorage.setItem(usageKey, (currentUsage + 1).toString());
};

const App: React.FC = () => {
  // 从 localStorage 加载状态
  const [step, setStep] = useState<Step>(() => {
    const savedStep = localStorage.getItem('step');
    return savedStep as Step || 'landing';
  });
  const [result, setResult] = useState<AnalysisResult | null>(() => {
    const savedResult = localStorage.getItem('result');
    return savedResult ? JSON.parse(savedResult) : null;
  });
  const [userImage, setUserImage] = useState<string>(() => {
    return localStorage.getItem('userImage') || '';
  });
  const [error, setError] = useState<string | null>(null);
  const [usageInfo, setUsageInfo] = useState<{ canUse: boolean; remaining: number }>(checkAndUpdateUsage);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBatchDownloading, setIsBatchDownloading] = useState<boolean>(false);
  const [batchDownloadProgress, setBatchDownloadProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [appMode, setAppMode] = useState<AppMode>('test');
  // 批量生成相关的状态（提升到 App 级别，切换模式时保留）
  const [batchResults, setBatchResults] = useState<SeasonalProfile[]>([]);
  const [batchNotes, setBatchNotes] = useState<Record<string, XiaohongshuNote>>({});
  const [batchIsGenerating, setBatchIsGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchCurrentProcessing, setBatchCurrentProcessing] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchAutoGenerateNotes, setBatchAutoGenerateNotes] = useState(true);
  const [batchSelectedModel, setBatchSelectedModel] = useState<ModelType>(ModelType.DOUBAO);
  const [batchGeneratingNotes, setBatchGeneratingNotes] = useState<Set<string>>(new Set());
  const [batchSyncingToFeishu, setBatchSyncingToFeishu] = useState(false);
  const [batchFeishuSyncResult, setBatchFeishuSyncResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [batchTestingSubtype, setBatchTestingSubtype] = useState<string | null>(null);
  const [batchPromptVersion, setBatchPromptVersion] = useState<PromptVersion>('simple');
  const downloadModuleRef = useRef<(() => Promise<{ [key: string]: string }>) | null>(null);

  // 获取所有演示数据（必须在使用前定义）
  const getAllDemos = (): AnalysisResult[] => {
    if (typeof demoData === 'object' && demoData !== null) {
      return Object.values(demoData);
    }
    return [];
  };

  const [demoResults, setDemoResults] = useState<AnalysisResult[]>(() => getAllDemos());

  // 定义固定的类型顺序（按 subtypeNames 定义）
  const SUBTYPE_ORDER = [
    'clear_spring', 'light_spring', 'soft_spring', 'bright_spring',
    'light_summer', 'soft_summer', 'bright_summer', 'deep_summer',
    'soft_autumn', 'bright_autumn', 'deep_autumn', 'light_autumn',
    'soft_winter', 'bright_winter', 'deep_winter', 'clear_winter'
  ];

  // 将 SeasonalProfile 转换为 AnalysisResult 格式
  const convertToAnalysisResult = (profile: SeasonalProfile): AnalysisResult => {
    return {
      subtype: profile.subtype,
      season: profile.season,
      temperature: profile.temperature,
      value_score: profile.value_score,
      chroma: profile.chroma,
      clarity: profile.clarity,
      contrast: profile.contrast,
      body_part_colors: profile.body_part_colors,
      recommended_colors: profile.recommended_colors,
      avoid_colors: profile.avoid_colors,
      detailed_styling_tips: {
        fashion_matching: profile.detailed_styling_tips.fashion_matching,
        celebrity_reference: profile.detailed_styling_tips.celebrity_reference,
        jewelry_colors: profile.detailed_styling_tips.jewelry_colors,
        makeup_details: profile.detailed_styling_tips.makeup_details
      },
      makeup_tips: profile.makeup_tips,
      styling_tips: profile.styling_tips,
      star_reference: profile.detailed_styling_tips.celebrity_reference,
      accessories_tips: profile.detailed_styling_tips.jewelry_colors
    };
  };

  // 组件挂载时从飞书读取数据
  useEffect(() => {
    const loadFromFeishu = async () => {
      try {
        console.log('[App] 尝试从飞书读取数据...');
        const feishuProfiles = await fetchAllProfilesFromFeishu();

        if (Object.keys(feishuProfiles).length > 0) {
          console.log(`[App] 从飞书读取到 ${Object.keys(feishuProfiles).length} 个 profiles`);

          // 转换为 AnalysisResult 并更新 demoResults
          const profilesArray = Object.values(feishuProfiles).map(convertToAnalysisResult);

          // 按固定顺序排列
          const sortedProfiles = SUBTYPE_ORDER
            .map(subtype => profilesArray.find(p => p.subtype === subtype))
            .filter((p): p is AnalysisResult => p !== undefined);

          setDemoResults(sortedProfiles);
          console.log('[App] ✅ 已从飞书加载数据并更新演示界面');
        } else {
          console.log('[App] 飞书没有数据，使用本地 demo-data.json');
        }
      } catch (error: any) {
        console.warn('[App] 从飞书读取数据失败，将使用本地数据:', error.message);
      }
    };

    loadFromFeishu();
  }, []); // 只在挂载时执行一次

  // 同步到测试模式的回调函数（生成色彩后、生成笔记前调用）
  const handleSyncToTestMode = (profile: SeasonalProfile) => {
    setDemoResults(prev => {
      // 合并新旧数据，按固定顺序排列
      const mergedMap = new Map<string, AnalysisResult>();

      // 先加入原有数据
      prev.forEach(demo => {
        mergedMap.set(demo.subtype, demo);
      });

      // 更新新数据
      const newDemo = convertToAnalysisResult(profile);
      mergedMap.set(profile.subtype, newDemo);

      // 按固定顺序重新排列
      return SUBTYPE_ORDER
        .map(subtype => mergedMap.get(subtype))
        .filter((demo): demo is AnalysisResult => demo !== undefined);
    });
    console.log(`[App] ✅ 已同步到测试模式: ${profile.subtype}`);
  };

  // 组件挂载后设置加载状态为 false
  useEffect(() => {
    // 给一个小延迟，确保加载动画能够显示
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    setStep('upload');
    localStorage.setItem('step', 'upload');
  };

  const handleDemoSelect = (demo: AnalysisResult) => {
    setResult(demo);
    localStorage.setItem('result', JSON.stringify(demo));
    setStep('result');
    localStorage.setItem('step', 'result');
  };
  
  // 处理ResultView的下载准备回调
  const handleDownloadReady = (downloadFn: () => Promise<{ [key: string]: string }>) => {
    downloadModuleRef.current = downloadFn;
  };
  
  // 批量下载所有类型
  const handleBatchDownloadAll = async () => {
    if (isBatchDownloading) return;

    const confirmed = window.confirm(
      '将依次打开所有16种色彩类型的结果页面并下载所有模块截图（共128张图片）。\n\n' +
      '这可能需要几分钟时间，请确保网络连接稳定。\n\n' +
      '是否继续？'
    );

    if (!confirmed) return;

    setIsBatchDownloading(true);

    try {
      // 使用更新后的 demoResults 状态，而不是原始的 demo-data.json
      const allDemos = demoResults.length > 0 ? demoResults : getAllDemos();
      console.log(`[批量下载] 使用 ${allDemos.length} 个演示数据进行下载`);
      if (allDemos.length > 0) {
        console.log(`[批量下载] 第一个数据类型: ${allDemos[0].subtype}`);
      }

      setBatchDownloadProgress({ current: 0, total: allDemos.length });

      const zip = new JSZip();
      const subtypeNames: Record<string, string> = {
        clear_spring: '净春型',
        light_spring: '浅春型',
        soft_spring: '柔春型',
        bright_spring: '亮春型',
        light_summer: '浅夏型',
        soft_summer: '柔夏型',
        bright_summer: '亮夏型',
        deep_summer: '深夏型',
        soft_autumn: '柔秋型',
        bright_autumn: '亮秋型',
        deep_autumn: '深秋型',
        light_autumn: '浅秋型',
        soft_winter: '柔冬型',
        bright_winter: '亮冬型',
        deep_winter: '深冬型',
        clear_winter: '净冬型'
      };

      // 依次打开每个类型并下载
      for (let i = 0; i < allDemos.length; i++) {
        const demo = allDemos[i];
        const subtypeName = subtypeNames[demo.subtype] || demo.subtype;
        const folderNumber = i + 1; // 序号从1开始
        const folderName = `${folderNumber}-${subtypeName}`;

        console.log(`[批量下载] 正在下载: ${folderName}`);

        // 打开当前类型的结果页面
        setResult(demo);
        localStorage.setItem('result', JSON.stringify(demo));
        setStep('result');
        localStorage.setItem('step', 'result');
        setBatchDownloadProgress({ current: i + 1, total: allDemos.length });

        // 等待页面渲染完成
        await new Promise<void>(resolve => setTimeout(resolve, 1500));

        // 等待下载方法准备好
        let retries = 0;
        while (!downloadModuleRef.current && retries < 10) {
          await new Promise<void>(resolve => setTimeout(resolve, 200));
          retries++;
        }

        if (downloadModuleRef.current) {
          try {
            // 下载当前页面的所有模块
            const moduleImages = await downloadModuleRef.current();

            // 将图片添加到ZIP，放在对应的文件夹中
            for (const [moduleName, dataUrl] of Object.entries(moduleImages)) {
              const base64 = (dataUrl as string).split(',')[1] || '';
              const fileName = `${folderName}/${moduleName}.png`;
              zip.file(fileName, base64, { base64: true });
            }

            console.log(`✅ 已下载: ${folderName} (${i + 1}/${allDemos.length})`);
          } catch (error) {
            console.error(`下载 ${folderName} 时出错:`, error);
          }
        } else {
          console.warn(`无法获取 ${folderName} 的下载方法`);
        }

        // 清空下载方法引用，准备下一个
        downloadModuleRef.current = null;
      }

      // 生成ZIP文件
      const blob = await zip.generateAsync({ type: 'blob' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      saveAs(blob, `colorscan-16种类型-全部模块-${timestamp}.zip`);

      // 恢复初始状态
      setStep('landing');
      setResult(null);
      localStorage.setItem('step', 'landing');
      localStorage.removeItem('result');

      alert(`✅ 下载完成！\n\n共 ${allDemos.length} 种类型\n每种类型 8 个模块\n总计 ${allDemos.length * 8} 张图片`);
    } catch (error) {
      console.error('批量下载出错:', error);
      alert('下载失败，请重试。\n\n错误信息：' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsBatchDownloading(false);
      setBatchDownloadProgress({ current: 0, total: 0 });
      downloadModuleRef.current = null;
    }
  };
  
  const handleAnalyze = async (file: File) => {
    // 检查使用次数
    const usage = checkAndUpdateUsage();
    if (!usage.canUse) {
      setError('今日使用次数已达上限（10次），请明天再试。');
      return;
    }
    
    setStep('analyzing');
    localStorage.setItem('step', 'analyzing');
    setError(null);

    // Create Base64 for Image
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const base64String = reader.result as string;
        setUserImage(base64String);
        localStorage.setItem('userImage', base64String);
        
        // Remove data URL prefix for API
        const base64Data = base64String.split(',')[1];

        try {
            const data = await analyzeImage(base64Data);
            // 增加使用次数
            incrementUsage();
            // 更新使用次数状态
            setUsageInfo(checkAndUpdateUsage());
            
            setResult(data);
            localStorage.setItem('result', JSON.stringify(data));
            setStep('result');
            localStorage.setItem('step', 'result');
        } catch (err) {
            console.error(err);
            setError('AI 分析服务暂时繁忙，请稍后再试。');
            setStep('upload'); // Go back to upload on error
            localStorage.setItem('step', 'upload');
        }
    };
    reader.onerror = () => {
        setError("图片读取失败");
        setStep('upload');
        localStorage.setItem('step', 'upload');
    };
  };

  const handleReset = () => {
    setStep('landing');
    setResult(null);
    setUserImage('');
    setError(null);
    // 清除 localStorage 中的数据
    localStorage.removeItem('step');
    localStorage.removeItem('result');
    localStorage.removeItem('userImage');
  };

  // 处理分析超时
  const handleAnalysisTimeout = () => {
    setStep('upload');
    setError('分析超时（超过3分钟），请检查网络连接后重新测试');
    localStorage.setItem('step', 'upload');
  };

  // 切换模式 - 只重置测试模式的状态，保留批量生成的状态
  const toggleMode = () => {
    setAppMode(prev => prev === 'test' ? 'batch' : 'test');
    // 只有在切换到测试模式时才重置测试相关状态
    setStep('landing');
    setResult(null);
    setError(null);
    localStorage.removeItem('step');
    localStorage.removeItem('result');
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans relative">
      {/* Mode Toggle Button */}
      <button
        onClick={toggleMode}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg border border-gray-200 hover:shadow-xl hover:scale-105 transition-all"
      >
        <ArrowRightLeft className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          {appMode === 'test' ? '批量生成' : '返回测试'}
        </span>
      </button>

      {/* Mode Indicator */}
      <div className="fixed top-4 left-4 z-50 px-3 py-1.5 bg-white rounded-full shadow-md border border-gray-200">
        {appMode === 'test' ? (
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Scan className="w-4 h-4" />
            测试模式
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
            <Database className="w-4 h-4" />
            批量生成模式
          </div>
        )}
      </div>

      {isLoading ? (
        <AppLoading />
      ) : (
        <>
          {appMode === 'batch' ? (
            <BatchGeneratorPage
              results={batchResults}
              setResults={setBatchResults}
              notes={batchNotes}
              setNotes={setBatchNotes}
              isGenerating={batchIsGenerating}
              setIsGenerating={setBatchIsGenerating}
              progress={batchProgress}
              setProgress={setBatchProgress}
              currentProcessing={batchCurrentProcessing}
              setCurrentProcessing={setBatchCurrentProcessing}
              error={batchError}
              setError={setBatchError}
              autoGenerateNotes={batchAutoGenerateNotes}
              setAutoGenerateNotes={setBatchAutoGenerateNotes}
              selectedModel={batchSelectedModel}
              setSelectedModel={setBatchSelectedModel}
              generatingNotes={batchGeneratingNotes}
              setGeneratingNotes={setBatchGeneratingNotes}
              syncingToFeishu={batchSyncingToFeishu}
              setSyncingToFeishu={setBatchSyncingToFeishu}
              feishuSyncResult={batchFeishuSyncResult}
              setFeishuSyncResult={setBatchFeishuSyncResult}
              testingSubtype={batchTestingSubtype}
              setTestingSubtype={setBatchTestingSubtype}
              promptVersion={batchPromptVersion}
              setPromptVersion={setBatchPromptVersion}
              onSyncToTestMode={handleSyncToTestMode}
            />
          ) : (
            <>
              {step === 'landing' && (
                <Landing
                  onStart={handleStart}
                  onDemoSelect={handleDemoSelect}
                  onBatchDownload={handleBatchDownloadAll}
                  isBatchDownloading={isBatchDownloading}
                  batchDownloadProgress={batchDownloadProgress}
                  demoResults={demoResults}
                />
              )}
              {step === 'upload' && (
                <>
                  {error && (
                    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
                      <div className="bg-red-50 text-red-600 px-6 py-3 rounded-full shadow-lg text-sm font-medium border border-red-100">
                        {error}
                      </div>
                    </div>
                  )}
                  <UploadSection onAnalyze={handleAnalyze} remainingUsage={usageInfo.remaining} />
                </>
              )}
              {step === 'analyzing' && <LoadingScreen onTimeout={handleAnalysisTimeout} />}
              {step === 'result' && result && (
                <ResultView
                  result={result}
                  userImage={userImage}
                  onReset={handleReset}
                  onDownloadReady={isBatchDownloading ? handleDownloadReady : undefined}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default App;