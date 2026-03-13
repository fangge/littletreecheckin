import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { medalsApi, MedalData } from '../services/api';

interface MedalsProps {
  onBack: () => void;
}

export default function Medals({ onBack }: MedalsProps) {
  const { user, currentChild, setCurrentChild } = useAuth();
  const [medals, setMedals] = useState<MedalData[]>([]);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMedal, setSelectedMedal] = useState<MedalData | null>(null);

  useEffect(() => {
    if (!currentChild) return;

    const fetchMedals = async () => {
      setIsLoading(true);
      try {
        const res = await medalsApi.list(currentChild.id);
        setMedals(res.data);
      } catch (err) {
        console.error('获取勋章失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMedals();
  }, [currentChild]);

  const filteredMedals = medals.filter(m => {
    if (filter === 'unlocked') return m.unlocked;
    if (filter === 'locked') return !m.unlocked;
    return true;
  });

  const unlockedCount = medals.filter(m => m.unlocked).length;
  const latestMedal = medals.filter(m => m.unlocked && m.unlocked_at)
    .sort((a, b) => new Date(b.unlocked_at!).getTime() - new Date(a.unlocked_at!).getTime())[0];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-1 overflow-y-auto pb-32 lg:pb-8"
    >
      <header className="sticky top-0 z-10 bg-background-light/80 backdrop-blur-md border-b border-primary/10">
        <div className="px-4 py-4 flex items-center justify-between lg:max-w-2xl lg:mx-auto">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-primary/20"
            aria-label="返回"
          >
            <span className="material-symbols-outlined text-slate-700">arrow_back</span>
          </button>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">我的勋章墙</h1>
          <div className="w-10 h-10" />
        </div>
        {/* 多孩子切换器 */}
        {user?.children && user.children.length > 1 && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar lg:max-w-2xl lg:mx-auto">
            {user.children.map(child => (
              <button
                key={child.id}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  currentChild?.id === child.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/40'
                }`}
                onClick={() => setCurrentChild(child)}
                aria-label={`切换到${child.name}`}
              >
                <span className="material-symbols-outlined text-sm">
                  {child.gender === 'female' ? 'face_3' : 'face'}
                </span>
                {child.name}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="lg:max-w-2xl lg:mx-auto">
      <section className="p-6 flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div className="w-32 h-32 rounded-full border-4 border-primary bg-primary/10 p-1 shadow-lg overflow-hidden flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-6xl">child_care</span>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-primary text-slate-900 font-bold px-3 py-1 rounded-full text-xs shadow-md border-2 border-white">
            {unlockedCount} 枚
          </div>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-1">{currentChild?.name || '小园丁'}</h2>
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary font-bold">workspace_premium</span>
          <p className="text-slate-600 font-semibold">已获得 {unlockedCount} 枚勋章</p>
        </div>
        <p className="text-sm text-slate-500 max-w-[280px]">你做得太棒了！继续照顾你的小树来解锁更多成就吧！</p>
      </section>

      <nav className="px-6 mb-6">
        <div className="flex bg-slate-200/50 p-1 rounded-xl">
          {(['all', 'unlocked', 'locked'] as const).map(f => (
            <button
              key={f}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${filter === f ? 'bg-primary text-slate-900 shadow-sm' : 'text-slate-600'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '全部' : f === 'unlocked' ? '已解锁' : '未解锁'}
            </button>
          ))}
        </div>
      </nav>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="material-symbols-outlined text-primary text-4xl animate-pulse">workspace_premium</span>
        </div>
      ) : (
        <section className="px-6 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-8 gap-x-4 py-4">
          {filteredMedals.map((medal) => (
            <button
              key={medal.id}
              onClick={() => setSelectedMedal(medal)}
              className={`flex flex-col items-center gap-2 ${!medal.unlocked ? 'opacity-50 grayscale' : ''} cursor-pointer`}
            >
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${medal.color} flex items-center justify-center shadow-lg border-4 border-white relative`}>
                <span className="material-symbols-outlined text-4xl text-white drop-shadow-md fill-icon">
                  {medal.icon}
                </span>
                {medal.unlocked && (
                  <div className="absolute -top-1 -right-1 bg-green-500 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                    <span className="material-symbols-outlined text-xs text-white font-bold">check</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] font-extrabold text-slate-800 text-center leading-tight tracking-wider">{medal.name}</p>
              {medal.unlocked && medal.unlocked_at && (
                <p className="text-[9px] text-slate-400">
                  {new Date(medal.unlocked_at).toLocaleDateString('zh-CN')}
                </p>
              )}
            </button>
          ))}
        </section>
      )}

      {latestMedal && (
        <div className="mx-6 mt-8 p-4 bg-white rounded-2xl shadow-xl border-2 border-primary/20 flex gap-4 items-center">
          <div className="w-16 h-16 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-3xl fill-icon">military_tech</span>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">最新获得奖励</h3>
            <p className="text-xs text-slate-600">
              "{latestMedal.name}" 获得于 {new Date(latestMedal.unlocked_at!).toLocaleDateString('zh-CN')}
            </p>
          </div>
        </div>
      )}
      </div>

      {/* 勋章详情弹窗 */}
      <AnimatePresence>
        {selectedMedal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setSelectedMedal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${selectedMedal.color} flex items-center justify-center shadow-lg border-4 border-white mb-4`}>
                  <span className="material-symbols-outlined text-5xl text-white drop-shadow-md fill-icon">
                    {selectedMedal.icon}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2">{selectedMedal.name}</h3>
                <p className="text-slate-600 mb-4">{selectedMedal.description}</p>
                
                <div className={`w-full p-3 rounded-xl mb-4 ${selectedMedal.unlocked ? 'bg-green-50' : 'bg-slate-50'}`}>
                  <p className={`text-sm font-semibold ${selectedMedal.unlocked ? 'text-green-600' : 'text-slate-600'}`}>
                    {selectedMedal.unlocked ? '已解锁' : '未解锁'}
                  </p>
                  {selectedMedal.unlocked && selectedMedal.unlocked_at && (
                    <p className="text-xs text-slate-500 mt-1">
                      解锁时间：{new Date(selectedMedal.unlocked_at).toLocaleDateString('zh-CN')}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => setSelectedMedal(null)}
                  className="w-full py-3 bg-primary text-slate-900 font-bold rounded-xl"
                >
                  知道了
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
