import React from 'react';
import { motion } from 'motion/react';

interface CheckInProps {
  onViewMessages: () => void;
  onViewProfile: () => void;
}

export default function CheckIn({ onViewMessages, onViewProfile }: CheckInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-1 flex flex-col items-center p-6 space-y-8 overflow-y-auto pb-32"
    >
      <header className="w-full flex items-center bg-background-light/80 backdrop-blur-md sticky top-0 z-10 py-4 justify-between">
        <button 
          onClick={onViewProfile}
          className="text-slate-900 flex size-12 shrink-0 items-center justify-start hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-2xl">settings</span>
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center font-display">每日打卡</h2>
        <div className="flex w-12 items-center justify-end">
          <button 
            onClick={onViewMessages}
            className="flex items-center justify-center rounded-full size-10 bg-primary/10 text-primary"
          >
            <span className="material-symbols-outlined text-2xl fill-icon">mail</span>
          </button>
        </div>
      </header>

      <div className="relative w-full max-w-sm aspect-square bg-gradient-to-b from-blue-100 to-primary/5 rounded-3xl overflow-hidden shadow-inner flex flex-col items-center justify-center border-4 border-white">
        <div className="absolute top-8 left-8 text-yellow-400">
          <span className="material-symbols-outlined text-6xl fill-icon">light_mode</span>
        </div>
        <div className="absolute top-12 right-12 text-white/80">
          <span className="material-symbols-outlined text-4xl fill-icon">cloud</span>
        </div>
        
        <div className="relative z-0 mt-auto mb-12">
          <div 
            className="w-48 h-48 bg-contain bg-center bg-no-repeat" 
            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBEts_s4BAoQg3OmVaooI0IZkWvrMeugSDWamHNfBZJlvwd2vSMfkMmSGzwZZgGuFRwtRdapeZaqMlq3_gQ8mHWU2GtsTfzXsi7nNMs6flXdPo39q5ogmPdcMup7xe6iJnslpGYQkjTAu33RgUh4N6v8H7LQxFyeKeGoWkbFy7WWoggetfOL8CkcYePrbjXrdqlVpDul9ZIBDlOOma17rMKiDUpcmIYg5fcZxsq9CElxAooa6WL7ZsTs1J7ls-epe4-WzBNkx2xMs1d')" }}
          />
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900/10 blur-md rounded-full"></div>
        </div>
        
        <div className="absolute bottom-0 w-full h-12 bg-primary/20 flex items-center justify-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80">幼苗阶段</p>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col gap-3 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="flex gap-6 justify-between items-center">
            <p className="text-slate-900 text-base font-bold">成长进度</p>
            <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-bold rounded-full">已完成 4/10</span>
          </div>
          <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-primary shadow-[0_0_10px_rgba(13,242,13,0.5)]" style={{ width: '40%' }}></div>
          </div>
          <p className="text-primary text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">water_drop</span>
            再完成 6 个任务，小树就能结果啦！
          </p>
        </div>

        <div className="text-center py-4">
          <h1 className="text-slate-900 tracking-tight text-3xl font-extrabold leading-tight">浇水时间到！</h1>
          <p className="text-slate-500 mt-2">坚持完成好习惯，让你的幼苗长成参天大树吧。</p>
        </div>

        <button className="w-full py-6 bg-primary text-background-dark text-xl font-extrabold rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-transform flex items-center justify-center gap-3">
          <span className="material-symbols-outlined text-3xl">task_alt</span>
          立即打卡
        </button>
      </div>
    </motion.div>
  );
}
