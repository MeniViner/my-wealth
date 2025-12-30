import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  Sparkles, 
  PieChart, 
  TrendingUp, 
  ChevronLeft, 
  ChevronRight,
  Banknote,
  Bitcoin,
  Building2,
  Landmark,
  CreditCard,
  Check,
  ArrowRight
} from 'lucide-react';

// Confetti animation component
const Confetti = () => {
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6'][Math.floor(Math.random() * 5)]
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {confettiPieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute w-3 h-3 rounded-sm"
          style={{ 
            left: `${piece.x}%`,
            backgroundColor: piece.color,
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ 
            y: '100svh', 
            opacity: 0, 
            rotate: 360 * (Math.random() > 0.5 ? 1 : -1)
          }}
          transition={{ 
            duration: piece.duration, 
            delay: piece.delay,
            ease: 'linear'
          }}
        />
      ))}
    </div>
  );
};

// Progress indicator dots
const ProgressDots = ({ currentStep, totalSteps }) => {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {Array.from({ length: totalSteps }, (_, i) => (
        <motion.div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i < currentStep 
              ? 'bg-emerald-500 w-2' 
              : i === currentStep 
                ? 'bg-emerald-500 w-8' 
                : 'bg-slate-600 w-2'
          }`}
          initial={{ scale: 0.8 }}
          animate={{ scale: i === currentStep ? 1.1 : 1 }}
        />
      ))}
    </div>
  );
};

// Slide animation variants (RTL - Hebrew)
const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

// Value Proposition Screens (Steps 1-3)
const ValuePropScreens = [
  {
    icon: Wallet,
    iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
    title: 'ברוכים הבאים ל-MyWealth',
    subtitle: 'השליטה על ההון שלך מתחילה כאן',
    description: 'עקוב אחרי כל הנכסים שלך במקום אחד. מניות, קריפטו, מזומן, נדל"ן - הכל בתצוגה אחת ברורה.',
    gradient: 'from-emerald-900/50 via-slate-900 to-slate-900',
  },
  {
    icon: Sparkles,
    iconBg: 'bg-gradient-to-br from-purple-400 to-purple-600',
    title: 'יועץ AI חכם',
    subtitle: 'קבל תובנות מותאמות אישית',
    description: 'היועץ שלנו מנתח את התיק שלך ומספק המלצות מבוססות נתונים. שאל כל שאלה על הכסף שלך.',
    gradient: 'from-purple-900/50 via-slate-900 to-slate-900',
  },
  {
    icon: PieChart,
    iconBg: 'bg-gradient-to-br from-blue-400 to-blue-600',
    title: 'עקוב אחרי הכל',
    subtitle: 'קריפטו, מניות, מזומן - במקום אחד',
    description: 'גרפים אינטראקטיביים, מפות חום, ומעקב בזמן אמת. תמיד תדע בדיוק איפה הכסף שלך.',
    gradient: 'from-blue-900/50 via-slate-900 to-slate-900',
  },
];

// Asset type cards for simplified first asset
const AssetTypeCards = [
  { id: 'cash', icon: Banknote, label: 'מזומן', category: 'מזומן', instrument: 'מזומן (ILS)', color: 'emerald' },
  { id: 'crypto', icon: Bitcoin, label: 'קריפטו', category: 'קריפטו', instrument: 'Bitcoin', color: 'amber' },
  { id: 'stocks', icon: TrendingUp, label: 'מניות', category: 'מניות', instrument: 'מניה בודדת', color: 'blue' },
  { id: 'savings', icon: Landmark, label: 'חיסכון', category: 'מזומן', instrument: 'קרן כספית', color: 'purple' },
];

const OnboardingWizard = ({ 
  user, 
  onComplete, 
  onAddAsset, 
  systemData,
  setSystemData 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState('ILS');
  const [selectedAssetType, setSelectedAssetType] = useState(null);
  const [assetAmount, setAssetAmount] = useState('');
  const [assetName, setAssetName] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const totalSteps = 6; // 3 value props + currency + first asset + completion

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    if (isCompleting) return;
    setIsCompleting(true);
    
    // Show confetti
    setShowConfetti(true);

    // Add the first asset if user filled in data
    if (selectedAssetType && assetAmount) {
      const assetTypeData = AssetTypeCards.find(t => t.id === selectedAssetType);
      const assetData = {
        name: assetName || `${assetTypeData.label} ראשון`,
        symbol: assetTypeData.id === 'crypto' ? 'BTC' : assetTypeData.id === 'cash' ? 'ILS' : '',
        instrument: assetTypeData.instrument,
        platform: 'אחר',
        category: assetTypeData.category,
        currency: selectedCurrency,
        originalValue: parseFloat(assetAmount) || 0,
        tags: ['onboarding']
      };
      
      try {
        await onAddAsset(assetData);
      } catch (error) {
        console.error('Error adding first asset:', error);
      }
    }

    // Wait for animation
    setTimeout(() => {
      onComplete();
    }, 1000);
  };

  // Auto-set asset name based on type
  useEffect(() => {
    if (selectedAssetType) {
      const typeData = AssetTypeCards.find(t => t.id === selectedAssetType);
      if (typeData) {
        setAssetName(`${typeData.label} ראשוני`);
      }
    }
  }, [selectedAssetType]);

  // Render Value Proposition step
  const renderValueProp = (index) => {
    const screen = ValuePropScreens[index];
    const Icon = screen.icon;

    return (
      <div className={`min-h-[100svh] md:min-h-screen flex flex-col bg-gradient-to-b ${screen.gradient}`}>
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.8, delay: 0.2 }}
            className={`w-28 h-28 ${screen.iconBg} rounded-3xl flex items-center justify-center mb-8 shadow-2xl`}
          >
            <Icon className="w-14 h-14 text-white" strokeWidth={1.5} />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-3xl md:text-4xl font-bold text-white text-center mb-3"
          >
            {screen.title}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-xl text-emerald-400 font-medium text-center mb-6"
          >
            {screen.subtitle}
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-lg text-slate-400 text-center max-w-sm leading-relaxed"
          >
            {screen.description}
          </motion.p>
        </div>

        {/* Progress & Navigation */}
        <div className="px-8 pb-8 pt-4">
          <ProgressDots currentStep={currentStep} totalSteps={totalSteps} />
          
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            onClick={handleNext}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white text-lg font-bold rounded-2xl shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {currentStep === 2 ? 'בואו נתחיל' : 'המשך'}
            <ChevronLeft className="w-5 h-5" />
          </motion.button>

          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className="w-full py-3 text-slate-400 hover:text-white transition-colors mt-3 flex items-center justify-center gap-2"
            >
              <ChevronRight className="w-4 h-4" />
              חזור
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render Currency Selection step
  const renderCurrencyStep = () => {
    return (
      <div className="min-h-[100svh] md:min-h-screen flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mb-8 shadow-xl"
          >
            <CreditCard className="w-10 h-10 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl md:text-3xl font-bold text-white text-center mb-3"
          >
            מהו המטבע הראשי שלך?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-slate-400 text-center mb-10 max-w-sm"
          >
            בחר את המטבע שבו תרצה לראות את סכומי ההון שלך
          </motion.p>

          {/* Currency Cards */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            <motion.button
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              onClick={() => setSelectedCurrency('ILS')}
              className={`p-6 rounded-2xl border-2 transition-all ${
                selectedCurrency === 'ILS'
                  ? 'bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="text-5xl mb-3">₪</div>
              <div className="text-lg font-bold text-white">שקל ישראלי</div>
              <div className="text-sm text-slate-400">ILS</div>
              {selectedCurrency === 'ILS' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 left-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
            </motion.button>

            <motion.button
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              onClick={() => setSelectedCurrency('USD')}
              className={`p-6 rounded-2xl border-2 transition-all relative ${
                selectedCurrency === 'USD'
                  ? 'bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="text-5xl mb-3">$</div>
              <div className="text-lg font-bold text-white">דולר אמריקאי</div>
              <div className="text-sm text-slate-400">USD</div>
              {selectedCurrency === 'USD' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 left-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
            </motion.button>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-8 pb-8 pt-4">
          <ProgressDots currentStep={currentStep} totalSteps={totalSteps} />
          
          <button
            onClick={handleNext}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white text-lg font-bold rounded-2xl shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            המשך
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleBack}
            className="w-full py-3 text-slate-400 hover:text-white transition-colors mt-3 flex items-center justify-center gap-2"
          >
            <ChevronRight className="w-4 h-4" />
            חזור
          </button>
        </div>
      </div>
    );
  };

  // Render First Asset step
  const renderFirstAssetStep = () => {
    return (
      <div className="min-h-[100svh] md:min-h-screen flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
        <div className="flex-1 flex flex-col px-6 py-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              בואו נוסיף את הנכס הראשון
            </h1>
            <p className="text-slate-400">
              לא חייבים להיות מדויקים - תמיד אפשר לערוך אחר כך
            </p>
          </motion.div>

          {/* Asset Type Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <label className="text-sm font-medium text-slate-300 mb-3 block">סוג הנכס</label>
            <div className="grid grid-cols-4 gap-3">
              {AssetTypeCards.map((type, index) => {
                const Icon = type.icon;
                const isSelected = selectedAssetType === type.id;
                const colorClasses = {
                  emerald: isSelected ? 'bg-emerald-500/20 border-emerald-500' : 'border-slate-700',
                  amber: isSelected ? 'bg-amber-500/20 border-amber-500' : 'border-slate-700',
                  blue: isSelected ? 'bg-blue-500/20 border-blue-500' : 'border-slate-700',
                  purple: isSelected ? 'bg-purple-500/20 border-purple-500' : 'border-slate-700',
                };
                const iconColors = {
                  emerald: 'text-emerald-400',
                  amber: 'text-amber-400',
                  blue: 'text-blue-400',
                  purple: 'text-purple-400',
                };

                return (
                  <motion.button
                    key={type.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    onClick={() => setSelectedAssetType(type.id)}
                    className={`p-4 rounded-xl border-2 bg-slate-800/50 transition-all flex flex-col items-center gap-2 ${colorClasses[type.color]} hover:bg-slate-800`}
                  >
                    <Icon className={`w-8 h-8 ${iconColors[type.color]}`} />
                    <span className="text-white font-medium">{type.label}</span>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 left-2"
                      >
                        <Check className={`w-5 h-5 ${iconColors[type.color]}`} />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Asset Name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-4"
          >
            <label className="text-sm font-medium text-slate-300 mb-2 block">שם הנכס</label>
            <input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="למשל: חשבון בנק, ארנק ביטקוין..."
              className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-lg"
            />
          </motion.div>

          {/* Amount */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              סכום ({selectedCurrency === 'ILS' ? '₪' : '$'})
            </label>
            <div className="relative">
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-slate-400">
                {selectedCurrency === 'ILS' ? '₪' : '$'}
              </span>
              <input
                type="number"
                value={assetAmount}
                onChange={(e) => setAssetAmount(e.target.value)}
                placeholder="0"
                className="w-full p-4 pr-12 bg-slate-800/50 border border-slate-700 rounded-xl text-white text-2xl font-mono text-left placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                dir="ltr"
              />
            </div>
          </motion.div>

          {/* Skip option */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-slate-500 text-sm"
          >
            אפשר גם לדלג ולהוסיף נכסים מאוחר יותר
          </motion.p>
        </div>

        {/* Navigation */}
        <div className="px-6 pb-8 pt-4 bg-gradient-to-t from-slate-900 to-transparent">
          <ProgressDots currentStep={currentStep} totalSteps={totalSteps} />
          
          <button
            onClick={handleNext}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white text-lg font-bold rounded-2xl shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {selectedAssetType && assetAmount ? 'שמור והמשך' : 'דלג והמשך'}
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleBack}
            className="w-full py-3 text-slate-400 hover:text-white transition-colors mt-3 flex items-center justify-center gap-2"
          >
            <ChevronRight className="w-4 h-4" />
            חזור
          </button>
        </div>
      </div>
    );
  };

  // Render Completion step
  const renderCompletionStep = () => {
    return (
      <div className="min-h-[100svh] md:min-h-screen flex flex-col bg-gradient-to-b from-emerald-900/30 via-slate-900 to-slate-950">
        {showConfetti && <Confetti />}
        
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.8 }}
            className="w-32 h-32 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/50"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              <Check className="w-16 h-16 text-white" strokeWidth={3} />
            </motion.div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-3xl md:text-4xl font-bold text-white text-center mb-4"
          >
            מעולה! הכל מוכן 🎉
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-lg text-slate-400 text-center max-w-sm mb-8"
          >
            החשבון שלך מוכן לשימוש. בואו נראה את הדשבורד שלך!
          </motion.p>

          {/* Stats preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-slate-800/50 rounded-2xl p-6 w-full max-w-sm border border-slate-700"
          >
            <div className="text-sm text-slate-400 mb-2">סה"כ הון מעודכן</div>
            <div className="text-3xl font-bold text-emerald-400 font-mono">
              {selectedCurrency === 'ILS' ? '₪' : '$'}
              {assetAmount ? parseFloat(assetAmount).toLocaleString() : '0'}
            </div>
          </motion.div>
        </div>

        {/* Navigation */}
        <div className="px-8 pb-8 pt-4">
          <ProgressDots currentStep={currentStep} totalSteps={totalSteps} />
          
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            onClick={handleComplete}
            disabled={isCompleting}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-white text-lg font-bold rounded-2xl shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isCompleting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
                מכין את הדשבורד...
              </>
            ) : (
              <>
                לדשבורד שלי
                <ArrowRight className="w-5 h-5 rotate-180" />
              </>
            )}
          </motion.button>

          <button
            onClick={handleBack}
            disabled={isCompleting}
            className="w-full py-3 text-slate-400 hover:text-white transition-colors mt-3 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
            חזור
          </button>
        </div>
      </div>
    );
  };

  // Render current step
  const renderStep = () => {
    if (currentStep < 3) {
      return renderValueProp(currentStep);
    } else if (currentStep === 3) {
      return renderCurrencyStep();
    } else if (currentStep === 4) {
      return renderFirstAssetStep();
    } else {
      return renderCompletionStep();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="h-full"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default OnboardingWizard;

