import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginPage } from './components/auth/LoginPage';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { UserManagement } from './components/users/UserManagement';
import { UserRegistration } from './components/UserRegistration';
import { SeatManager } from './components/SeatManager';
import { EnhancedSettings } from './components/EnhancedSettings';

function AppContent() {
  const { state } = useApp();
  const [currentView, setCurrentView] = useState('dashboard');

  if (!state.isAuthenticated) {
    return <LoginPage />;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'users':
        return <UserManagement />;
      case 'register':
        return <UserRegistration />;
      case 'seats':
        return <SeatManager />;
      case 'settings':
        return <EnhancedSettings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <div className="flex-1 flex flex-col min-w-0">
        {renderCurrentView()}
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;