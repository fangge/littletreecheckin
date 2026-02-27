import React from 'react';
import { ViewType } from '../types';

interface NavigationProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export default function Navigation({ currentView, onViewChange }: NavigationProps) {
  const navItems = [
    { id: 'forest' as ViewType, label: '成长树', icon: 'park' },
    { id: 'tasks' as ViewType, label: '任务', icon: 'task_alt' },
    { id: 'medals' as ViewType, label: '勋章', icon: 'workspace_premium' },
    { id: 'parent' as ViewType, label: '家长中心', icon: 'family_restroom' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-primary/10 bg-white/90 backdrop-blur-xl px-4 pb-6 pt-3">
      <div className="flex gap-2 max-w-md mx-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex flex-1 flex-col items-center justify-end gap-1 transition-colors ${
              currentView === item.id ? 'text-primary' : 'text-slate-400'
            }`}
          >
            <span className={`material-symbols-outlined text-2xl ${currentView === item.id ? 'fill-icon' : ''}`}>
              {item.icon}
            </span>
            <p className="text-[10px] font-bold leading-normal tracking-wide">{item.label}</p>
          </button>
        ))}
      </div>
    </nav>
  );
}
