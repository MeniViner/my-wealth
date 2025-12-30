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
  Search,
  Layers
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
    id: 'add-asset',
    title: 'הוסף נכסים חדשים',
    description: 'לחץ כאן כדי להוסיף מניות, קריפטו, חשבונות בנק, ועוד.',
    icon: Plus,
    route: '/assets',
    targetSelector: 'button',
    targetText: 'הוסף נכס',
    fallbackSelector: 'button[class*="bg-emerald"]',
    spotlightSize: 'medium',
    openMobileMenu: false,
  },
  {
    id: 'asset-distribution-platforms',
    title: 'פלטפורמות',
    description: 'כאן תראה את הנכסים שלך מקובצים לפי חשבונות וארנקים - איפה הכסף שלך נמצא.',
    icon: Building2,
    route: '/assets',
    targetSelector: 'button',
    targetText: 'ניהול המקורות שלי',
    fallbackSelector: 'button[class*="border-b"]:nth-of-type(2)',
    spotlightSize: 'medium',
    openMobileMenu: false,
    waitForTab: 'sources',
  },
  {
    id: 'asset-distribution-categories',
    title: 'קטגוריות',
    description: 'אפיקי השקעה - החלוקה הראשית של התיק שלך.',
    icon: Layers,
    route: '/assets',
    targetSelector: 'h3',
    targetText: 'אפיקי השקעה',
    fallbackSelector: 'div:has(h3)',
    spotlightSize: 'medium',
    openMobileMenu: false,
    waitForTab: 'sources',
  },
  {
    id: 'asset-distribution-symbols',
    title: 'סמלי נכסים',
    description: 'טיקרים וסמלים ספציפיים למעקב אחר נכסים.',
    icon: Coins,
    route: '/assets',
    targetSelector: 'h3',
    targetText: 'נכסים למעקב',
    fallbackSelector: 'div:has(h3)',
    spotlightSize: 'medium',
    openMobileMenu: false,
    waitForTab: 'sources',
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
    targetSelector: 'button',
    targetText: 'הגדרת יעדים',
    fallbackSelector: 'button[class*="border-b"]:first-of-type',
    spotlightSize: 'medium',
    openMobileMenu: false,
    waitForHash: '#rebalancing',
  },
  {
    id: 'reports',
    title: 'דוחות וניתוחי AI',
    description: 'צפה בדוחות שמורים וניתוחי AI על התיק שלך.',
    icon: BarChart3,
    route: '/rebalancing',
    targetSelector: 'button',
    targetText: 'דוחות',
    fallbackSelector: 'button[class*="border-b"]:last-of-type',
    spotlightSize: 'medium',
    openMobileMenu: false,
    waitForHash: '#reports',
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

  // Navigate to the route for current step and handle tabs/hashes
  useEffect(() => {
    if (!isActive) return;
    
    const coachmark = COACHMARKS[currentIndex];
    if (!coachmark) return;

    const currentPath = location.pathname;
    const currentHash = location.hash;
    const targetRoute = coachmark.route;
    const targetHash = coachmark.waitForHash;
    const targetTab = coachmark.waitForTab;

    // Check if we need to navigate
    const needsNavigation = targetRoute && currentPath !== targetRoute.split('#')[0];
    const needsHash = targetHash && currentHash !== targetHash;
    const needsTab = targetTab && !document.querySelector(`button[class*="border-b"]:has-text("${targetTab === 'sources' ? 'ניהול המקורות שלי' : ''}")`)?.classList.contains('border-emerald');

    if (needsNavigation || needsHash) {
      setIsNavigating(true);
      
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }

      // Navigate to route with hash if needed
      const routeWithHash = targetHash ? `${targetRoute.split('#')[0]}${targetHash}` : targetRoute;
      navigate(routeWithHash, { replace: true });
      
      // If we need to switch tabs, do it after navigation
      if (targetTab) {
        navigationTimeoutRef.current = setTimeout(() => {
          // Click the tab button
          const tabButton = Array.from(document.querySelectorAll('button[class*="border-b"]')).find(btn => {
            const text = btn.textContent || '';
            if (targetTab === 'sources') return text.includes('ניהול המקורות');
            if (targetTab === 'assets') return text.includes('נכסים');
            return false;
          });
          if (tabButton) {
            tabButton.click();
          }
          setIsNavigating(false);
        }, 500);
      } else if (targetHash) {
        // Wait for hash navigation to complete
        navigationTimeoutRef.current = setTimeout(() => {
          setIsNavigating(false);
        }, 400);
      } else {
        navigationTimeoutRef.current = setTimeout(() => {
          setIsNavigating(false);
        }, 300);
      }
      
      return () => {
        if (navigationTimeoutRef.current) {
          clearTimeout(navigationTimeoutRef.current);
        }
      };
    } else if (needsTab) {
      // Just switch tab without navigation
      setIsNavigating(true);
      const tabButton = Array.from(document.querySelectorAll('button[class*="border-b"]')).find(btn => {
        const text = btn.textContent || '';
        if (targetTab === 'sources') return text.includes('ניהול המקורות');
        if (targetTab === 'assets') return text.includes('נכסים');
        return false;
      });
      if (tabButton) {
        tabButton.click();
        setTimeout(() => setIsNavigating(false), 200);
      } else {
        setIsNavigating(false);
      }
    } else {
      setIsNavigating(false);
    }
  }, [isActive, currentIndex, location.pathname, location.hash, navigate]);

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

    // Helper function to find element by text content
    const findElementByText = (selector, text) => {
      if (!selector || !text) return null;
      // Try direct querySelector first
      let element = document.querySelector(selector);
      if (element) return element;
      
      // If selector contains :contains or :has-text, search manually
      if (selector.includes(':contains') || selector.includes(':has-text')) {
        const baseSelector = selector.split(':')[0];
        const elements = document.querySelectorAll(baseSelector || '*');
        for (const el of elements) {
          if (el.textContent && el.textContent.includes(text)) {
            return el;
          }
        }
      }
      
      return null;
    };

    let targetElement = findElementByText(coachmark.targetSelector, coachmark.targetText) || 
                       document.querySelector(coachmark.targetSelector);
    
    if (!targetElement && coachmark.fallbackSelector) {
      targetElement = findElementByText(coachmark.fallbackSelector, coachmark.fallbackText) ||
                     document.querySelector(coachmark.fallbackSelector);
      if (targetElement) {
        targetElement = targetElement.closest('div[class*="rounded-xl"]') || 
                       targetElement.closest('div[class*="rounded-2xl"]') || 
                       targetElement;
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
        {/* Demo Banner - compact and subtle */}
        {showDemoBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 right-0 left-0 z-[101] bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1 text-xs border-b border-blue-400/30"
          >
            <div className="flex items-center justify-center gap-2">
              <Rocket className="w-3 h-3" />
              <span className="font-medium">נתוני דמו מוצגים - מקומיים בלבד</span>
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
            className={`absolute bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl md:rounded-2xl shadow-2xl border border-slate-700/50 ${
              isMobile 
                ? 'left-2 right-2 p-3' 
                : 'w-[360px] p-6'
            }`}
            style={{
              ...tooltipPos,
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Close button inside tooltip */}
            <button
              onClick={handleSkip}
              className={`absolute top-2 left-2 md:top-4 md:left-4 p-1.5 md:p-2 rounded-lg md:rounded-xl hover:bg-slate-700/50 transition-colors`}
              aria-label="סגור"
            >
              <X className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-slate-400`} />
            </button>

            {/* Icon and progress */}
            <div className={`flex items-center gap-2 md:gap-4 ${isMobile ? 'mb-3' : 'mb-5'}`}>
              <div className={`${isMobile ? 'w-8 h-8 rounded-lg' : 'w-14 h-14 rounded-2xl'} bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0`}>
                <Icon className={`${isMobile ? 'w-4 h-4' : 'w-7 h-7'} text-white`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400 mb-1 md:mb-2`}>
                  שלב {currentIndex + 1} מתוך {COACHMARKS.length}
                </div>
                <div className={`${isMobile ? 'h-1.5' : 'h-2'} bg-slate-700 rounded-full overflow-hidden`}>
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
            <h3 className={`${isMobile ? 'text-sm font-semibold mb-1.5' : 'text-xl font-bold mb-3'} text-white`}>{currentCoachmark.title}</h3>
            <p className={`${isMobile ? 'text-xs leading-relaxed mb-3' : 'text-base leading-relaxed mb-6'} text-slate-300`}>{currentCoachmark.description}</p>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2 md:gap-3">
              {currentIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className={`flex-1 ${isMobile ? 'py-2 px-3 text-xs' : 'py-3 px-5'} bg-slate-700 hover:bg-slate-600 text-white rounded-lg md:rounded-xl transition-all flex items-center justify-center gap-1.5 md:gap-2 font-medium shadow-lg`}
                >
                  <ChevronRight className={`${isMobile ? 'w-3.5 h-3.5' : 'w-5 h-5'}`} />
                  <span className={isMobile ? 'text-xs' : ''}>הקודם</span>
                </button>
              )}
              <button
                onClick={handleNext}
                className={`flex-1 ${isMobile ? 'py-2 px-3 text-xs' : 'py-3 px-5'} bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-lg md:rounded-xl transition-all flex items-center justify-center gap-1.5 md:gap-2 font-medium shadow-lg shadow-emerald-500/30 ${
                  currentIndex === 0 ? 'w-full' : ''
                }`}
              >
                <span className={isMobile ? 'text-xs' : ''}>{currentIndex === COACHMARKS.length - 1 ? 'סיום והתחלה!' : 'הבא'}</span>
                <ChevronLeft className={`${isMobile ? 'w-3.5 h-3.5' : 'w-5 h-5'}`} />
              </button>
            </div>

            {/* Skip option */}
            <button
              onClick={handleSkip}
              className={`w-full ${isMobile ? 'mt-2 py-1.5 text-xs' : 'mt-4 py-2.5 text-sm'} text-slate-400 hover:text-slate-200 transition-colors`}
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
