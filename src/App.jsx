import { Routes, Route, Navigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from './hooks/useAuth';
import { useAssets } from './hooks/useAssets';
import { useSystemData } from './hooks/useSystemData';
import { useCurrency } from './hooks/useCurrency';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AssetManager from './pages/AssetManager';
import AssetForm from './pages/AssetForm';
import AIAdvisor from './pages/AIAdvisor';
import Settings from './pages/Settings';
import ChartBuilder from './pages/ChartBuilder';
import { DEFAULT_SYSTEM_DATA } from './constants/defaults';
import { confirmAlert, successAlert, errorAlert } from './utils/alerts';

function App() {
  const { user, loading: authLoading } = useAuth();
  const { currencyRate } = useCurrency(user);
  const { systemData, setSystemData } = useSystemData(user);
  const { assets, addAsset, updateAsset, deleteAsset, initializeAssets } = useAssets(user, currencyRate.rate);

  // Calculate total wealth
  const totalWealth = useMemo(() => {
    return assets.reduce((sum, item) => sum + item.value, 0);
  }, [assets]);

  // Handle asset save (both add and update)
  const handleSaveAsset = async (assetData) => {
    if (assetData.id) {
      await updateAsset(assetData.id, assetData);
    } else {
      await addAsset(assetData);
    }
  };

  // Handle initialize database
  const handleInitializeDB = async () => {
    const confirmed = await confirmAlert(
      'אתחול מסד נתונים',
      'פעולה זו תמחק את כל הנתונים הקיימים ותטען את נתוני ברירת המחדל. האם להמשיך?',
      'warning'
    );
    if (!confirmed) {
      return;
    }
    
    const success = await initializeAssets();
    if (success) {
      // Also reset system data
      await setSystemData(DEFAULT_SYSTEM_DATA);
      await successAlert('הצלחה', 'הנתונים אותחלו בהצלחה והועלו לפיירבייס!');
    } else {
      await errorAlert('שגיאה', 'אירעה שגיאה באתחול הנתונים.');
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout totalWealth={totalWealth} currencyRate={currencyRate}>
      <Routes>
        <Route 
          path="/" 
          element={<Dashboard assets={assets} systemData={systemData} currencyRate={currencyRate} />} 
        />
        <Route 
          path="/advisor" 
          element={<AIAdvisor assets={assets} totalWealth={totalWealth} user={user} />} 
        />
        <Route 
          path="/assets" 
          element={
            <AssetManager 
              assets={assets} 
              onDelete={deleteAsset} 
              systemData={systemData} 
            />
          } 
        />
        <Route 
          path="/assets/add" 
          element={
            <AssetForm 
              onSave={async (assetData) => {
                await handleSaveAsset(assetData);
              }}
              systemData={systemData} 
            />
          } 
        />
        <Route 
          path="/assets/edit/:id" 
          element={
            <AssetForm 
              onSave={async (assetData) => {
                await handleSaveAsset(assetData);
              }}
              assets={assets}
              systemData={systemData} 
            />
          } 
        />
        <Route 
          path="/settings" 
          element={
            <Settings 
              systemData={systemData} 
              setSystemData={setSystemData} 
              currencyRate={currencyRate} 
              user={user} 
              onResetData={handleInitializeDB} 
            />
          } 
        />
        <Route 
          path="/chart-builder" 
          element={<ChartBuilder />} 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;

