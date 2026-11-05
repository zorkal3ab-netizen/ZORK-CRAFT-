import React from 'react';
import { Download, Sparkles, Smartphone, Eye } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

export interface ResourceItem {
  id: string;
  title: string;
  short_description: string;
  full_description: string;
  category_id: string;
  category_slug: string;
  category_title?: string;
  category_color?: string;
  mc_version: string;
  supported_devices: string;
  creator_name: string;
  source_url?: string;
  license_info?: string;
  cover_image: string;
  is_published: number;
  is_featured: number;
  install_instructions?: string;
  changelog?: string;
  real_download_count?: number;
  image_count?: number;
  file_count?: number;
  created_at: string;
  updated_at: string;
}

interface ResourceCardProps {
  resource: ResourceItem;
  onSelect: (resource: ResourceItem) => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onSelect }) => {
  const categoryColor = resource.category_color || '#FF791F';
  const downloadCount = resource.real_download_count || 0;

  return (
    <div
      onClick={() => {
        soundManager.playModal();
        onSelect(resource);
      }}
      className="group relative flex flex-col bg-[#101018] rounded-xl border border-slate-800/80 hover:border-slate-700 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)] cursor-pointer"
    >
      {/* Featured Star/Ribbon */}
      {resource.is_featured === 1 && (
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-[#07070B]/85 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-semibold text-amber-400 border border-amber-500/30">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>مميّز</span>
        </div>
      )}

      {/* Cover Image Container */}
      <div className="relative w-full aspect-[16/10] bg-[#07070B] overflow-hidden">
        <img
          src={resource.cover_image}
          alt={resource.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Styled fallback container on image error
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        {/* Subtle dark gradient scrim at bottom of image */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#101018] via-transparent to-transparent opacity-80" />

        {/* Category Accent Indicator */}
        <div
          className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#07070B]/90 backdrop-blur-md border border-slate-800"
          style={{ color: categoryColor }}
        >
          {resource.category_title || resource.category_slug}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-100 group-hover:text-white transition-colors mb-1.5 line-clamp-1">
            {resource.title}
          </h3>

          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
            {resource.short_description}
          </p>
        </div>

        <div>
          {/* Unboxed Metadata with · separator */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mb-3.5 flex-wrap">
            <span>{resource.mc_version}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-slate-500" />
              <span className="truncate max-w-[120px]">{resource.supported_devices}</span>
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="flex items-center gap-1 text-slate-300">
              <Download className="w-3 h-3 text-[#35D16F]" />
              <span className="tabular-nums font-semibold">{downloadCount}</span>
            </span>
          </div>

          {/* Action button */}
          <button
            type="button"
            className="w-full py-2 px-3 text-xs font-semibold text-slate-200 bg-slate-900 group-hover:bg-[#FF284A] group-hover:text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-slate-800 group-hover:border-[#FF284A]"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>تفاصيل المورد</span>
          </button>
        </div>
      </div>
    </div>
  );
};
