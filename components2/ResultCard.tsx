import React, { useState } from 'react';
import { SeasonalProfile, XiaohongshuNote } from '../types2';
import { Palette, AlertCircle, Copy, RefreshCw, ExternalLink, FileText } from 'lucide-react';

interface ResultCardProps {
  data: SeasonalProfile;
  onOpen?: (data: SeasonalProfile) => void;
  onCopy?: (data: SeasonalProfile) => void;
  onRegenerate?: (subtype: string) => void;
  loading?: boolean;
  xiaohongshuNote?: XiaohongshuNote;
  onGenerateNote?: (data: SeasonalProfile) => void;
  generatingNote?: boolean;
  autoGenerateMode?: boolean;
}

const ResultCard: React.FC<ResultCardProps> = ({
  data,
  onOpen,
  onCopy,
  onRegenerate,
  loading,
  xiaohongshuNote,
  onGenerateNote,
  generatingNote,
  autoGenerateMode = false
}) => {
  const [showNote, setShowNote] = useState(false);
  const getSeasonColor = (season: string) => {
    switch (season) {
      case 'spring': return 'border-pink-300 bg-pink-50';
      case 'summer': return 'border-blue-300 bg-blue-50';
      case 'autumn': return 'border-orange-300 bg-orange-50';
      case 'winter': return 'border-purple-300 bg-purple-50';
      default: return 'border-gray-200 bg-white';
    }
  };

  const handleCopy = () => {
    onCopy?.(data);
  };

  const handleOpen = () => {
    onOpen?.(data);
  };

  const handleRegenerate = () => {
    onRegenerate?.(data.subtype);
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${getSeasonColor(data.season)} shadow-sm transition-all mb-4 hover:shadow-md relative`}>
      {/* Loading Indicator */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10 animate-pulse">
          <div className="flex flex-col items-center">
            <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mb-2" />
            <span className="text-sm font-medium text-gray-700">Regenerating...</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold capitalize text-gray-800">{data.subtype.replace('_', ' ')}</h3>
          <p className="text-sm text-gray-500 capitalize">{data.season} Season</p>
        </div>
        <div className="flex gap-2">
          <div className="text-center">
            <div className="text-xs text-gray-400">Temp</div>
            <div className="font-mono text-sm">{data.temperature}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">Contrast</div>
            <div className="font-mono text-sm">{data.contrast}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Recommended Colors */}
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-green-700 mb-2">
            <Palette className="w-4 h-4" /> Recommended
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {data.recommended_colors.slice(0, 8).map((c, i) => (
              <div key={i} className="group relative flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full border border-gray-200 shadow-sm"
                  style={{ backgroundColor: c.hex }}
                ></div>
                <span className="text-[10px] text-gray-600 mt-1 truncate max-w-full">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Avoid Colors */}
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-red-700 mb-2">
            <AlertCircle className="w-4 h-4" /> Avoid
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {data.avoid_colors.slice(0, 4).map((c, i) => (
              <div key={i} className="group relative flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full border border-gray-200 shadow-sm relative"
                  style={{ backgroundColor: c.hex }}
                >
                   <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs font-bold">X</div>
                </div>
                <span className="text-[10px] text-gray-600 mt-1 truncate max-w-full">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200/50 mb-4">
        <p className="text-sm text-gray-700 line-clamp-3 italic">
          "{data.detailed_styling_tips.fashion_matching}"
        </p>
      </div>

      {/* 自动生成模式下的提示 */}
      {autoGenerateMode && generatingNote && !xiaohongshuNote && (
        <div className="mb-4 p-2 bg-pink-50 border border-pink-200 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-pink-700">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>正在自动生成小红书笔记...</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
          title="Copy this profile"
        >
          <Copy className="w-3 h-3" />
          Copy
        </button>
        <button
          onClick={handleRegenerate}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Regenerate this profile"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3" />
              Regen
            </>
          )}
        </button>
        <button
          onClick={() => onGenerateNote?.(data)}
          disabled={generatingNote || loading || (autoGenerateMode && !xiaohongshuNote)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={autoGenerateMode && !xiaohongshuNote ? "自动生成模式下不可手动生成" : "Generate Xiaohongshu note"}
        >
          {generatingNote ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="w-3 h-3" />
              {xiaohongshuNote ? 'Re-gen Note' : 'Gen Note'}
            </>
          )}
        </button>
        <button
          onClick={handleOpen}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md transition-colors"
          title="Open details"
        >
          <ExternalLink className="w-3 h-3" />
          Open
        </button>
      </div>

      {/* 小红书笔记展示区域 */}
      {xiaohongshuNote && (
        <div className="mt-4 pt-4 border-t border-pink-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-pink-700 flex items-center gap-1">
              <FileText className="w-4 h-4" />
              小红书笔记
            </h4>
            <button
              onClick={() => setShowNote(!showNote)}
              className="text-xs text-pink-600 hover:text-pink-700"
            >
              {showNote ? '收起' : '展开'}
            </button>
          </div>
          {showNote && (
            <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
              <div className="mb-3">
                <h5 className="font-bold text-pink-800 text-sm mb-2">{xiaohongshuNote.title}</h5>
                <div className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                  {xiaohongshuNote.content}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {xiaohongshuNote.tags.map((tag, idx) => (
                  <span key={idx} className="text-xs text-pink-600 bg-pink-100 px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
              <button
                onClick={() => {
                  const noteText = `${xiaohongshuNote.title}\n\n${xiaohongshuNote.content}\n\n${xiaohongshuNote.tags.join(' ')}`;
                  navigator.clipboard.writeText(noteText);
                }}
                className="mt-3 flex items-center gap-1 text-xs text-pink-700 hover:text-pink-800"
              >
                <Copy className="w-3 h-3" />
                复制笔记
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResultCard;
