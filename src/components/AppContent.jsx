import { useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDemoData } from '../contexts/DemoDataContext';
import { generatePortfolioContext } from '../utils/aiContext';
import Layout from './Layout';
import Dashboard from '../pages/Dashboard';
import AssetManager from '../pages/AssetManager';
import AssetForm from '../pages/AssetForm';
import AIAdvisor from '../pages/AIAdvisor';
import Settings from '../pages/Settings';
import ChartBuilder from '../pages/ChartBuilder';
import DynamicDashboard from '../pages/DynamicDashboard';
import UserManagement from '../pages/UserManagement';
import Rebalancing from '../pages/Rebalancing';
import Profile from '../pages/Profile';
import CoachmarkTour from './CoachmarkTour';

/**
 * AppContent - Component that uses demo data context
 * Separated from App to allow useDemoData hook to work inside DemoDataProvider
 */
const AppContent = ({
  user,
  assets,
  systemData,
  setSystemData,
  currencyRate,
  totalWealth,
  aiConfig,
  addAsset,
  deleteAsset,
  handleSaveAsset,
  handleInitializeDB,
  refreshCurrencyRate,
  resetOnboarding,
  startCoachmarks,
  showCoachmarks,
  dismissCoachmarks
}) => {
  const { demoAssets, isActive: isDemoActive, demoPortfolioContext } = useDemoData();

  // Generate portfolio context string for AI interactions
  // Use demo context if demo mode is active, otherwise use real assets
  const portfolioContextString = useMemo(() => {
    if (isDemoActive && demoPortfolioContext) {
      return demoPortfolioContext;
    }
    return generatePortfolioContext(assets);
  }, [assets, isDemoActive, demoPortfolioContext]);

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
            element={<Dashboard assets={assets} systemData={systemData} currencyRate={currencyRate} />} 
          />
          <Route 
            path="/advisor" 
            element={<AIAdvisor assets={assets} totalWealth={totalWealth} user={user} portfolioContext={portfolioContextString} aiConfig={aiConfig} />} 
          />
          <Route 
            path="/assets" 
            element={
              <AssetManager 
                assets={assets} 
                onDelete={deleteAsset} 
                systemData={systemData}
                setSystemData={setSystemData}
                onResetData={handleInitializeDB}
                user={user}
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
                setSystemData={setSystemData}
                portfolioContext={portfolioContextString}
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
                setSystemData={setSystemData}
                portfolioContext={portfolioContextString}
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
                assets={assets} 
                systemData={systemData} 
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
                assets={assets}
                totalWealth={totalWealth}
                systemData={systemData}
              />
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </>
  );
};

export default AppContent;

