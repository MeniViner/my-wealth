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
    targetSelector: '[data-coachmark="add-asset"]',
    spotlightSize: 'medium',
    openMobileMenu: false,
  },
  {
    id: 'asset-distribution-platforms',
    title: 'פלטפורמות',
    description: 'כאן תראה את הנכסים שלך מקובצים לפי חשבונות וארנקים - איפה הכסף שלך נמצא.',
    icon: Building2,
    route: '/assets',
    targetSelector: '[data-coachmark="sources-tab"]',
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
    targetSelector: '[data-coachmark="asset-distribution-categories"]',
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
    targetSelector: '[data-coachmark="asset-distribution-symbols"]',
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
    targetSelector: '[data-coachmark="asset-search"]',
    spotlightSize: 'medium',
    openMobileMenu: false,
  },
  {
    id: 'asset-grouping',
    title: 'חלוקה וקיבוץ',
    description: 'קבץ את הנכסים שלך לפי חשבונות וארנקים, אפיקי השקעה, או מטבעות בסיס כדי לראות תמונה ברורה יותר.',
    icon: Filter,
    route: '/assets',
    targetSelector: '[data-coachmark="asset-grouping"]',
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
    targetSelector: '[data-coachmark="rebalancing-targets"]',
    spotlightSize: 'medium',
    openMobileMenu: false,
    waitForHash: '#rebalancing',
  },
  {
    id: 'rebalancing-status',
    title: 'סטטוס יעדים',
    description: 'צפה בסטטוס הנוכחי של היעדים שלך - כמה רחוק אתה מהיעד שהגדרת.',
    icon: TrendingUp,
    route: '/rebalancing',
    targetSelector: '[data-coachmark="rebalancing-status"]',
    spotlightSize: 'medium',
    openMobileMenu: false,
    waitForHash: '#analysis',
  },
  {
    id: 'reports',
    title: 'דוחות וניתוחי AI',
    description: 'צפה בדוחות שמורים וניתוחי AI על התיק שלך.',
    icon: BarChart3,
    route: '/rebalancing',
    targetSelector: '[data-coachmark="reports"]',
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
  const { initializeDemoAssets } = useDemoData();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [spotlightPosition, setSpotlightPosition] = useState(() => {
    // Initialize with safe defaults
    if (typeof window !== 'undefined') {
      return {
        x: window.innerWidth / 2 - 150,
        y: window.innerHeight / 2 - 100,
        width: 300,
        height: 200,
        hidden: false
      };
    }
    return { x: 0, y: 0, width: 300, height: 200, hidden: false };
  });
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
      // Don't clear demo when tour ends - let user turn it off manually from Dashboard
      setShowDemoBanner(false);
    }
  }, [isActive, initializeDemoAssets]);

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
    
    // Check if tab needs to be switched (using manual search, not CSS selector)
    let needsTab = false;
    if (targetTab) {
      const tabButtons = Array.from(document.querySelectorAll('button[class*="border-b"]'));
      const activeTab = tabButtons.find(btn => {
        const text = btn.textContent || '';
        if (targetTab === 'sources') return text.includes('ניהול המקורות');
        if (targetTab === 'assets') return text.includes('נכסים');
        return false;
      });
      needsTab = activeTab && !activeTab.classList.contains('border-emerald');
    }

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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoachmarkTour.jsx:404',message:'updateSpotlight entry',data:{stepId:coachmark?.id,selector:coachmark?.targetSelector,fallback:coachmark?.fallbackSelector},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

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
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoachmarkTour.jsx:444',message:'element search result',data:{found:!!targetElement,selector:coachmark.targetSelector,usingFallback:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (!targetElement && coachmark.fallbackSelector) {
      targetElement = findElementByText(coachmark.fallbackSelector, coachmark.fallbackText) ||
                     document.querySelector(coachmark.fallbackSelector);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoachmarkTour.jsx:448',message:'fallback element search',data:{found:!!targetElement,fallbackSelector:coachmark.fallbackSelector},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (targetElement) {
        targetElement = targetElement.closest('div[class*="rounded-xl"]') || 
                       targetElement.closest('div[class*="rounded-2xl"]') || 
                       targetElement;
      }
    }

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoachmarkTour.jsx:457',message:'element rect before padding',data:{left:rect.left,top:rect.top,width:rect.width,height:rect.height,viewportWidth:window.innerWidth,viewportHeight:window.innerHeight,isVisible:rect.width>0&&rect.height>0,isOnScreen:rect.left>=0&&rect.top>=0&&rect.right<=window.innerWidth&&rect.bottom<=window.innerHeight},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Scroll element into view only if completely off-screen (not if partially visible)
      // Allow user to scroll freely - only scroll if element is completely invisible
      const isCompletelyOffScreen = rect.width === 0 || rect.height === 0 || 
        (rect.right < 0 || rect.left > window.innerWidth) || 
        (rect.bottom < 0 || rect.top > window.innerHeight);
      
      if (isCompletelyOffScreen) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoachmarkTour.jsx:475',message:'scrolling element into view',data:{reason:'element completely off-screen'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        // Only scroll once when step changes, don't force scroll repeatedly
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
      
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
      
      const spotlightPos = {
        x: rect.left - padding,
        y: rect.top - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        hidden: false,
      };
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoachmarkTour.jsx:478',message:'spotlight position set',data:spotlightPos,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      setSpotlightPosition(spotlightPos);
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoachmarkTour.jsx:485',message:'element not found, using default position',data:{selector:coachmark.targetSelector},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
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
  // Use longer delay to allow page to fully render and tabs to switch
  useEffect(() => {
    if (isActive && !isNavigating) {
      updateTimeoutRef.current = setTimeout(updateSpotlight, 500);
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
    
    // Don't clear demo data - let user turn it off manually from Dashboard
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
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoachmarkTour.jsx:566',message:'getTooltipPosition entry',data:{spotlightX:x,spotlightY:y,spotlightW:width,spotlightH:height,hidden,isMobile,tooltipW:tooltipWidth,tooltipH:tooltipHeight},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    if (hidden || currentCoachmark.position === 'center') {
      const pos = {
        left: isMobile ? 16 : '50%',
        right: isMobile ? 16 : 'auto',
        top: '50%',
        transform: isMobile ? 'translateY(-50%)' : 'translate(-50%, -50%)',
      };
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoachmarkTour.jsx:571',message:'tooltip position center',data:pos,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return pos;
    }
    
    if (isMobile) {
      const tooltipTop = Math.min(y + height + 20, window.innerHeight - tooltipHeight - 80);
      const pos = {
        left: 16,
        right: 16,
        top: tooltipTop,
        transform: 'none',
      };
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoachmarkTour.jsx:580',message:'tooltip position mobile',data:{...pos,targetY:y,targetH:height,overlaps:tooltipTop<y+height},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return pos;
    }
    
    // Desktop positioning - try to avoid covering target
    // Check if target is in top half of screen -> place tooltip below
    // Check if target is in bottom half -> place tooltip above
    const targetCenterY = y + height / 2;
    const viewportCenterY = window.innerHeight / 2;
    const targetInTopHalf = targetCenterY < viewportCenterY;
    
    let tooltipX = x - tooltipWidth - 30;
    let tooltipY;
    
    if (targetInTopHalf) {
      // Target in top half - place tooltip below
      tooltipY = y + height + 20;
    } else {
      // Target in bottom half - place tooltip above
      tooltipY = y - tooltipHeight - 20;
    }
    
    // Try left side first
    if (tooltipX < 20) {
      // Left side doesn't fit, try right side
      tooltipX = x + width + 30;
    }
    
    // If right side also doesn't fit, center above/below
    if (tooltipX + tooltipWidth > window.innerWidth - 20) {
      tooltipX = Math.max(20, x + width / 2 - tooltipWidth / 2);
      // If still doesn't fit, use the side that fits better
      if (tooltipX < 20) tooltipX = 20;
      if (tooltipX + tooltipWidth > window.innerWidth - 20) {
        tooltipX = window.innerWidth - tooltipWidth - 20;
      }
    }
    
    // Clamp to viewport
    tooltipY = Math.max(20, Math.min(tooltipY, window.innerHeight - tooltipHeight - 20));
    tooltipX = Math.max(20, Math.min(tooltipX, window.innerWidth - tooltipWidth - 20));
    
    // Check for overlap with target
    const tooltipLeft = tooltipX;
    const tooltipRight = tooltipX + tooltipWidth;
    const tooltipTop = tooltipY;
    const tooltipBottom = tooltipY + tooltipHeight;
    const targetLeft = x;
    const targetRight = x + width;
    const targetTop = y;
    const targetBottom = y + height;
    
    const overlaps = !(tooltipRight < targetLeft || tooltipLeft > targetRight || tooltipBottom < targetTop || tooltipTop > targetBottom);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoachmarkTour.jsx:625',message:'tooltip position desktop final',data:{tooltipX,tooltipY,targetX:x,targetY:y,targetW:width,targetH:height,overlaps,targetInTopHalf,strategy:targetInTopHalf?'below':'above'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
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
                    x: spotlightPosition.x || 0,
                    y: spotlightPosition.y || 0,
                    width: spotlightPosition.width || 300,
                    height: spotlightPosition.height || 200,
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
              left: (spotlightPosition.x || 0) - 4,
              top: (spotlightPosition.y || 0) - 4,
              width: (spotlightPosition.width || 300) + 8,
              height: (spotlightPosition.height || 200) + 8,
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
            className={`absolute bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg md:rounded-2xl shadow-2xl border border-slate-700/50 ${
              isMobile 
                ? 'left-1.5 right-1.5 p-2' 
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
              className={`absolute top-1 left-1 md:top-4 md:left-4 p-1 md:p-2 rounded-md md:rounded-xl hover:bg-slate-700/50 transition-colors`}
              aria-label="סגור"
            >
              <X className={`${isMobile ? 'w-3 h-3' : 'w-5 h-5'} text-slate-400`} />
            </button>

            {/* Icon and progress */}
            <div className={`flex items-center gap-1.5 md:gap-4 ${isMobile ? 'mb-2' : 'mb-5'}`}>
              <div className={`${isMobile ? 'w-6 h-6 rounded-md' : 'w-14 h-14 rounded-2xl'} bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0`}>
                <Icon className={`${isMobile ? 'w-3 h-3' : 'w-7 h-7'} text-white`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`${isMobile ? 'text-[10px]' : 'text-sm'} text-slate-400 mb-0.5 md:mb-2`}>
                  שלב {currentIndex + 1} מתוך {COACHMARKS.length}
                </div>
                <div className={`${isMobile ? 'h-1' : 'h-2'} bg-slate-700 rounded-full overflow-hidden`}>
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
            <h3 className={`${isMobile ? 'text-xs font-semibold mb-1' : 'text-xl font-bold mb-3'} text-white`}>{currentCoachmark.title}</h3>
            <p className={`${isMobile ? 'text-[10px] leading-tight mb-2' : 'text-base leading-relaxed mb-6'} text-slate-300`}>{currentCoachmark.description}</p>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1.5 md:gap-3">
              {currentIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className={`flex-1 ${isMobile ? 'py-1.5 px-2 text-[10px]' : 'py-3 px-5'} bg-slate-700 hover:bg-slate-600 text-white rounded-md md:rounded-xl transition-all flex items-center justify-center gap-1 md:gap-2 font-medium shadow-lg`}
                >
                  <ChevronRight className={`${isMobile ? 'w-3 h-3' : 'w-5 h-5'}`} />
                  <span className={isMobile ? 'text-[10px]' : ''}>הקודם</span>
                </button>
              )}
              <button
                onClick={handleNext}
                className={`flex-1 ${isMobile ? 'py-1.5 px-2 text-[10px]' : 'py-3 px-5'} bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-md md:rounded-xl transition-all flex items-center justify-center gap-1 md:gap-2 font-medium shadow-lg shadow-emerald-500/30 ${
                  currentIndex === 0 ? 'w-full' : ''
                }`}
              >
                <span className={isMobile ? 'text-[10px]' : ''}>{currentIndex === COACHMARKS.length - 1 ? 'סיום והתחלה!' : 'הבא'}</span>
                <ChevronLeft className={`${isMobile ? 'w-3 h-3' : 'w-5 h-5'}`} />
              </button>
            </div>

            {/* Skip option */}
            <button
              onClick={handleSkip}
              className={`w-full ${isMobile ? 'mt-1.5 py-1 text-[10px]' : 'mt-4 py-2.5 text-sm'} text-slate-400 hover:text-slate-200 transition-colors`}
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
