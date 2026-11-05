import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CategoryCards } from './components/CategoryCards';
import { ResourceCard, ResourceItem } from './components/ResourceCard';
import { ResourceDetailModal } from './components/ResourceDetailModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { Footer } from './components/Footer';
import { LegalPagesModal } from './components/LegalPagesModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { soundManager } from './utils/soundManager';
import { Sparkles, Download, Clock, Search, FolderOpen, RefreshCw } from 'lucide-react';

export default function App() {
  // Subscription gate state (shown once per session)
  const [hasConfirmedSubscription, setHasConfirmedSubscription] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('zork_subscription_confirmed') === 'true';
    }
    return false;
  });

  // Sound manager state (default OFF)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => soundManager.getEnabled());

  // Category and search filter state
  const [currentCategory, setCurrentCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Resources state (loaded from real backend database)
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  // Server-verified owner authentication state (strictly hidden from public)
  const [isServerVerifiedOwner, setIsServerVerifiedOwner] = useState<boolean>(false);

  // Modals state
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [legalPage, setLegalPage] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState<boolean>(false);

  // Toggle global sound setting
  const handleToggleSound = () => {
    const newState = soundManager.toggle();
    setSoundEnabled(newState);
  };

  // Verify server-side owner session
  const verifyOwnerSession = useCallback(async () => {
    const token = localStorage.getItem('zork_admin_token') || sessionStorage.getItem('zork_admin_token');
    if (!token) {
      setIsServerVerifiedOwner(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.authenticated && data.email === 'zorkal3ab@gmail.com') {
        setIsServerVerifiedOwner(true);
      } else {
        setIsServerVerifiedOwner(false);
      }
    } catch {
      setIsServerVerifiedOwner(false);
    }
  }, []);

  useEffect(() => {
    verifyOwnerSession();
  }, [verifyOwnerSession]);

  // Fetch real resources from backend
  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (currentCategory !== 'all') {
        params.set('category', currentCategory);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const res = await fetch(`/api/resources?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.resources)) {
        setResources(data.resources);
      }

      // Also refresh category counts
      const catRes = await fetch('/api/categories');
      const catData = await catRes.json();
      if (catData.success && Array.isArray(catData.categories)) {
        const counts: Record<string, number> = {};
        catData.categories.forEach((c: any) => {
          counts[c.slug] = c.resource_count ?? 0;
        });
        setCategoryCounts(counts);
      }
    } catch (err) {
      console.error('Failed to fetch resources', err);
    } finally {
      setLoading(false);
    }
  }, [currentCategory, searchQuery]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Handle URL route checks (/admin, /admin/login, and hash #resource-...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/admin' || path === '/admin/login' || path.startsWith('/admin/')) {
        setShowAdmin(true);
      }

      const handleHashChange = () => {
        const hash = window.location.hash;
        if (hash.startsWith('#resource-')) {
          const id = hash.replace('#resource-', '');
          if (id) setSelectedResourceId(id);
        }
      };

      handleHashChange();
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, []);

  // Filter subsets for homepage sections when viewing all categories without search
  const featuredResources = resources.filter((r) => r.is_featured === 1);
  const mostDownloaded = [...resources].sort((a, b) => (b.real_download_count || 0) - (a.real_download_count || 0));

  return (
    <div className="min-h-screen bg-[#07070B] text-slate-100 flex flex-col font-sans selection:bg-[#FF284A]/30 selection:text-white">
      {/* 
        SUBSCRIPTION GATE
        Untouched original 16:9 artwork with invisible button hotspots
        Shown once per session until confirmed
      */}
      {!hasConfirmedSubscription && (
        <SubscriptionModal
          onConfirmed={() => setHasConfirmedSubscription(true)}
        />
      )}

      {/* Main Public Navigation */}
      <Navbar
        currentCategory={currentCategory}
        onSelectCategory={(slug) => {
          setCurrentCategory(slug);
          const el = document.getElementById('resources-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenSearch={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          const input = document.querySelector('input[type="text"]') as HTMLInputElement;
          if (input) input.focus();
        }}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Hero Section */}
      <HeroSection
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExploreClick={() => {
          const el = document.getElementById('categories-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        currentCategory={currentCategory}
      />

      {/* 5 Official Categories Cards */}
      <CategoryCards
        currentCategory={currentCategory}
        onSelectCategory={setCurrentCategory}
        resourceCounts={categoryCounts}
      />

      {/* Main Content & Resources Container */}
      <main id="resources-section" className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Active Filter or Search Title */}
        {(currentCategory !== 'all' || searchQuery.trim() !== '') && (
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                {searchQuery.trim() ? (
                  <>
                    <Search className="w-5 h-5 text-[#8ADFFF]" />
                    <span>نتائج البحث عن: "{searchQuery.trim()}"</span>
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-5 h-5 text-[#FF791F]" />
                    <span>محتوى قسم {currentCategory}</span>
                  </>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                تم العثور على {resources.length} مورد معتمد.
              </p>
            </div>

            <button
              onClick={() => {
                soundManager.playClick();
                setCurrentCategory('all');
                setSearchQuery('');
              }}
              className="text-xs text-[#FF284A] hover:underline font-semibold cursor-pointer"
            >
              إلغاء التصفية
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-2 border-[#FF284A] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-400 font-medium">جاري جلب الموارد من الخادم...</p>
          </div>
        ) : resources.length === 0 ? (
          /* Real Empty States as strictly required by prompt Section 8 */
          <div className="py-16 px-4 rounded-2xl bg-[#101018]/60 border border-slate-800/80 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#270B18] border border-[#FF284A]/30 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-[#FF284A]" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">
              {searchQuery.trim() ? 'لم يتم العثور على نتائج' : 'لا توجد موارد منشورة حاليًا'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              {searchQuery.trim()
                ? 'جرب البحث بكلمات أخرى أو اختر أحد الأقسام الرئيسية بالأعلى.'
                : 'سيتم إضافة محتوى جديد ومودات معتمدة قريبًا من قِبل مالك المنصة.'}
            </p>
          </div>
        ) : currentCategory !== 'all' || searchQuery.trim() !== '' ? (
          /* Grid View for Filtered / Searched Results */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {resources.map((item) => (
              <ResourceCard
                key={item.id}
                resource={item}
                onSelect={(res) => setSelectedResourceId(res.id)}
              />
            ))}
          </div>
        ) : (
          /* Standard Multi-Section Homepage Layout */
          <>
            {/* Section E — Featured Resources (if marked by owner) */}
            {featuredResources.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>الموارد المميزة المختارة</span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {featuredResources.map((item) => (
                    <ResourceCard
                      key={item.id}
                      resource={item}
                      onSelect={(res) => setSelectedResourceId(res.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Section C — Latest Resources */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#8ADFFF]" />
                  <span>أحدث الموارد المضافة</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {resources.slice(0, 8).map((item) => (
                  <ResourceCard
                    key={item.id}
                    resource={item}
                    onSelect={(res) => setSelectedResourceId(res.id)}
                  />
                ))}
              </div>
            </section>

            {/* Section D — Most Downloaded Resources */}
            {mostDownloaded.some((r) => (r.real_download_count || 0) > 0) && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <Download className="w-5 h-5 text-[#35D16F]" />
                    <span>الأكثر تحميلاً بالمنصة</span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {mostDownloaded.slice(0, 8).map((item) => (
                    <ResourceCard
                      key={item.id}
                      resource={item}
                      onSelect={(res) => setSelectedResourceId(res.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Footer with legal info and the private owner access lock (strictly hidden from public) */}
      <Footer
        onOpenLegal={(page) => setLegalPage(page)}
        onOpenOwnerLogin={() => setShowAdmin(true)}
        isServerVerifiedOwner={isServerVerifiedOwner}
      />

      {/* Resource Detail Modal (V4 screenshot-matched layout) */}
      {selectedResourceId && (
        <ResourceDetailModal
          resourceId={selectedResourceId}
          onClose={() => setSelectedResourceId(null)}
          onDownloadCompleted={() => fetchResources()}
          onSelectResource={(id) => setSelectedResourceId(id)}
        />
      )}

      {/* Legal Pages Modal */}
      {legalPage && (
        <LegalPagesModal
          initialTab={legalPage}
          onClose={() => setLegalPage(null)}
        />
      )}

      {/* Private Owner Dashboard Modal */}
      {showAdmin && (
        <AdminDashboard
          onClose={() => {
            setShowAdmin(false);
            verifyOwnerSession();
            if (window.location.pathname.startsWith('/admin')) {
              window.history.pushState({}, '', '/');
            }
          }}
          onResourceChanged={() => fetchResources()}
          onAuthChange={() => verifyOwnerSession()}
        />
      )}
    </div>
  );
}
