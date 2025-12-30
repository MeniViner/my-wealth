import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Wallet, 
  Plus, 
  Sparkles, 
  LayoutDashboard,
  Scale,
  BarChart3,
  Settings,
  Database,
  Rocket,
  TrendingUp,
  PieChart,
  Building2,
  Coins,
  CreditCard,
  Target,
  Filter,
  Search
} from 'lucide-react';
import { useDemoData } from '../contexts/DemoDataContext';

/**
 * Coachmark data for the tour
 * Each step can optionally navigate to a specific route
 */
const COACHMARKS = [
  {
    id: 'welcome-dashboard',
    title: 'ברוכים הבאים לדשבורד',
    description: 'כאן תראה את כל המידע על התיק שלך - גרפים, התפלגויות, וסיכומים.',
    icon: LayoutDashboard,
    route: '/',
    targetSelector: 'main',
    spotlightSize: 'extra-large',
    position: 'center',
    openMobileMenu: false,
  },
  {
    id: 'total-wealth',
    title: 'זה השווי הנקי שלך',
    description: 'כאן תראה את סך כל ההון שלך - מתעדכן בזמן אמת לפי שער המטבעות.',
    icon: Wallet,
    route: '/',
    targetSelector: '[data-coachmark="wealth-card"]',
    fallbackSelector: '.text-2xl.font-black',
    spotlightSize: 'large',
    openMobileMenu: false,
  },
  {
    id: 'dashboard-charts',
    title: 'גרפים וניתוחים',
    description: 'הגרפים מציגים את הפיזור שלך לפי אפיקי השקעה, חשבונות וארנקים, ומטבעות בסיס.',
    icon: PieChart,
    route: '/',
    targetSelector: '.grid.grid-cols-1.lg\\:grid-cols-2',
    spotlightSize: 'extra-large',
    position: 'center',
    openMobileMenu: false,
  },
  {
    id: 'add-asset',
    title: 'הוסף נכסים חדשים',
    description: 'לחץ כאן כדי להוסיף מניות, קריפטו, חשבונות בנק, ועוד.',
    icon: Plus,
    route: '/',
    targetSelector: 'a[href="/assets/add"]',
    spotlightSize: 'medium',
    openMobileMenu: true,
  },
  {
    id: 'asset-manager',
    title: 'ניהול הנכסים שלך',
    description: 'כאן תוכל לראות את כל הנכסים שלך מקובצים לפי חשבונות וארנקים, אפיקי השקעה, או מטבעות בסיס.',
    icon: Database,
    route: '/assets',
    targetSelector: 'main',
    spotlightSize: 'extra-large',
    position: 'center',
    openMobileMenu: false,
  },
  {
    id: 'asset-search',
    title: 'חיפוש וסינון',
    description: 'השתמש בחיפוש ובסינונים כדי למצוא נכסים ספציפיים במהירות.',
    icon: Search,
    route: '/assets',
    targetSelector: 'input[placeholder*="חיפוש"]',
    spotlightSize: 'medium',
    openMobileMenu: false,
  },
  {
    id: 'asset-grouping',
    title: 'חלוקה וקיבוץ',
    description: 'קבץ את הנכסים שלך לפי חשבונות וארנקים, אפיקי השקעה, או מטבעות בסיס כדי לראות תמונה ברורה יותר.',
    icon: Filter,
    route: '/assets',
    targetSelector: '.flex.flex-wrap.gap-2 button:first-of-type',
    fallbackSelector: '[class*="border-t"] .flex.gap-2',
    spotlightSize: 'medium',
    openMobileMenu: false,
  },
  {
    id: 'ai-advisor',
    title: 'היועץ החכם שלך',
    description: 'שאל אותי כל שאלה על הכסף שלך - אנתח את התיק ואתן המלצות מותאמות אישית.',
    icon: Sparkles,
    route: '/advisor',
    targetSelector: 'main',
    spotlightSize: 'extra-large',
    position: 'center',
    openMobileMenu: false,
  },
  {
    id: 'rebalancing',
    title: 'איזון התיק',
    description: 'הגדר יעדים לכל אפיק השקעה וקבל המלצות לאיזון התיק שלך.',
    icon: Scale,
    route: '/rebalancing',
    targetSelector: 'main',
    spotlightSize: 'extra-large',
    position: 'center',
    openMobileMenu: false,
  },
  {
    id: 'rebalancing-targets',
    title: 'הגדרת יעדים',
    description: 'הגדר יעדי הקצאה לכל אפיק השקעה וצפה בהמלצות לאיזון התיק.',
    icon: Target,
    route: '/rebalancing',
    targetSelector: 'h2, h3',
    spotlightSize: 'center',
    openMobileMenu: false,
  },
  {
    id: 'chart-builder',
    title: 'בונה הגרפים',
    description: 'צור גרפים מותאמים אישית וצפה בנתונים שלך בדרכים שונות.',
    icon: BarChart3,
    route: '/chart-builder',
    targetSelector: 'main',
    spotlightSize: 'extra-large',
    position: 'center',
    openMobileMenu: false,
  },
  {
    id: 'settings',
    title: 'הגדרות',
    description: 'התאם את המערכת לצרכים שלך - מראה, הגדרות AI, ויעדים.',
    icon: Settings,
    route: '/settings',
    targetSelector: 'main',
    spotlightSize: 'extra-large',
    position: 'center',
    openMobileMenu: false,
  },
  {
    id: 'final',
    title: 'מוכן לצאת לדרך',
    description: 'עכשיו אתה מוכן להתחיל לנהל את ההון שלך כמו מקצוען. בהצלחה!',
    icon: Rocket,
    route: '/',
    targetSelector: null,
    spotlightSize: 'none',
    position: 'center',
    openMobileMenu: false,
    isFinal: true,
  },
];

