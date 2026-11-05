import React from 'react';
import { Box, Sparkles, User, Map, Layers } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

interface CategoryCardsProps {
  currentCategory: string;
  onSelectCategory: (slug: string) => void;
  resourceCounts?: Record<string, number>;
}

export const CATEGORIES_DATA = [
  {
    id: 'cat_mods',
    slug: 'mods',
    title: 'مودات وإضافات',
    color: '#FF791F', // Orange
    icon: Box,
    desc: 'إضافات ومودات Bedrock لتوسيع أسلوب اللعب.',
  },
  {
    id: 'cat_shaders',
    slug: 'shaders',
    title: 'شيدرات وريـسورس باك',
    color: '#8ADFFF', // Sky Blue
    icon: Sparkles,
    desc: 'حزم شيدرات وإضاءة واقعية وقوام بدقة عالية.',
  },
  {
    id: 'cat_skins',
    slug: 'skins',
    title: 'سكنات',
    color: '#9D72FF', // Purple
    icon: User,
    desc: 'سكنات وتصاميم أسطورية لشخصيات ماينكرافت.',
  },
  {
    id: 'cat_maps',
    slug: 'maps',
    title: 'خرائط وعوالم',
    color: '#35D16F', // Emerald Green
    icon: Map,
    desc: 'عوالم مغامرة، باركور، وخرائط سرفايفل وبناء.',
  },
  {
    id: 'cat_versions',
    slug: 'versions',
    title: 'إصدارات ماينكرافت',
    color: '#C5CBD5', // Metallic Blue/Silver
    icon: Layers,
    desc: 'تحديثات وتفاصيل إصدارات Minecraft Bedrock.',
  },
];

export const CategoryCards: React.FC<CategoryCardsProps> = ({
  currentCategory,
  onSelectCategory,
  resourceCounts = {},
}) => {
  return (
    <section id="categories-section" className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
          <span>أقسام المحتوى</span>
        </h2>
        {currentCategory !== 'all' && (
          <button
            onClick={() => {
              soundManager.playClick();
              onSelectCategory('all');
            }}
            className="text-xs text-[#FF284A] hover:underline font-semibold cursor-pointer"
          >
            عرض جميع الأقسام
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {CATEGORIES_DATA.map((cat) => {
          const Icon = cat.icon;
          const isSelected = currentCategory === cat.slug;
          const count = resourceCounts[cat.slug] ?? 0;

          return (
            <button
              key={cat.slug}
              type="button"
              onClick={() => {
                soundManager.playCategory();
                onSelectCategory(cat.slug);
              }}
              className={`relative text-right p-4 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden group flex flex-col justify-between h-36 ${
                isSelected
                  ? 'bg-[#151522] shadow-[0_0_20px_rgba(255,255,255,0.06)]'
                  : 'bg-[#101018]/90 hover:bg-[#151522] border-slate-800/90'
              }`}
              style={{
                borderColor: isSelected ? cat.color : undefined,
              }}
            >
              {/* Category accent background aura */}
              <div
                className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 pointer-events-none transition-opacity group-hover:opacity-20"
                style={{ backgroundColor: cat.color }}
              />

              <div className="flex items-start justify-between relative z-10">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center border transition-transform duration-200 group-hover:scale-110"
                  style={{
                    backgroundColor: `${cat.color}15`,
                    borderColor: `${cat.color}40`,
                    color: cat.color,
                  }}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Real Count indicator */}
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  {count} {count === 1 ? 'مورد' : 'موارد'}
                </span>
              </div>

              <div className="relative z-10 mt-auto">
                <h3 className="text-sm font-bold text-slate-100 group-hover:text-white mb-0.5">
                  {cat.title}
                </h3>
                <p className="text-[11px] text-slate-400 line-clamp-1">
                  {cat.desc}
                </p>
              </div>

              {/* Bottom active edge bar */}
              {isSelected && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{ backgroundColor: cat.color }}
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
