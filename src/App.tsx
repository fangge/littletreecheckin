/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
import Profile from './views/Profile';
import CelebrationPopup from './components/CelebrationPopup';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('forest');
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case 'forest':
        return (
          <Dashboard 
            onAddGoal={() => setCurrentView('add-goal')} 
            onViewStore={() => setCurrentView('store')}
            onViewProfile={() => setCurrentView('parent')}
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
            onLogout={() => setCurrentView('register')} 
            onViewParentControl={() => setCurrentView('parent-control')}
          />
        );
      case 'profile':
        return (
          <Profile 
            onBack={() => setCurrentView('forest')} 
            onLogout={() => setCurrentView('register')} 
            onViewParentControl={() => setCurrentView('parent-control')}
          />
        );
      case 'parent-control':
        return <ParentControl onBack={() => setCurrentView('parent')} />;
      case 'register':
        return <Register onBack={() => setCurrentView('forest')} onLogin={() => setCurrentView('forest')} onRegisterSuccess={() => setCurrentView('forest')} />;
      case 'store':
        return <Store onBack={() => setCurrentView('forest')} />;
      case 'add-goal':
        return <GoalSetting onBack={() => setCurrentView('forest')} />;
      default:
        return (
          <Dashboard 
            onAddGoal={() => setCurrentView('add-goal')} 
            onViewStore={() => setCurrentView('store')}
            onViewProfile={() => setCurrentView('parent')}
          />
        );
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light max-w-md mx-auto shadow-2xl">
      {renderView()}
      
      {/* Navigation is hidden in GoalSetting and Register views for a cleaner look */}
      {!['add-goal', 'register'].includes(currentView) && (
        <Navigation currentView={currentView} onViewChange={setCurrentView} />
      )}

      {/* Floating button to trigger Celebration (for demo purposes) */}
      <button 
        onClick={() => setIsCelebrationOpen(true)}
        className="fixed top-4 right-4 z-50 size-10 bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-400 hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined">celebration</span>
      </button>

      <CelebrationPopup 
        isOpen={isCelebrationOpen} 
        onClose={() => setIsCelebrationOpen(false)} 
      />
    </div>
  );
}