/**
 * CoachmarkTour - A guided tour component that highlights key UI elements
 * and navigates between different pages
 */
const CoachmarkTour = ({ isActive, onComplete }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { initializeDemoAssets, clearDemoAssets } = useDemoData();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [spotlightPosition, setSpotlightPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showDemoBanner, setShowDemoBanner] = useState(false);
  const updateTimeoutRef = useRef(null);
  const navigationTimeoutRef = useRef(null);

  // Initialize demo data when tour starts
  useEffect(() => {
    if (isActive) {
      initializeDemoAssets();
      setShowDemoBanner(true);
    } else {
      clearDemoAssets();
      setShowDemoBanner(false);
    }
  }, [isActive, initializeDemoAssets, clearDemoAssets]);

  // Reset to first step when tour starts
  useEffect(() => {
    if (isActive) {
      setCurrentIndex(0);
      setIsNavigating(false);
    }
  }, [isActive]);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle mobile menu opening
  const toggleMobileMenu = useCallback((shouldOpen) => {
    if (!isMobile) return;
    
    const menuButton = document.querySelector('button[aria-label="תפריט"]');
    if (!menuButton) return;

    const sidebar = document.querySelector('aside');
    const isCurrentlyOpen = sidebar?.classList.contains('translate-x-0');
    
    if (shouldOpen && !isCurrentlyOpen) {
      menuButton.click();
    } else if (!shouldOpen && isCurrentlyOpen) {
      menuButton.click();
    }
  }, [isMobile]);

  // Navigate to the route for current step
  useEffect(() => {
    if (!isActive) return;
    
    const coachmark = COACHMARKS[currentIndex];
    if (!coachmark) return;

    const currentPath = location.pathname;
    const targetRoute = coachmark.route;

    if (targetRoute && currentPath !== targetRoute) {
      setIsNavigating(true);
      
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }

      navigate(targetRoute, { replace: true });
      
      navigationTimeoutRef.current = setTimeout(() => {
        setIsNavigating(false);
      }, 200);
      
      return () => {
        if (navigationTimeoutRef.current) {
          clearTimeout(navigationTimeoutRef.current);
        }
      };
    } else {
      setIsNavigating(false);
    }
  }, [isActive, currentIndex, location.pathname, navigate]);

  // Handle mobile menu state for current step
  useEffect(() => {
    if (!isActive || isNavigating) return;
    
    const coachmark = COACHMARKS[currentIndex];
    if (!coachmark) return;

    const timer = setTimeout(() => {
      toggleMobileMenu(coachmark.openMobileMenu);
    }, 200);

    return () => clearTimeout(timer);
  }, [isActive, currentIndex, isNavigating, toggleMobileMenu]);

  // Find and position spotlight on target element
  const updateSpotlight = useCallback(() => {
    const coachmark = COACHMARKS[currentIndex];
    if (!coachmark) return;

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    if (!coachmark.targetSelector || coachmark.isFinal) {
      setSpotlightPosition({
        x: window.innerWidth / 2 - 150,
        y: window.innerHeight / 2 - 100,
        width: 300,
        height: 200,
        hidden: coachmark.spotlightSize === 'none',
      });
      return;
    }

    let targetElement = document.querySelector(coachmark.targetSelector);
    
    if (!targetElement && coachmark.fallbackSelector) {
      targetElement = document.querySelector(coachmark.fallbackSelector);
      if (targetElement) {
        targetElement = targetElement.closest('div[class*="rounded-xl"]') || targetElement;
      }
    }

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      let padding = 12;
      
      switch (coachmark.spotlightSize) {
        case 'extra-large':
          padding = 24;
          break;
        case 'large':
          padding = 16;
          break;
        case 'medium':
          padding = 12;
          break;
        case 'small':
          padding = 8;
          break;
        default:
          padding = 12;
      }
      
      setSpotlightPosition({
        x: rect.left - padding,
        y: rect.top - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        hidden: false,
      });
    } else {
      setSpotlightPosition({
        x: window.innerWidth / 2 - 150,
        y: window.innerHeight / 2 - 100,
        width: 300,
        height: 200,
        hidden: coachmark.spotlightSize === 'none',
      });
    }
  }, [currentIndex]);

  // Update spotlight when step changes or navigation completes
  useEffect(() => {
    if (isActive && !isNavigating) {
      updateTimeoutRef.current = setTimeout(updateSpotlight, 250);
      return () => {
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
      };
    }
  }, [isActive, currentIndex, isNavigating, updateSpotlight, location.pathname]);

  // Handle window resize
  useEffect(() => {
    if (isActive && !isNavigating) {
      const handleResize = () => {
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        updateTimeoutRef.current = setTimeout(updateSpotlight, 100);
      };
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleResize);
      };
    }
  }, [isActive, isNavigating, updateSpotlight]);

  const handleNext = () => {
    if (currentIndex < COACHMARKS.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    toggleMobileMenu(false);
    
    // Clear demo data
    clearDemoAssets();
    setShowDemoBanner(false);
    
    if (location.pathname !== '/') {
      navigate('/', { replace: true });
    }
    
    setCurrentIndex(0);
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isActive) return null;

  const currentCoachmark = COACHMARKS[currentIndex];
  const Icon = currentCoachmark.icon;

  // Calculate tooltip position
  const getTooltipPosition = () => {
    const { x, y, width, height, hidden } = spotlightPosition;
    const tooltipWidth = isMobile ? window.innerWidth - 32 : 360;
    const tooltipHeight = 280;
    
    if (hidden || currentCoachmark.position === 'center') {
      return {
        left: isMobile ? 16 : '50%',
        right: isMobile ? 16 : 'auto',
        top: '50%',
        transform: isMobile ? 'translateY(-50%)' : 'translate(-50%, -50%)',
      };
    }
    
    if (isMobile) {
      return {
        left: 16,
        right: 16,
        top: Math.min(y + height + 20, window.innerHeight - tooltipHeight - 80),
        transform: 'none',
      };
    }
    
    let tooltipX = x - tooltipWidth - 30;
    let tooltipY = y + height / 2 - tooltipHeight / 2;
    
    if (tooltipX < 20) {
      tooltipX = x + width + 30;
    }
    
    if (tooltipX + tooltipWidth > window.innerWidth - 20) {
      tooltipX = Math.max(20, x + width / 2 - tooltipWidth / 2);
      tooltipY = y + height + 20;
    }
    
    tooltipY = Math.max(20, Math.min(tooltipY, window.innerHeight - tooltipHeight - 20));
    tooltipX = Math.max(20, Math.min(tooltipX, window.innerWidth - tooltipWidth - 20));
    
    return {
      left: tooltipX,
      top: tooltipY,
      transform: 'none',
    };
  };

  const tooltipPos = getTooltipPosition();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
        dir="rtl"
      >
        {/* Demo Banner - positioned to not overlap with close button on mobile */}
        {showDemoBanner && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 md:top-6 right-4 md:right-6 left-4 md:left-auto z-[101] bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 md:px-6 py-3 rounded-xl shadow-2xl border-2 border-blue-400/50 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Rocket className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm">נתוני דמו מוצגים</div>
                <div className="text-xs text-blue-100 truncate">הנתונים מקומיים בלבד ויוסרו בסוף המדריך</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Large Close Button at Top Right */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={handleSkip}
          className="fixed top-6 left-6 z-[101] w-12 h-12 bg-slate-800/90 hover:bg-slate-700/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl border-2 border-slate-600/50 hover:border-red-500/50 transition-all group"
          aria-label="סגור מדריך"
        >
          <X className="w-6 h-6 text-slate-300 group-hover:text-red-400 transition-colors" />
        </motion.button>

        {/* Dark overlay with spotlight cutout */}
        {!spotlightPosition.hidden && (
          <svg
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <mask id="spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <motion.rect
                  initial={{ opacity: 0 }}
                  animate={{ 
                    x: spotlightPosition.x,
                    y: spotlightPosition.y,
                    width: spotlightPosition.width,
                    height: spotlightPosition.height,
                    opacity: 1 
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  rx="16"
                  ry="16"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.88)"
              mask="url(#spotlight-mask)"
            />
          </svg>
        )}

        {/* Full overlay for final step */}
        {spotlightPosition.hidden && (
          <div className="absolute inset-0 bg-black/90" />
        )}

        {/* Spotlight ring effect */}
        {!spotlightPosition.hidden && (
          <motion.div
            className="absolute pointer-events-none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              left: spotlightPosition.x - 4,
              top: spotlightPosition.y - 4,
              width: spotlightPosition.width + 8,
              height: spotlightPosition.height + 8,
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
              borderRadius: 20,
              border: '3px solid rgba(16, 185, 129, 0.6)',
              boxShadow: '0 0 40px rgba(16, 185, 129, 0.4), inset 0 0 30px rgba(16, 185, 129, 0.15)',
            }}
          />
        )}

        {/* Loading indicator during navigation */}
        {isNavigating && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="bg-slate-800 rounded-2xl p-6 shadow-2xl">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-3"></div>
              <p className="text-slate-300 text-sm">טוען...</p>
            </div>
          </div>
        )}

        {/* Tooltip card */}
        {!isNavigating && (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className={`absolute bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 p-6 ${
              isMobile ? 'left-4 right-4' : 'w-[360px]'
            }`}
            style={{
              ...tooltipPos,
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Close button inside tooltip */}
            <button
              onClick={handleSkip}
              className="absolute top-4 left-4 p-2 rounded-xl hover:bg-slate-700/50 transition-colors"
              aria-label="סגור"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>

            {/* Icon and progress */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-slate-400 mb-2">
                  שלב {currentIndex + 1} מתוך {COACHMARKS.length}
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / COACHMARKS.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <h3 className="text-xl font-bold text-white mb-3">{currentCoachmark.title}</h3>
            <p className="text-slate-300 text-base leading-relaxed mb-6">{currentCoachmark.description}</p>

            {/* Navigation buttons */}
            <div className="flex items-center gap-3">
              {currentIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex-1 py-3 px-5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-medium shadow-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                  הקודם
                </button>
              )}
              <button
                onClick={handleNext}
                className={`flex-1 py-3 px-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-medium shadow-lg shadow-emerald-500/30 ${
                  currentIndex === 0 ? 'w-full' : ''
                }`}
              >
                {currentIndex === COACHMARKS.length - 1 ? 'סיום והתחלה!' : 'הבא'}
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Skip option */}
            <button
              onClick={handleSkip}
              className="w-full mt-4 py-2.5 text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              דלג על ההדרכה
            </button>
          </motion.div>
        )}

        {/* Progress dots at bottom */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-full">
          {COACHMARKS.map((_, index) => (
            <button
              key={index}
              onClick={() => !isNavigating && setCurrentIndex(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-emerald-500 w-8' 
                  : index < currentIndex 
                    ? 'bg-emerald-500/60 w-2.5 hover:bg-emerald-400' 
                    : 'bg-slate-600 w-2.5 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CoachmarkTour;
