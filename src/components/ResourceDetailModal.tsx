import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ArrowRight,
  Download,
  ExternalLink,
  Calendar,
  Smartphone,
  Layers,
  User,
  ShieldCheck,
  FileCode,
  FileText,
  CheckCircle2,
  Maximize2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HardDrive,
  Cpu,
  Flame,
} from 'lucide-react';
import { soundManager } from '../utils/soundManager';

interface ResourceDetailModalProps {
  resourceId: string;
  onClose: () => void;
  onDownloadCompleted?: (resourceId: string) => void;
  onSelectResource?: (id: string) => void;
}

export const ResourceDetailModal: React.FC<ResourceDetailModalProps> = ({
  resourceId,
  onClose,
  onDownloadCompleted,
  onSelectResource,
}) => {
  const [data, setData] = useState<any | null>(null);
  const [relatedResources, setRelatedResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isLightbox, setIsLightbox] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Load resource details and related items
  useEffect(() => {
    let isMounted = true;
    async function loadResource() {
      try {
        setLoading(true);
        const res = await fetch(`/api/resources/${resourceId}`);
        const json = await res.json();
        if (!isMounted) return;
        if (json.success && json.resource) {
          setData(json.resource);
          setCurrentImageIndex(0);

          // Update browser hash for shareable URL without reload
          if (window.location.hash !== `#resource-${resourceId}`) {
            window.history.replaceState(null, '', `#resource-${resourceId}`);
          }

          // Fetch related resources in the same category
          if (json.resource.category_slug) {
            try {
              const relRes = await fetch(`/api/resources?category=${json.resource.category_slug}`);
              const relJson = await relRes.json();
              if (isMounted && relJson.success && Array.isArray(relJson.resources)) {
                setRelatedResources(
                  relJson.resources
                    .filter((r: any) => r.id !== resourceId && r.is_published === 1)
                    .slice(0, 4)
                );
              }
            } catch {}
          }
        } else {
          setError(json.message || 'تعذر تحميل بيانات المورد.');
        }
      } catch (err: any) {
        if (isMounted) setError('حدث خطأ في الاتصال بالخادم.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadResource();

    return () => {
      isMounted = false;
    };
  }, [resourceId]);

  // Clean hash when modal closes
  const handleClose = () => {
    soundManager.playClick();
    if (window.location.hash.startsWith('#resource-')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    onClose();
  };

  // Copy shareable link
  const handleCopyLink = async () => {
    soundManager.playClick();
    const shareUrl = `${window.location.origin}${window.location.pathname}#resource-${resourceId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Download handler
  const handleDownloadFile = async (file: any) => {
    soundManager.playDownload();
    setDownloadingId(file.id);

    try {
      const downloadUrl = `/api/download/${data.id}/${file.id}`;

      if (file.is_external === 1) {
        const res = await fetch(`${downloadUrl}?json=true`);
        const json = await res.json();
        if (json.success && json.redirectUrl) {
          const a = document.createElement('a');
          a.href = json.redirectUrl;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          window.location.href = downloadUrl;
        }
      } else {
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = file.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      setData((prev: any) => ({
        ...prev,
        real_download_count: (prev.real_download_count || 0) + 1,
      }));

      if (onDownloadCompleted) {
        onDownloadCompleted(data.id);
      }
    } catch {
      soundManager.playError();
    } finally {
      setTimeout(() => {
        setDownloadingId(null);
      }, 1200);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
        <div className="bg-[#101018] border border-slate-800 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-12 h-12 border-3 border-[#FF284A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-200 font-bold">جاري تجهيز تفاصيل المورد...</p>
          <p className="text-xs text-slate-500 mt-1 font-mono">ZORK CRAFT BEDROCK</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
        <div className="bg-[#101018] border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
          <p className="text-sm text-red-400 mb-4 font-semibold">{error || 'المورد غير متوفر.'}</p>
          <button
            onClick={handleClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            إغلاق والعودة
          </button>
        </div>
      </div>
    );
  }

  // Display Settings with safe fallbacks
  const ds = data.display_settings || {};
  const showCreator = ds.show_creator_name !== false && !!data.creator_name;
  const showSourceUrl = ds.show_source_url !== false && !!data.source_url;
  const showFileSize = ds.show_file_size !== false;
  const showMcVersion = ds.show_mc_version !== false && !!data.mc_version;
  const showSupportedDevices = ds.show_supported_devices !== false && !!data.supported_devices;
  const showRequirements = ds.show_requirements !== false;
  const showInstallInstructions = ds.show_install_instructions !== false && !!data.install_instructions;
  const showChangelog = ds.show_changelog !== false && !!data.changelog;
  const showLicense = ds.show_license !== false;
  const showGallery = ds.show_gallery !== false;
  const showRelated = ds.show_related !== false && relatedResources.length > 0;

  // Build image list
  const additionalImages = showGallery ? (data.images || []).map((img: any) => img.image_url) : [];
  const allImages = [data.cover_image, ...additionalImages].filter(Boolean);
  const activeImage = allImages[currentImageIndex] || data.cover_image;

  // Primary file for quick download button
  const primaryFile = data.files && data.files.length > 0 ? data.files[0] : null;
  const totalFileSizeMb = data.files && data.files.length > 0
    ? (data.files.reduce((acc: number, f: any) => acc + (f.file_size || 0), 0) / (1024 * 1024))
    : 0;

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || allImages.length <= 1) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // swipe left -> next
        setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
      } else {
        // swipe right -> prev
        setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
      }
    }
    setTouchStartX(null);
  };

  // Format installation steps as numbered list
  const installSteps = data.install_instructions
    ? data.install_instructions
        .split('\n')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
    : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-0 sm:p-3 md:p-6 overflow-y-auto"
      onClick={handleClose}
      dir="rtl"
    >
      <div
        className="relative w-full max-w-3xl bg-[#0c0c12] border border-slate-800/90 sm:rounded-2xl shadow-2xl flex flex-col h-full sm:h-auto sm:max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==========================================================================
            1. TOP BACK & SHARE NAVIGATION BAR (Arabic "رجوع" + Category + Copy Link)
            ========================================================================== */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800/80 bg-[#09090e]/95 backdrop-blur-md sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3">
            {/* Back Button with clean Arabic label and right arrow */}
            <button
              onClick={handleClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-bold active:scale-95 cursor-pointer shadow-sm"
              title="رجوع للقائمة السابقة"
            >
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <span>رجوع</span>
            </button>

            {/* Category Pill with color indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-bold">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: data.category_color || '#FF284A' }}
              />
              <span style={{ color: data.category_color || '#FF284A' }}>
                {data.category_title || 'مود'}
              </span>
            </div>

            {/* Featured Badge if set */}
            {data.is_featured === 1 && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300">
                <Flame className="w-3 h-3 text-amber-400" />
                <span>مميز</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Page Link Button */}
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="نسخ رابط الصفحة"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedLink ? 'تم نسخ الرابط' : 'نسخ رابط الصفحة'}</span>
            </button>

            {/* Close Cross */}
            <button
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors cursor-pointer"
              aria-label="إغلاق النافذة"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ==========================================================================
            SCROLLABLE CONTENT BODY (Screenshot-matched layout)
            ========================================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-28">
          {/* Main Title & Short Description */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
              {data.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-1.5">
              {data.short_description}
            </p>
          </div>

          {/* ==========================================================================
              2. MAIN IMAGE GALLERY WITH SWIPE & THUMBNAILS
              ========================================================================== */}
          <div className="space-y-2.5">
            <div
              className="relative w-full aspect-[16/9] sm:aspect-[21/9] bg-black rounded-2xl overflow-hidden border border-slate-800/90 shadow-xl group select-none"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={activeImage}
                alt={data.title}
                className="w-full h-full object-cover sm:object-contain transition-transform duration-300"
                referrerPolicy="no-referrer"
              />

              {/* Navigation Arrows (if multiple images) */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/60 hover:bg-black/90 text-white backdrop-blur-sm border border-white/10 transition-all opacity-80 hover:opacity-100 cursor-pointer"
                    aria-label="الصورة السابقة"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev + 1) % allImages.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/60 hover:bg-black/90 text-white backdrop-blur-sm border border-white/10 transition-all opacity-80 hover:opacity-100 cursor-pointer"
                    aria-label="الصورة التالية"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Lightbox Trigger */}
              <button
                onClick={() => setIsLightbox(true)}
                className="absolute bottom-2.5 left-2.5 p-2 bg-black/70 hover:bg-black/90 text-white rounded-xl backdrop-blur-sm border border-white/10 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                title="عرض الصورة بحجم كامل"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              {/* Image Counter Badge */}
              {allImages.length > 1 && (
                <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10 text-[11px] font-mono text-white/90">
                  {currentImageIndex + 1} / {allImages.length}
                </div>
              )}
            </div>

            {/* Thumbnail Carousel */}
            {allImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1 scrollbar-thin">
                {allImages.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => {
                      soundManager.playClick();
                      setCurrentImageIndex(idx);
                    }}
                    className={`relative w-16 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      currentImageIndex === idx
                        ? 'border-[#FF284A] shadow-md shadow-[#FF284A]/20 scale-105'
                        : 'border-slate-800 opacity-60 hover:opacity-90'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ==========================================================================
              3. METALLIC DARK CARDS GRID (2 Columns on Mobile - Strict Toggle Respect)
              ========================================================================== */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* Card 1: File Size */}
            {showFileSize && totalFileSizeMb > 0 && (
              <div className="p-3 rounded-xl bg-gradient-to-b from-[#13131c] to-[#0c0c12] border border-slate-800/90 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-950/40 border border-red-500/30 flex items-center justify-center shrink-0">
                  <HardDrive className="w-4 h-4 text-[#FF284A]" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-medium">حجم الملف</span>
                  <span className="text-xs sm:text-sm font-bold text-white font-mono truncate block">
                    {totalFileSizeMb < 1 ? `${(totalFileSizeMb * 1024).toFixed(0)} KB` : `${totalFileSizeMb.toFixed(1)} MB`}
                  </span>
                </div>
              </div>
            )}

            {/* Card 2: Minecraft Version */}
            {showMcVersion && (
              <div className="p-3 rounded-xl bg-gradient-to-b from-[#13131c] to-[#0c0c12] border border-slate-800/90 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-950/40 border border-orange-500/30 flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4 text-orange-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-medium">إصدار اللعبة</span>
                  <span className="text-xs sm:text-sm font-bold text-white font-mono truncate block">
                    {data.mc_version}
                  </span>
                </div>
              </div>
            )}

            {/* Card 3: Real Downloads */}
            <div className="p-3 rounded-xl bg-gradient-to-b from-[#13131c] to-[#0c0c12] border border-slate-800/90 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-medium">التحميلات</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-400 font-mono tabular-nums truncate block">
                  {data.real_download_count || 0}
                </span>
              </div>
            </div>

            {/* Card 4: Date Added */}
            <div className="p-3 rounded-xl bg-gradient-to-b from-[#13131c] to-[#0c0c12] border border-slate-800/90 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-950/40 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-blue-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-medium">تاريخ الإضافة</span>
                <span className="text-xs sm:text-sm font-bold text-slate-200 truncate block">
                  {new Date(data.created_at).toLocaleDateString('ar-EG', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Card 5: Creator Name */}
            {showCreator && (
              <div className="p-3 rounded-xl bg-gradient-to-b from-[#13131c] to-[#0c0c12] border border-slate-800/90 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-950/40 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-medium">المنشئ</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-200 truncate block">
                    {data.creator_name}
                  </span>
                </div>
              </div>
            )}

            {/* Card 6: Supported Devices */}
            {showSupportedDevices && (
              <div className="p-3 rounded-xl bg-gradient-to-b from-[#13131c] to-[#0c0c12] border border-slate-800/90 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-medium">الأجهزة المدعومة</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-200 truncate block">
                    {data.supported_devices}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ==========================================================================
              4. ARABIC SECTIONS
              ========================================================================== */}

          {/* Description Section */}
          <div className="space-y-2.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#FF284A]" />
              <span>الوصف</span>
            </h3>
            <div className="p-4 rounded-xl bg-[#09090f] border border-slate-800/80 text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {data.full_description || data.short_description}
            </div>
          </div>

          {/* Requirements Section */}
          {showRequirements && (
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-orange-400" />
                <span>متطلبات التشغيل</span>
              </h3>
              <div className="p-4 rounded-xl bg-[#09090f] border border-slate-800/80 text-xs text-slate-300 space-y-2">
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">إصدار ماينكرافت المطلوب:</span>
                  <span className="font-mono font-bold text-white">{data.mc_version || 'Minecraft Bedrock 1.20+'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">نظام التشغيل:</span>
                  <span className="font-bold text-white">{data.supported_devices || 'Android / iOS / Windows'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">ملاحظة التوافق:</span>
                  <span className="text-emerald-400 font-semibold">مُجرب ومتوافق بالكامل مع آخر تحديثات بيدروك</span>
                </div>
              </div>
            </div>
          )}

          {/* Installation Instructions (Numbered Steps) */}
          {showInstallInstructions && installSteps.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>طريقة التثبيت</span>
              </h3>
              <div className="p-4 rounded-xl bg-[#09090f] border border-slate-800/80 space-y-2.5">
                {installSteps.map((step: string, sIdx: number) => (
                  <div key={sIdx} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {sIdx + 1}
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed pt-0.5">
                      {step.replace(/^(\d+[\.\-\)]\s*)/, '')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Changelog Section */}
          {showChangelog && (
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>سجل التغييرات</span>
              </h3>
              <div className="p-4 rounded-xl bg-[#09090f] border border-slate-800/80 text-xs text-slate-300 leading-relaxed whitespace-pre-line font-mono">
                {data.changelog}
              </div>
            </div>
          )}

          {/* Source & License Section */}
          {(showSourceUrl || showLicense) && (
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>المصدر والترخيص</span>
              </h3>
              <div className="p-4 rounded-xl bg-[#09090f] border border-slate-800/80 space-y-3">
                {showLicense && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">نوع الترخيص:</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[11px]">
                      {data.license_info || 'Community License'}
                    </span>
                  </div>
                )}
                {showCreator && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">صاحب العمل الأصلي:</span>
                    <span className="font-bold text-slate-200">{data.creator_name}</span>
                  </div>
                )}
                {showSourceUrl && (
                  <div className="pt-2 border-t border-slate-800/60 flex justify-end">
                    <a
                      href={data.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:text-white hover:bg-cyan-900 transition-colors text-xs font-semibold"
                    >
                      <span>زيارة المصدر الأصلي</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Related Content Section */}
          {showRelated && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>محتوى ذو صلة</span>
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {relatedResources.map((rel: any) => (
                  <div
                    key={rel.id}
                    onClick={() => {
                      if (onSelectResource) {
                        onSelectResource(rel.id);
                      } else {
                        // Switch ID in current view
                        window.location.hash = `#resource-${rel.id}`;
                        setData(null);
                        setLoading(true);
                      }
                    }}
                    className="p-2.5 rounded-xl bg-[#09090f] border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group"
                  >
                    <div className="w-full aspect-[16/9] rounded-lg overflow-hidden bg-black mb-2">
                      <img
                        src={rel.cover_image}
                        alt={rel.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-[#FF284A] transition-colors">
                      {rel.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                      {rel.mc_version || 'Bedrock'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ==========================================================================
            5. FIXED BOTTOM DOWNLOAD ACTION BAR (Android Safe Area + High Impact)
            ========================================================================== */}
        <div className="absolute bottom-0 inset-x-0 bg-[#09090e]/95 backdrop-blur-md border-t border-slate-800/90 p-3 sm:p-4 z-30 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {(!data.files || data.files.length === 0) ? (
            <div className="text-center py-1">
              <span className="text-xs text-slate-400">الملف غير متوفر حالياً للتحميل</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {data.files.map((file: any) => {
                const isMediaFire =
                  file.is_external === 1 &&
                  (file.file_type === 'mediafire' ||
                    file.external_provider === 'mediafire' ||
                    (file.file_url && file.file_url.includes('mediafire.com')));

                const isDownloading = downloadingId === file.id;
                const sizeMb = file.file_size > 0 ? (file.file_size / (1024 * 1024)).toFixed(1) : null;

                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => handleDownloadFile(file)}
                    disabled={isDownloading}
                    className={`w-full py-3.5 px-5 rounded-xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-[0.98] cursor-pointer disabled:opacity-50 min-h-[48px] ${
                      isMediaFire
                        ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-amber-500/20 hover:brightness-110'
                        : file.is_external === 1
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/20 hover:brightness-110'
                        : 'bg-gradient-to-r from-[#FF284A] via-[#FF4564] to-[#FF791F] text-white shadow-red-500/25 hover:brightness-110'
                    }`}
                  >
                    {isDownloading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>جاري بدء التحميل والتحويل...</span>
                      </>
                    ) : isMediaFire ? (
                      <>
                        <ExternalLink className="w-4 h-4 text-slate-950" />
                        <span>تحميل عبر MediaFire</span>
                        {sizeMb && <span className="opacity-80 font-mono text-xs">({sizeMb} MB)</span>}
                      </>
                    ) : file.is_external === 1 ? (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        <span>تحميل عبر الرابط المعتمد</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>تحميل مباشر ({file.file_name || 'الملف'})</span>
                        {sizeMb && <span className="opacity-90 font-mono text-xs">· {sizeMb} MB</span>}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ==========================================================================
            6. LIGHTBOX FULLSCREEN IMAGE VIEWER
            ========================================================================== */}
        {isLightbox && (
          <div
            className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setIsLightbox(false)}
          >
            <button
              onClick={() => setIsLightbox(false)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={activeImage}
              alt=""
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        )}
      </div>
    </div>
  );
};
