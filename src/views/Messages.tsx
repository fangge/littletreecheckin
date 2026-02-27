import React from 'react';
import { motion } from 'motion/react';
import { MESSAGES } from '../constants';

interface MessagesProps {
  onBack: () => void;
}

export default function Messages({ onBack }: MessagesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-1 flex flex-col h-full bg-background-light overflow-hidden"
    >
      <header className="flex items-center bg-background-light/80 backdrop-blur-md p-4 sticky top-0 z-10 justify-between border-b border-primary/10">
        <div className="text-slate-900 flex size-12 shrink-0 items-center justify-start">
          <span onClick={onBack} className="material-symbols-outlined cursor-pointer">arrow_back_ios</span>
        </div>
        <h2 className="text-slate-900 text-lg font-bold leading-tight flex-1 text-center">消息中心</h2>
        <div className="flex w-12 items-center justify-end">
          <button className="flex items-center justify-center rounded-full h-10 w-10 bg-primary/20 text-slate-900">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto relative pb-24 px-6">
        <div className="absolute inset-x-0 top-0 h-96 opacity-40 z-0 pointer-events-none">
          <div 
            className="w-full h-full bg-cover bg-center" 
            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBnhspIJcu3dIyHe63mXvTZe8L2LxISb7jBfphjnWDvt5gO5lRPy-wKk6RNDFHXr9cYT6NnmKgBCINnAqqh-SrNNVe508PDzWRq6J3yZ1nc3rCLHueSGn3-oRvdGwuyDEUliP5vEPuYq7UWOiWBjklqa7gB68FVgZ-cmjT4Od0l5C0rTY5Ow6D8X2rTijt-1fNqXNLIkqGRuJOjSQLyIsrnHH8nCBTvKlDo2cy3V9PUxWaTALEU9uy1YM_cQFLf6B7zUWj4drcELsHZ")' }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background-light"></div>
        </div>

        <div className="relative z-10 pt-12">
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <div 
                className="size-24 rounded-full border-4 border-primary bg-cover bg-center shadow-lg" 
                style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCzJchXQQSxLxYeKkjt5vFATHe7yPOV4u5WcOtXePIsAm9Rpgdf3lR1wqtvzobb_zOIIa6_gM6KON2rfbkmFQ1QxoTiHZP_qZFW2ChXb5ttDrGKZJfClTMdMbntGw4fjR-VGBYGjidpHOfG_ISIXkp4DcNsqUpE569zzblDouiRQftZiOp2KYPXwL72gWLn6vlrF0KxEwUKoTuXr98cfkZDr2iTzTAFGx4_TQI-qkpeB__2tFQYgON6A8GkMSZaDE2uU_BVug7LQrLE")' }}
              ></div>
              <div className="absolute bottom-1 right-1 bg-green-500 size-5 rounded-full border-4 border-background-light"></div>
            </div>
            <h3 className="mt-4 text-2xl font-extrabold text-slate-900">妈妈</h3>
            <p className="text-slate-500 font-medium">在线</p>
          </div>

          <div className="space-y-6">
            {MESSAGES.map((msg) => (
              <div key={msg.id} className="flex flex-col items-start gap-2">
                {msg.type === 'text' && (
                  <div className={`shadow-sm rounded-2xl rounded-tl-none px-5 py-4 max-w-[85%] border border-slate-100 ${
                    msg.text.includes('骄傲') ? 'bg-primary text-slate-900 font-bold' : 'bg-white text-slate-800'
                  }`}>
                    <p className="text-lg leading-relaxed">{msg.text}</p>
                  </div>
                )}
                {msg.type === 'sticker' && (
                  <div className="rounded-xl overflow-hidden border-4 border-white shadow-md max-w-[70%]">
                    <img alt="奖励贴纸" className="w-full h-auto" src={msg.content} />
                  </div>
                )}
                <span className="text-xs text-slate-400 font-medium ml-2">{msg.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3 sticky bottom-24 z-10">
        <button className="text-primary hover:text-primary/80 transition-colors">
          <span className="material-symbols-outlined text-3xl">add_circle</span>
        </button>
        <div className="flex-1 bg-slate-100 rounded-full px-4 py-2 flex items-center">
          <input className="bg-transparent border-none focus:ring-0 w-full text-slate-700" placeholder="输入回复内容..." type="text" />
          <span className="material-symbols-outlined text-slate-400">mood</span>
        </div>
        <button className="bg-primary text-slate-900 size-10 rounded-full flex items-center justify-center shadow-md">
          <span className="material-symbols-outlined">send</span>
        </button>
      </div>
    </motion.div>
  );
}
