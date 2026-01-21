import React, { useState, useRef, useEffect } from 'react';
import { Step, AnalysisResult } from './types';
import { analyzeImage } from './services/geminiService';
import ResultView from './components/ResultView';

// --- Sub-components for Landing, Upload, Loading ---

const Landing: React.FC<{ onStart: () => void }> = ({ onStart }) => (
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

    <button 
      onClick={onStart}
      className="bg-gray-900 text-white text-lg font-bold py-4 px-16 rounded-full shadow-xl hover:bg-gray-800 transform transition hover:scale-105 active:scale-95"
    >
      开始测试
    </button>
  </div>
);

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
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
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
          <p className="text-sm font-medium text-amber-800">今日剩余使用次数: <span className="font-bold text-lg">{remainingUsage}/8</span></p>
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

const LoadingScreen: React.FC = () => {
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('正在初始化 AI 模型...');
    
    useEffect(() => {
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) return prev;
                if (prev === 20) setMessage('正在识别面部特征...');
                if (prev === 40) setMessage('分析皮肤底色与冷暖调...');
                if (prev === 60) setMessage('计算五维度色彩数据...');
                if (prev === 80) setMessage('生成专属穿搭与妆容建议...');
                return prev + 1;
            });
        }, 300); // 30s approximate total

        return () => clearInterval(timer);
    }, []);

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
        </div>
    );
};

// --- Main App Component ---

// 检查并更新使用次数
const checkAndUpdateUsage = (): { canUse: boolean; remaining: number } => {
  const today = new Date().toDateString();
  const usageData = localStorage.getItem('usageLimit');
  
  let usage = {
    date: today,
    count: 0
  };
  
  if (usageData) {
    const parsed = JSON.parse(usageData);
    if (parsed.date === today) {
      usage = parsed;
    }
  }
  
  const canUse = usage.count < 8;
  
  return { canUse, remaining: 8 - usage.count };
};

// 增加使用次数
const incrementUsage = () => {
  const today = new Date().toDateString();
  const usageData = localStorage.getItem('usageLimit');
  
  let usage = {
    date: today,
    count: 0
  };
  
  if (usageData) {
    const parsed = JSON.parse(usageData);
    if (parsed.date === today) {
      usage = parsed;
    }
  }
  
  usage.count += 1;
  localStorage.setItem('usageLimit', JSON.stringify(usage));
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

  const handleStart = () => {
    setStep('upload');
    localStorage.setItem('step', 'upload');
  };

  const handleAnalyze = async (file: File) => {
    // 检查使用次数
    const usage = checkAndUpdateUsage();
    if (!usage.canUse) {
      setError('今日使用次数已达上限（8次），请明天再试。');
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

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans">
      {step === 'landing' && <Landing onStart={handleStart} />}
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
      {step === 'analyzing' && <LoadingScreen />}
      {step === 'result' && result && (
        <ResultView result={result} userImage={userImage} onReset={handleReset} />
      )}
    </div>
  );
};

export default App;