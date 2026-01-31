import React, { useState, useEffect, useRef } from 'react';
import { ALL_SUBTYPES, SEASONS, SeasonalProfile, XiaohongshuNote } from '../types2';
import { AIServiceFactory, ModelType } from '../services2/aiService';
import { syncAllProfilesToFeishuWithProgress } from '../services2/feishuService';
import ResultCard from '../components2/ResultCard';
import { Play, Loader2, Copy, CheckCircle, Download, X, RefreshCw, FileText, Upload, Check } from 'lucide-react';

// 提示词版本类型
export type PromptVersion = 'simple' | 'full';

interface BatchGeneratorPageProps {
  // 数据状态
  results: SeasonalProfile[];
  setResults: React.Dispatch<React.SetStateAction<SeasonalProfile[]>>;
  notes: Record<string, XiaohongshuNote>;
  setNotes: React.Dispatch<React.SetStateAction<Record<string, XiaohongshuNote>>>;
  // 控制状态
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  progress: number;
  setProgress: React.Dispatch<React.SetStateAction<number>>;
  currentProcessing: string | null;
  setCurrentProcessing: (value: string | null) => void;
  error: string | null;
  setError: (value: string | null) => void;
  autoGenerateNotes: boolean;
  setAutoGenerateNotes: (value: boolean) => void;
  selectedModel: ModelType;
  setSelectedModel: (value: ModelType) => void;
  generatingNotes: Set<string>;
  setGeneratingNotes: React.Dispatch<React.SetStateAction<Set<string>>>;
  syncingToFeishu: boolean;
  setSyncingToFeishu: (value: boolean) => void;
  feishuSyncResult: { success: number; failed: number; errors: string[] } | null;
  setFeishuSyncResult: (value: { success: number; failed: number; errors: string[] } | null) => void;
  testingSubtype: string | null;
  setTestingSubtype: (value: string | null) => void;
  // 提示词版本
  promptVersion: PromptVersion;
  setPromptVersion: (value: PromptVersion) => void;
  // 同步到测试模式的回调
  onSyncToTestMode?: (profile: SeasonalProfile) => void;
}

// 进度阶段类型
type ProgressPhase = 'idle' | 'generating_colors' | 'generating_notes' | 'syncing_feishu' | 'completed';

