/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ViewType } from './types';
import Navigation from './components/Navigation';
import Dashboard from './views/Dashboard';
import CheckIn from './views/CheckIn';
import Messages from './views/Messages';
import Medals from './views/Medals';
import ParentControl from './views/ParentControl';
import Store from './views/Store';
import FruitsHistory from './views/FruitsHistory';
import GoalSetting from './views/GoalSetting';
import Register from './views/Register';
import Login from './views/Login';
import Profile from './views/Profile';
import RewardsManagement from './views/RewardsManagement';
import { useAuth } from './contexts/AuthContext';
import { GoalData } from './services/api';

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('login');
  const [editingGoal, setEditingGoal] = useState<(GoalData & { childId?: string }) | undefined>(undefined);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        setCurrentView('forest');
      } else {
        setCurrentView('login');
      }
    }
  }, [isAuthenticated, isLoading]);

  const handleLoginSuccess = () => setCurrentView('forest');
  const handleLogout = () => setCurrentView('login');

  const handleEditGoal = (goal: GoalData & { childId?: string }) => {
    setEditingGoal(goal);
    setCurrentView('add-goal');
  };

  const handleGoalBack = () => {
    setEditingGoal(undefined);
    setCurrentView('forest');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background-light">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-primary text-5xl animate-pulse">forest</span>
          <p className="text-slate-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'forest':
        return (
          <Dashboard
            onAddGoal={() => { setEditingGoal(undefined); setCurrentView('add-goal'); }}
            onViewStore={() => setCurrentView('store')}
            onViewProfile={() => setCurrentView('parent')}
            onEditGoal={handleEditGoal}
          />
        );
      case 'tasks':
        return (
          <CheckIn
            onViewMessages={() => setCurrentView('messages')}
            onViewProfile={() => setCurrentView('parent')}
          />
        );
      case 'messages':
        return <Messages onBack={() => setCurrentView('tasks')} />;
      case 'medals':
        return <Medals onBack={() => setCurrentView('forest')} />;
      case 'parent':
        return (
          <Profile
            onBack={() => setCurrentView('forest')}
            onLogout={handleLogout}
            onViewParentControl={() => setCurrentView('parent-control')}
            onViewRewardsManagement={() => setCurrentView('rewards-management')}
          />
        );
      case 'profile':
        return (
          <Profile
            onBack={() => setCurrentView('forest')}
            onLogout={handleLogout}
            onViewParentControl={() => setCurrentView('parent-control')}
            onViewRewardsManagement={() => setCurrentView('rewards-management')}
          />
        );
      case 'parent-control':
        return <ParentControl onBack={() => setCurrentView('parent')} />;
      case 'rewards-management':
        return <RewardsManagement onBack={() => setCurrentView('parent')} />;
      case 'register':
        return (
          <Register
            onBack={() => setCurrentView('login')}
            onLogin={() => setCurrentView('login')}
            onRegisterSuccess={handleLoginSuccess}
          />
        );
      case 'login':
        return (
          <Login
            onBack={() => setCurrentView('forest')}
            onRegister={() => setCurrentView('register')}
            onLoginSuccess={handleLoginSuccess}
          />
        );
      case 'store':
        return <Store onBack={() => setCurrentView('forest')} onViewFruitsHistory={() => setCurrentView('fruits-history')} />;
      case 'fruits-history':
        return <FruitsHistory onBack={() => setCurrentView('store')} />;
      case 'add-goal':
        return (
          <GoalSetting
            onBack={handleGoalBack}
            editGoal={editingGoal}
          />
        );
      default:
        return (
          <Dashboard
            onAddGoal={() => { setEditingGoal(undefined); setCurrentView('add-goal'); }}
            onViewStore={() => setCurrentView('store')}
            onViewProfile={() => setCurrentView('parent')}
            onEditGoal={handleEditGoal}
          />
        );
    }
  };

  const showNav = !['add-goal', 'register', 'login'].includes(currentView) && isAuthenticated;

  return (
    <div className="relative flex min-h-screen w-full overflow-x-hidden bg-background-light lg:flex-row">
      {showNav && (
        <Navigation currentView={currentView} onViewChange={setCurrentView} />
      )}
      <div className={`flex flex-1 flex-col${showNav ? ' lg:ml-60' : ''}`}>
        {renderView()}
      </div>
    </div>
  );
}
