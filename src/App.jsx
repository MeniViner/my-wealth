import { Routes, Route, Navigate } from 'react-router-dom';
import { useMemo, useEffect } from 'react';
import { collection, getDocs, writeBatch, doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from './hooks/useAuth';
import { useAssets } from './hooks/useAssets';
import { useSystemData } from './hooks/useSystemData';
import { useCurrency } from './hooks/useCurrency';
import { useAIConfig } from './hooks/useAIConfig';
import { useOnboarding } from './hooks/useOnboarding';
import { useDemoData, DemoDataProvider } from './contexts/DemoDataContext';
import { db, appId } from './services/firebase';
import { generatePortfolioContext } from './utils/aiContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AssetManager from './pages/AssetManager';
import AssetForm from './pages/AssetForm';
import AIAdvisor from './pages/AIAdvisor';
import Settings from './pages/Settings';
import ChartBuilder from './pages/ChartBuilder';
import DynamicDashboard from './pages/DynamicDashboard';
import UserManagement from './pages/UserManagement';
import Rebalancing from './pages/Rebalancing';
import Profile from './pages/Profile';
import OnboardingWizard from './components/OnboardingWizard';
import CoachmarkTour from './components/CoachmarkTour';
import { DEFAULT_SYSTEM_DATA } from './constants/defaults';
import { confirmAlert, successAlert, errorAlert } from './utils/alerts';

function App() {
  const { user, loading: authLoading } = useAuth();
  const { currencyRate, refreshCurrencyRate } = useCurrency(user);
  const { systemData, setSystemData } = useSystemData(user);
  const { assets, addAsset, updateAsset, deleteAsset, initializeAssets, refreshPrices, pricesLoading, lastPriceUpdate } = useAssets(user, currencyRate.rate);
  const { aiConfig } = useAIConfig(user);
  const { 
    hasCompletedOnboarding, 
    showCoachmarks, 
    loading: onboardingLoading,
    completeOnboarding,
    dismissCoachmarks,
    resetOnboarding, // For testing - can be called from console
    startCoachmarks
  } = useOnboarding(user);
  
  // Get demo data context (must be inside DemoDataProvider, so we'll move this)

  // Expose reset function for testing (can call window.__resetOnboarding() in console)
  useEffect(() => {
    if (user && resetOnboarding) {
      window.__resetOnboarding = resetOnboarding;
    }
    return () => {
      delete window.__resetOnboarding;
    };
  }, [user, resetOnboarding]);

  // // Debug: Log user info when user changes
  // useEffect(() => {
  //   if (user) {
  //     console.log('%c👤 Current User Info:', 'color: #3b82f6; font-weight: bold;');
  //     console.log('  User ID:', user.uid);
  //     console.log('  Email:', user.email);
  //     console.log('  Display Name:', user.displayName);
  //     console.log('  Photo URL:', user.photoURL);
  //     console.log('%c💡 Tip: Use window.__getCurrentUser() in console to get user info anytime', 'color: #10b981;');
  //   }
  // }, [user]);

  // Calculate total wealth
  const totalWealth = useMemo(() => {
    return assets.reduce((sum, item) => sum + item.value, 0);
  }, [assets]);

  // Generate portfolio context string for AI interactions
  // This will be updated inside DemoDataProvider to use demo context if active
  const portfolioContextString = useMemo(() => {
    return generatePortfolioContext(assets);
  }, [assets]);

  // Create user document when user first logs in
  useEffect(() => {
    const createUserDocument = async () => {
      if (!user || !db) return;
      
      try {
        const userRef = doc(db, 'artifacts', appId, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        // Only create if doesn't exist
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: user.email || user.uid,
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            createdAt: new Date(),
            lastLogin: new Date()
          });
          console.log('User document created:', user.uid);
        } else {
          // Update last login
          await setDoc(userRef, {
            lastLogin: new Date()
          }, { merge: true });
        }
      } catch (error) {
        console.error('Error creating/updating user document:', error);
      }
    };

    createUserDocument();
  }, [user]);

  // Handle asset save (both add and update)
  const handleSaveAsset = async (assetData) => {
    if (assetData.id) {
      await updateAsset(assetData.id, assetData);
    } else {
      await addAsset(assetData);
    }
  };

  // Handle initialize database - only works in normal mode, not in demo mode
  const handleInitializeDB = async () => {
    // Verify user is logged in
    if (!user) {
      await errorAlert('שגיאה', 'יש להתחבר כדי לאתחל את מסד הנתונים.');
      return;
    }

    const confirmed = await confirmAlert(
      'אתחול מסד נתונים',
      'פעולה זו תמחק את כל הנתונים הקיימים ותטען את נתוני ברירת המחדל. האם להמשיך?',
      'warning'
    );
    if (!confirmed) {
      return;
    }
    
    try {
      if (!db) {
        await errorAlert('שגיאה', 'מסד הנתונים לא זמין. אנא בדוק את הגדרות Firebase.');
        return;
      }
      
      const batch = writeBatch(db);
      
      // 1. Initialize assets for the logged-in user (deletes old and adds new)
      const assetsSuccess = await initializeAssets();
      if (!assetsSuccess) {
        await errorAlert('שגיאה', 'אירעה שגיאה באתחול הנכסים.');
        return;
      }
      
      // 2. Delete all reports for the logged-in user
      const reportsSnapshot = await getDocs(
        collection(db, 'artifacts', appId, 'users', user.uid, 'reports')
      );
      reportsSnapshot.docs.forEach((d) => batch.delete(d.ref));
      
      // 3. Delete all dashboard widgets for the logged-in user
      const widgetsSnapshot = await getDocs(
        collection(db, 'artifacts', appId, 'users', user.uid, 'dashboard_widgets')
      );
      widgetsSnapshot.docs.forEach((d) => batch.delete(d.ref));
      
      // 4. Reset system data for the logged-in user
      const configRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config');
      batch.set(configRef, DEFAULT_SYSTEM_DATA);
      
      // Commit all deletions and resets
      await batch.commit();
      
      // Also update local state
      await setSystemData(DEFAULT_SYSTEM_DATA);
      
      await successAlert('הצלחה', 'הנתונים אותחלו בהצלחה והועלו לפיירבייס של המשתמש המחובר!');
    } catch (error) {
      console.error('Error initializing database:', error);
      await errorAlert('שגיאה', 'אירעה שגיאה באתחול הנתונים: ' + error.message);
    }
  };

  // Loading state
  if (authLoading || (user && onboardingLoading)) {
    return (
      <div className="min-h-[100svh] md:min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-400">טוען...</p>
        </div>
      </div>
    );
  }

  // Show login page if user is not authenticated
  if (!user) {
    return <Login />;
  }

  // Show onboarding wizard for new users
  if (!hasCompletedOnboarding) {
    return (
      <DemoDataProvider>
        <OnboardingWizardWithDemo
          user={user}
          onComplete={completeOnboarding}
          addAsset={addAsset}
          systemData={systemData}
          setSystemData={setSystemData}
        />
      </DemoDataProvider>
    );
  }

  return (
    <DemoDataProvider>
      <AppWithDemo 
        user={user}
        assets={assets}
        systemData={systemData}
        setSystemData={setSystemData}
        currencyRate={currencyRate}
        totalWealth={totalWealth}
        aiConfig={aiConfig}
        addAsset={addAsset}
        updateAsset={updateAsset}
        deleteAsset={deleteAsset}
        handleInitializeDB={handleInitializeDB}
        refreshCurrencyRate={refreshCurrencyRate}
        resetOnboarding={resetOnboarding}
        startCoachmarks={startCoachmarks}
        showCoachmarks={showCoachmarks}
        dismissCoachmarks={dismissCoachmarks}
        portfolioContextString={portfolioContextString}
        refreshPrices={refreshPrices}
        pricesLoading={pricesLoading}
        lastPriceUpdate={lastPriceUpdate}
      />
    </DemoDataProvider>
  );
}

