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
import GoalSetting from './views/GoalSetting';
import Register from './views/Register';
import Login from './views/Login';
import Profile from './views/Profile';
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
      <div className="flex min-h-screen w-full items-center justify-center bg-background-light max-w-md mx-auto">
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
          />
        );
      case 'profile':
        return (
          <Profile
            onBack={() => setCurrentView('forest')}
            onLogout={handleLogout}
            onViewParentControl={() => setCurrentView('parent-control')}
          />
        );
      case 'parent-control':
        return <ParentControl onBack={() => setCurrentView('parent')} />;
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
        return <Store onBack={() => setCurrentView('forest')} />;
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

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light max-w-md mx-auto shadow-2xl">
      {renderView()}

      {!['add-goal', 'register', 'login'].includes(currentView) && isAuthenticated && (
        <Navigation currentView={currentView} onViewChange={setCurrentView} />
      )}
    </div>
  );
}