const BatchGeneratorPage: React.FC<BatchGeneratorPageProps> = ({
  results, setResults,
  notes, setNotes,
  isGenerating, setIsGenerating,
  progress, setProgress,
  currentProcessing, setCurrentProcessing,
  error, setError,
  autoGenerateNotes, setAutoGenerateNotes,
  selectedModel, setSelectedModel,
  generatingNotes, setGeneratingNotes,
  syncingToFeishu, setSyncingToFeishu,
  feishuSyncResult, setFeishuSyncResult,
  testingSubtype, setTestingSubtype,
  promptVersion, setPromptVersion,
  onSyncToTestMode
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<SeasonalProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [regeneratingSubtype, setRegeneratingSubtype] = useState<string | null>(null);
  const [generatingNoteFor, setGeneratingNoteFor] = useState<string | null>(null);

  // 新增：批量模式进度状态
  const [batchPhase, setBatchPhase] = useState<ProgressPhase>('idle');
  const [batchPhaseProgress, setBatchPhaseProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [batchCompletedCount, setBatchCompletedCount] = useState(0);

  // Auto-scroll to bottom of list when new results arrive
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [results]);

  // 批量生成全部16种类型
  const handleGenerateAll = async () => {
    setIsGenerating(true);
    setResults([]);
    setProgress(0);
    setBatchPhase('generating_colors');
    setBatchCompletedCount(0);
    setBatchPhaseProgress({ current: 0, total: ALL_SUBTYPES.length });
    setFeishuSyncResult(null);
    setError(null);

    const tempResults: SeasonalProfile[] = [];
    let failureCount = 0;
    let lastErrorMessage = "";

    try {
      const aiService = AIServiceFactory.createService(selectedModel);

      // 并行处理所有16个
      const batchPromises = ALL_SUBTYPES.map(async (subtype) => {
        try {
          const profile = await aiService.generateSeasonalProfile(subtype);
          return { subtype, profile, success: true };
        } catch (err: any) {
          console.error(`Failed to generate for ${subtype}`, err);
          return { subtype, error: err, success: false };
        }
      });

      // 等待所有完成
      const batchResults = await Promise.all(batchPromises);

      // 处理结果
      const successfulProfiles: SeasonalProfile[] = [];
      const notePromises: Promise<{ subtype: string; note: XiaohongshuNote | null }>[] = [];

      batchResults.forEach((result) => {
        if (result.success && result.profile) {
          const { profile } = result;
          tempResults.push(profile);
          successfulProfiles.push(profile);
          setResults(prev => [...prev, profile]);

          // 同步到测试模式（生成色彩后、生成笔记前）
          onSyncToTestMode?.(profile);

          // 更新进度
          setBatchCompletedCount(prev => prev + 1);
          setBatchPhaseProgress({ current: batchCompletedCount + 1, total: ALL_SUBTYPES.length });

          // 如果开启了自动生成笔记
          if (autoGenerateNotes) {
            const subtype = profile.subtype;
            console.log(`[自动生成笔记] 开始为 ${subtype} 生成小红书笔记...`);
            setGeneratingNotes(prev => new Set(prev).add(subtype));

            notePromises.push(
              aiService.generateXiaohongshuNote(profile, promptVersion)
                .then(note => {
                  console.log(`[自动生成笔记] ✅ ${subtype} 的小红书笔记生成成功`);
                  setNotes(prev => ({
                    ...prev,
                    [subtype]: note
                  }));
                  setGeneratingNotes(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(subtype);
                    return newSet;
                  });
                  // 返回生成的笔记，用于后续同步
                  return { subtype, note };
                })
                .catch((err: any) => {
                  console.error(`[自动生成笔记] ❌ ${subtype} 的小红书笔记生成失败:`, err);
                  setGeneratingNotes(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(subtype);
                    return newSet;
                  });
                  return { subtype, note: null };
                })
            );
          }
        } else if (!result.success) {
          failureCount++;
          lastErrorMessage = result.error?.message || "Unknown error";
        }
      });

      // 等待所有笔记生成完成
      if (notePromises.length > 0) {
        setBatchPhase('generating_notes');
        setBatchPhaseProgress({ current: 0, total: notePromises.length });
        const noteResults = await Promise.all(notePromises);
        setBatchPhaseProgress({ current: notePromises.length, total: notePromises.length });

        // 收集所有笔记（包括新生成的），用于同步到飞书
        const allNotes: Record<string, XiaohongshuNote> = {};

        // 先添加已有的笔记
        Object.keys(notes).forEach(key => {
          if (notes[key]) {
            allNotes[key] = notes[key];
          }
        });

        // 再添加新生成的笔记（这些可能还没更新到 notes 状态）
        noteResults.forEach(({ subtype, note }) => {
          if (note) {
            allNotes[subtype] = note;
          }
        });

        console.log(`[飞书同步] 收集到 ${Object.keys(allNotes).length} 个笔记用于同步`);

        try {
          // 同步到飞书（带进度回调）
          const syncResult = await syncAllProfilesToFeishuWithProgress(
            successfulProfiles,
            allNotes,
            (current, total, subtype) => {
              setBatchPhaseProgress({ current, total });
              console.log(`[飞书同步] 进度: ${current}/${total} - ${subtype}`);
            }
          );

          console.log(`[飞书同步] ✅ 完成！成功: ${syncResult.success}, 失败: ${syncResult.failed}`);
          if (syncResult.errors.length > 0) {
            console.error('[飞书同步] 错误详情:', syncResult.errors);
          }

          setFeishuSyncResult(syncResult);
          setBatchPhaseProgress({ current: successfulProfiles.length, total: successfulProfiles.length });
        } catch (syncError: any) {
          console.error('[飞书同步] ❌ 同步失败:', syncError);
          setFeishuSyncResult({
            success: 0,
            failed: successfulProfiles.length,
            errors: [syncError.message]
          });
          setBatchPhaseProgress({ current: 0, total: successfulProfiles.length });
        }
      }

      setBatchPhase('completed');
      setProgress(100);

      if (failureCount === ALL_SUBTYPES.length) {
        setError(`All requests failed. Last error: ${lastErrorMessage}`);
      } else if (failureCount > 0) {
        setError(`Completed with ${failureCount} errors. Some profiles are missing.`);
      }

    } catch (err: any) {
      setError(`An unexpected error occurred: ${err?.message}`);
    } finally {
      setIsGenerating(false);
      setCurrentProcessing(null);
    }
  };

  const copyToClipboard = () => {
    const jsonString = JSON.stringify(results, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadJson = () => {
    const jsonString = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "16_seasonal_color_profiles.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 单独打开某个类型
  const handleOpenProfile = (profile: SeasonalProfile) => {
    setSelectedProfile(profile);
    setIsProfileModalOpen(true);
  };

  // 单独复制某个类型
  const handleCopyProfile = (profile: SeasonalProfile) => {
    const jsonString = JSON.stringify(profile, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // 单独重新生成某个类型（闭环流程：生成色彩→同步测试模式→生成笔记→同步飞书）
  const handleRegenerateProfile = async (subtype: string) => {
    setRegeneratingSubtype(subtype);
    setError(null);

    try {
      const aiService = AIServiceFactory.createService(selectedModel);

      // 阶段1: 生成色彩数据
      setBatchPhase('generating_colors');
      const profile = await aiService.generateSeasonalProfile(subtype);

      // 更新结果列表
      setResults(prevResults => {
        const updatedResults = prevResults.map(item =>
          item.subtype === subtype ? profile : item
        );
        if (!updatedResults.some(item => item.subtype === subtype)) {
          updatedResults.push(profile);
        }
        return updatedResults;
      });

      // 同步到测试模式（生成色彩后、生成笔记前）
      onSyncToTestMode?.(profile);

      // 阶段2: 生成小红书笔记（如果开启自动生成）
      if (autoGenerateNotes) {
        setBatchPhase('generating_notes');
        console.log(`[自动生成笔记] 开始为 ${subtype} 生成小红书笔记...`);
        setGeneratingNotes(prev => new Set(prev).add(subtype));

        let generatedNote = null;
        try {
          generatedNote = await aiService.generateXiaohongshuNote(profile, promptVersion);
          console.log(`[自动生成笔记] ✅ ${subtype} 的小红书笔记生成成功`);
          setNotes(prev => ({
            ...prev,
            [subtype]: generatedNote
          }));
        } catch (err: any) {
          console.error(`[自动生成笔记] ❌ ${subtype} 的小红书笔记生成失败:`, err);
        } finally {
          setGeneratingNotes(prev => {
            const newSet = new Set(prev);
            newSet.delete(subtype);
            return newSet;
          });
        }

        // 阶段3: 同步到飞书（使用刚生成的笔记）
        setBatchPhase('syncing_feishu');
        setBatchPhaseProgress({ current: 0, total: 1 });

        const syncResult = await syncAllProfilesToFeishuWithProgress(
          [profile],
          generatedNote ? { [subtype]: generatedNote } : {},
          (current, total, syncSubtype) => {
            setBatchPhaseProgress({ current, total });
          }
        );

        setFeishuSyncResult(syncResult);
        setBatchPhaseProgress({ current: 1, total: 1 });
        setBatchPhase('completed');
      } else {
        // 如果没有自动生成笔记，直接同步到飞书
        setBatchPhase('syncing_feishu');
        setBatchPhaseProgress({ current: 0, total: 1 });

        const syncResult = await syncAllProfilesToFeishuWithProgress(
          [profile],
          {},
          (current, total, syncSubtype) => {
            setBatchPhaseProgress({ current, total });
          }
        );

        setFeishuSyncResult(syncResult);
        setBatchPhaseProgress({ current: 1, total: 1 });
        setBatchPhase('completed');
      }

    } catch (err: any) {
      console.error(`Failed to regenerate for ${subtype}`, err);
      setError(`Failed to regenerate ${subtype}: ${err?.message}`);
      setBatchPhase('idle');
    } finally {
      setRegeneratingSubtype(null);
      // 注意：不在 finally 中重置 batchPhase，让它保持 'completed' 状态以便显示完成信息
    }
  };

  // 测试单个类型（闭环流程：生成色彩→同步测试模式→生成笔记→同步飞书）
  const handleGenerateSingle = async (subtype: string) => {
    setTestingSubtype(subtype);
    setError(null);
    setBatchPhase('generating_colors');
    setBatchPhaseProgress({ current: 0, total: 1 });
    setFeishuSyncResult(null);

    try {
      const aiService = AIServiceFactory.createService(selectedModel);

      // 阶段1: 生成色彩数据
      const profile = await aiService.generateSeasonalProfile(subtype);
      setBatchPhaseProgress({ current: 1, total: 1 });

      // 更新结果列表
      setResults(prevResults => {
        const updatedResults = prevResults.map(item =>
          item.subtype === subtype ? profile : item
        );
        if (!updatedResults.some(item => item.subtype === subtype)) {
          updatedResults.push(profile);
        }
        return updatedResults;
      });

      // 同步到测试模式（生成色彩后、生成笔记前）
      onSyncToTestMode?.(profile);

      // 阶段2: 生成小红书笔记（如果开启自动生成）
      if (autoGenerateNotes) {
        setBatchPhase('generating_notes');
        setBatchPhaseProgress({ current: 0, total: 1 });

        let generatedNote = null;
        try {
          generatedNote = await aiService.generateXiaohongshuNote(profile, promptVersion);
          setNotes(prev => ({
            ...prev,
            [subtype]: generatedNote
          }));
        } catch (err: any) {
          console.error(`Failed to auto-generate note for ${subtype}`, err);
        }

        setBatchPhaseProgress({ current: 1, total: 1 });

        // 阶段3: 同步到飞书（使用刚生成的笔记）
        setBatchPhase('syncing_feishu');
        setBatchPhaseProgress({ current: 0, total: 1 });

        const syncResult = await syncAllProfilesToFeishuWithProgress(
          [profile],
          generatedNote ? { [subtype]: generatedNote } : {},
          (current, total, syncSubtype) => {
            setBatchPhaseProgress({ current, total });
          }
        );

        setFeishuSyncResult(syncResult);
        setBatchPhaseProgress({ current: 1, total: 1 });
        setBatchPhase('completed');
      } else {
        // 如果没有自动生成笔记，直接同步到飞书
        setBatchPhase('syncing_feishu');
        setBatchPhaseProgress({ current: 0, total: 1 });

        const syncResult = await syncAllProfilesToFeishuWithProgress(
          [profile],
          {},
          (current, total, syncSubtype) => {
            setBatchPhaseProgress({ current, total });
          }
        );

        setFeishuSyncResult(syncResult);
        setBatchPhaseProgress({ current: 1, total: 1 });
        setBatchPhase('completed');
      }

    } catch (err: any) {
      console.error(`Failed to generate for ${subtype}`, err);
      setError(`Failed to generate ${subtype}: ${err?.message}`);
      setBatchPhase('idle');
    } finally {
      setTestingSubtype(null);
      // 注意：不在 finally 中重置 batchPhase，让它保持 'completed' 状态以便显示完成信息
      // batchPhase 会在下次点击按钮时被重置
    }
  };

  // 生成小红书笔记
  const handleGenerateXiaohongshuNote = async (profile: SeasonalProfile) => {
    setGeneratingNoteFor(profile.subtype);
    setError(null);

    try {
      const aiService = AIServiceFactory.createService(selectedModel);
      const note = await aiService.generateXiaohongshuNote(profile, promptVersion);

      setNotes(prev => ({
        ...prev,
        [profile.subtype]: note
      }));
    } catch (err: any) {
      console.error(`Failed to generate Xiaohongshu note for ${profile.subtype}`, err);
      setError(`生成小红书笔记失败: ${err?.message}`);
    } finally {
      setGeneratingNoteFor(null);
    }
  };

  // Helper function to get phase text
  const getPhaseText = () => {
    switch (batchPhase) {
      case 'generating_colors':
        return '生成色彩数据中...';
      case 'generating_notes':
        return '生成小红书笔记中...';
      case 'syncing_feishu':
        return '同步到飞书中...';
      case 'completed':
        return '全部完成！';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-4rem)]">

        {/* Left Column: Controls & Preview */}
        <div className="flex flex-col gap-6 h-full">
          <header>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              Seasonal Color Data Generator
            </h1>
            <p className="text-gray-600 mt-2">
              Automated batch generation of "16 Seasonal Color Types" profiles using multiple AI models.
            </p>
          </header>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Batch Control</h2>
            </div>

            {/* Model Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">AI Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as ModelType)}
                disabled={isGenerating}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value={ModelType.DOUBAO}>Doubao (Volcano Ark)</option>
                <option value={ModelType.DEEPSEEK}>DeepSeek V3.2</option>
              </select>
            </div>

            {/* Prompt Version Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">笔记提示词版本</label>
              <select
                value={promptVersion}
                onChange={(e) => setPromptVersion(e.target.value as PromptVersion)}
                disabled={isGenerating}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="simple">简洁版 - 快速生成</option>
                <option value="full">完整版 - 74个标题模板</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {promptVersion === 'simple'
                  ? '简洁版：直接生成，适合快速产出'
                  : '完整版：使用74个爆款标题模板，标题更有冲击力'}
              </p>
            </div>

            {/* Auto Generate Notes Toggle */}
            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={autoGenerateNotes}
                    onChange={(e) => setAutoGenerateNotes(e.target.checked)}
                    disabled={isGenerating}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
                    autoGenerateNotes ? 'bg-pink-500' : 'bg-gray-300'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      autoGenerateNotes ? 'translate-x-5' : 'translate-x-0.5'
                    } mt-0.5`}></div>
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-700">自动生成小红书笔记</span>
                  <p className="text-xs text-gray-500 mt-0.5">色彩分析完成后自动生成对应的小红书笔记</p>
                </div>
              </label>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            {/* Phase Progress Display */}
            {isGenerating && batchPhase !== 'idle' && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700">{getPhaseText()}</span>
                  <span className="text-xs text-blue-600">
                    {batchPhaseProgress.current}/{batchPhaseProgress.total}
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(batchPhaseProgress.current / batchPhaseProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Completion Status */}
            {batchPhase === 'completed' && feishuSyncResult && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    ✅ 数据已同步到飞书 ({feishuSyncResult.success} 条)
                  </span>
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-sm text-center font-medium mt-2 p-2 bg-red-50 rounded border border-red-100">{error}</p>}

            <div className="flex flex-col gap-2 mt-4">
                <button
                onClick={handleGenerateAll}
                disabled={isGenerating}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-white shadow-md transition-all
                    ${isGenerating
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg active:scale-95'}`}
                >
                {isGenerating ? (
                    <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {batchPhase === 'syncing_feishu' ? '同步到飞书中...' : '生成中...'}
                    </>
                ) : (
                    <>
                    <Play className="w-5 h-5" />
                    Start Batch Generation (16 Types)
                    </>
                )}
                </button>

                {/* 批量模式下不需要手动同步按钮了，因为是自动同步的 */}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Individual Testing</h2>
              {isGenerating && (
                <span className="text-xs text-gray-500">
                  已完成: {batchCompletedCount}/16
                </span>
              )}
            </div>

            <div className="space-y-4">
              {Object.entries(SEASONS).map(([season, subtypes]) => (
                <div key={season} className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-600 capitalize">{season} season</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {subtypes.map((subtype) => {
                      const isTesting = testingSubtype === subtype;
                      const existingResult = results.find(r => r.subtype === subtype);

                      return (
                        <button
                          key={subtype}
                          onClick={() => handleGenerateSingle(subtype)}
                          disabled={isTesting || isGenerating}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 relative
                            ${isTesting
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                              : existingResult
                                ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                            }
                          `}
                        >
                          {isTesting ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span className="text-xs">生成中...</span>
                            </>
                          ) : (
                            <>
                              {existingResult && <CheckCircle className="w-3 h-3 text-green-500" />}
                              <span className="capitalize">{subtype.replace('_', ' ')}</span>
                            </>
                          )}

                          {/* 测试时的进度指示 */}
                          {isTesting && batchPhase !== 'idle' && (
                            <div className="absolute -top-1 -right-1">
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Visual Cards */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
             <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h2 className="font-semibold text-gray-700">Generated Profiles ({results.length}/16)</h2>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    disabled={results.length === 0}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors disabled:opacity-50"
                  >
                    {copied ? <CheckCircle className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy All'}
                  </button>
                  <button
                    onClick={downloadJson}
                    disabled={results.length === 0}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {results.length === 0 && !isGenerating && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <Palette className="w-12 h-12 mb-2 opacity-20" />
                        <p>No results yet. Click Start to generate.</p>
                    </div>
                )}
                {results.map((profile, idx) => (
                    <ResultCard
                      key={`${profile.subtype}-${idx}`}
                      data={profile}
                      onOpen={handleOpenProfile}
                      onCopy={handleCopyProfile}
                      onRegenerate={handleRegenerateProfile}
                      loading={regeneratingSubtype === profile.subtype}
                      xiaohongshuNote={notes[profile.subtype]}
                      onGenerateNote={handleGenerateXiaohongshuNote}
                      generatingNote={generatingNoteFor === profile.subtype}
                      autoGenerateMode={autoGenerateNotes}
                    />
                ))}
                 <div ref={messagesEndRef} />
             </div>
        </div>
      </div>

      {/* Individual Profile Modal */}
      {isProfileModalOpen && selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 px-6 border-b border-gray-200 bg-gray-50">
                    <div>
                        <h2 className="text-gray-800 font-bold text-xl capitalize">{selectedProfile.subtype.replace('_', ' ')}</h2>
                        <p className="text-gray-600 text-sm capitalize">{selectedProfile.season} Season</p>
                    </div>
                    <button
                        onClick={() => setIsProfileModalOpen(false)}
                        className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-gray-400 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-6">
                    {/* Five Dimensions Evaluation */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Five Dimensions Evaluation</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500">Temperature</p>
                                <p className="font-mono text-lg">{selectedProfile.temperature}/100</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500">Value</p>
                                <p className="font-mono text-lg">{selectedProfile.value_score}/100</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500">Chroma</p>
                                <p className="font-mono text-lg">{selectedProfile.chroma}/100</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500">Clarity</p>
                                <p className="font-mono text-lg">{selectedProfile.clarity}/100</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500">Contrast</p>
                                <p className="font-mono text-lg">{selectedProfile.contrast}/100</p>
                            </div>
                        </div>
                    </div>

                    {/* Body Part Colors */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Body Part Colors</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {selectedProfile.body_part_colors.map((part, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                                    <div
                                        className="w-8 h-8 rounded-full border border-gray-200 shadow-sm"
                                        style={{ backgroundColor: part.color }}
                                    ></div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{part.part}</p>
                                        <p className="text-xs font-mono text-gray-600">{part.color}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recommended Colors */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Recommended Colors</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {selectedProfile.recommended_colors.map((color, idx) => (
                                <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                                    <div
                                        className="w-12 h-12 rounded-full border border-gray-200 shadow-sm mb-2 mx-auto"
                                        style={{ backgroundColor: color.hex }}
                                    ></div>
                                    <p className="text-sm font-medium text-center text-gray-800">{color.name}</p>
                                    <p className="text-xs font-mono text-center text-gray-600">{color.hex}</p>
                                    <p className="text-xs text-center text-gray-500 mt-1 line-clamp-2">{color.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Avoid Colors */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Avoid Colors</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {selectedProfile.avoid_colors.map((color, idx) => (
                                <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                                    <div
                                        className="w-12 h-12 rounded-full border border-gray-200 shadow-sm relative mb-2 mx-auto"
                                        style={{ backgroundColor: color.hex }}
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm font-bold">X</div>
                                    </div>
                                    <p className="text-sm font-medium text-center text-gray-800">{color.name}</p>
                                    <p className="text-xs font-mono text-center text-gray-600">{color.hex}</p>
                                    <p className="text-xs text-center text-gray-500 mt-1 line-clamp-2">{color.reason}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Styling Tips */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Styling Tips</h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="mb-3">
                                <h4 className="font-medium text-gray-700 mb-1">Fashion Matching</h4>
                                <p className="text-sm text-gray-600">{selectedProfile.detailed_styling_tips.fashion_matching}</p>
                            </div>
                            <div className="mb-3">
                                <h4 className="font-medium text-gray-700 mb-1">Celebrity Reference</h4>
                                <p className="text-sm text-gray-600">{selectedProfile.detailed_styling_tips.celebrity_reference}</p>
                            </div>
                            <div className="mb-3">
                                <h4 className="font-medium text-gray-700 mb-1">Jewelry Colors</h4>
                                <p className="text-sm text-gray-600">{selectedProfile.detailed_styling_tips.jewelry_colors}</p>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-700 mb-1">Makeup Details</h4>
                                <p className="text-sm text-gray-600">{selectedProfile.detailed_styling_tips.makeup_details}</p>
                            </div>
                        </div>
                    </div>

                    {/* 小红书笔记区域 */}
                    {notes[selectedProfile.subtype] && (
                        <div className="mb-6 border-t border-pink-200 pt-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-pink-600" />
                                小红书笔记
                            </h3>
                            <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                                <h4 className="font-bold text-pink-800 text-base mb-3">{notes[selectedProfile.subtype].title}</h4>
                                <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed mb-4">
                                    {notes[selectedProfile.subtype].content}
                                </div>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {notes[selectedProfile.subtype].tags.map((tag, idx) => (
                                        <span key={idx} className="text-xs text-pink-600 bg-pink-100 px-3 py-1 rounded-full">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                <button
                                    onClick={() => {
                                        const note = notes[selectedProfile.subtype];
                                        const noteText = `${note.title}\n\n${note.content}\n\n${note.tags.join(' ')}`;
                                        navigator.clipboard.writeText(noteText);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-md transition-colors"
                                >
                                    {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                    复制笔记
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-center gap-3 mt-8">
                        <button
                            onClick={() => handleCopyProfile(selectedProfile)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                        >
                            <Copy className="w-4 h-4" />
                            Copy Profile
                        </button>
                        <button
                            onClick={() => {
                                setIsProfileModalOpen(false);
                                handleRegenerateProfile(selectedProfile.subtype);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Regenerate
                        </button>
                        <button
                            onClick={() => handleGenerateXiaohongshuNote(selectedProfile)}
                            disabled={generatingNoteFor === selectedProfile.subtype || (autoGenerateNotes && !notes[selectedProfile.subtype])}
                            className="flex items-center gap-2 px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generatingNoteFor === selectedProfile.subtype ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <FileText className="w-4 h-4" />
                                    {notes[selectedProfile.subtype] ? 'Re-gen Note' : 'Gen Note'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

// Simple Icon component to use inside App if needed, though used in ResultCard
const Palette = ({ className }: { className?: string }) => (
    <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    >
        <circle cx="13.5" cy="6.5" r=".5"></circle>
        <circle cx="17.5" cy="10.5" r=".5"></circle>
        <circle cx="8.5" cy="7.5" r=".5"></circle>
        <circle cx="6.5" cy="12.5" r=".5"></circle>
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>
    </svg>
);

export default BatchGeneratorPage;