// Internal component that can use useDemoData hook
const AppWithDemo = ({
  user,
  assets,
  systemData,
  setSystemData,
  currencyRate,
  totalWealth,
  aiConfig,
  addAsset,
  updateAsset,
  deleteAsset,
  handleInitializeDB,
  refreshCurrencyRate,
  resetOnboarding,
  startCoachmarks,
  showCoachmarks,
  dismissCoachmarks,
  portfolioContextString,
  refreshPrices,
  pricesLoading,
  lastPriceUpdate
}) => {
  const { isActive: isDemoActive, addDemoAsset, updateDemoAsset, deleteDemoAsset, updateDemoSystemData, demoSystemData, demoAssets } = useDemoData();
  
  // Handle asset save (both add and update) - route to demo or Firebase based on mode
  const handleSaveAsset = async (assetData) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:270',message:'handleSaveAsset called',data:{isDemoActive,hasId:!!assetData.id,assetName:assetData.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (isDemoActive) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:273',message:'handleSaveAsset demo mode',data:{hasId:!!assetData.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // In demo mode, save only to localStorage
      if (assetData.id) {
        updateDemoAsset(assetData.id, assetData);
      } else {
        addDemoAsset(assetData);
      }
    } else {
      // Normal mode, save to Firebase
      if (assetData.id) {
        await updateAsset(assetData.id, assetData);
      } else {
        await addAsset(assetData);
      }
    }
  };

  // Handle asset delete - route to demo or Firebase based on mode
  const handleDeleteAsset = async (assetId) => {
    if (isDemoActive) {
      // In demo mode, delete only from localStorage
      deleteDemoAsset(assetId);
    } else {
      // Normal mode, delete from Firebase
      await deleteAsset(assetId);
    }
  };

  // Handle systemData update - route to demo or Firebase based on mode
  const handleSetSystemData = async (newSystemData) => {
    if (isDemoActive) {
      // In demo mode, save only to localStorage
      updateDemoSystemData(newSystemData);
    } else {
      // Normal mode, save to Firebase
      await setSystemData(newSystemData);
    }
  };

  // Use demo systemData if in demo mode, otherwise use real systemData
  const displaySystemData = isDemoActive && demoSystemData ? demoSystemData : systemData;
  
  // Use demo assets if in demo mode, otherwise use real assets
  const displayAssets = isDemoActive && demoAssets.length > 0 ? demoAssets : assets;

  return (
    <>
      {/* Coachmark Tour - shown after onboarding */}
      <CoachmarkTour 
        isActive={showCoachmarks} 
        onComplete={dismissCoachmarks}
      />
      
      <Layout totalWealth={totalWealth} currencyRate={currencyRate} user={user}>
        <Routes>
        <Route 
          path="/" 
          element={<Dashboard assets={displayAssets} systemData={displaySystemData} currencyRate={currencyRate} />} 
        />
        <Route 
          path="/advisor" 
          element={<AIAdvisor assets={displayAssets} totalWealth={totalWealth} user={user} portfolioContext={portfolioContextString} aiConfig={aiConfig} />} 
        />
        <Route 
          path="/assets" 
          element={
            <AssetManager 
              assets={displayAssets} 
              onDelete={handleDeleteAsset} 
              systemData={displaySystemData}
              setSystemData={handleSetSystemData}
              onResetData={handleInitializeDB}
              user={user}
              onRefreshPrices={refreshPrices}
              pricesLoading={pricesLoading}
              lastPriceUpdate={lastPriceUpdate}
            />
          } 
        />
        <Route 
          path="/assets/add" 
          element={
            <AssetForm 
              onSave={handleSaveAsset}
              systemData={displaySystemData}
              setSystemData={handleSetSystemData}
              portfolioContext={portfolioContextString}
            />
          } 
        />
        <Route 
          path="/assets/edit/:id" 
          element={
            <AssetForm 
              onSave={handleSaveAsset}
              assets={displayAssets}
              systemData={displaySystemData}
              setSystemData={handleSetSystemData}
              portfolioContext={portfolioContextString}
            />
          } 
        />
        <Route 
          path="/settings" 
          element={
            <Settings 
              systemData={displaySystemData} 
              setSystemData={handleSetSystemData} 
              currencyRate={currencyRate} 
              user={user} 
              onResetData={handleInitializeDB}
              onRefreshCurrency={refreshCurrencyRate}
              onResetOnboarding={resetOnboarding}
              onStartCoachmarks={startCoachmarks}
            />
          } 
        />
        <Route 
          path="/chart-builder" 
          element={<ChartBuilder />} 
        />
        <Route 
          path="/dashboard/custom" 
          element={<DynamicDashboard />} 
        />
        <Route 
          path="/rebalancing" 
          element={
            <Rebalancing 
              assets={displayAssets} 
              systemData={displaySystemData} 
              user={user} 
              currencyRate={currencyRate}
              portfolioContext={portfolioContextString}
            />
          } 
        />
        <Route 
          path="/admin/users" 
          element={<UserManagement user={user} />} 
        />
        <Route 
          path="/profile" 
          element={
            <Profile 
              user={user}
              assets={displayAssets}
              totalWealth={totalWealth}
              systemData={displaySystemData}
            />
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
    </>
  );
}

// OnboardingWizard wrapper that can use demo mode
const OnboardingWizardWithDemo = ({ user, onComplete, addAsset, systemData, setSystemData }) => {
  const { isActive: isDemoActive, addDemoAsset } = useDemoData();
  
  const handleAddAsset = async (assetData) => {
    if (isDemoActive) {
      // In demo mode, add only to localStorage
      addDemoAsset(assetData);
    } else {
      // Normal mode, add to Firebase
      await addAsset(assetData);
    }
  };

  return (
    <OnboardingWizard
      user={user}
      onComplete={onComplete}
      onAddAsset={handleAddAsset}
      systemData={systemData}
      setSystemData={setSystemData}
    />
  );
}

export default App;

