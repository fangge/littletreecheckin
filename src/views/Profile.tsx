import React from 'react';
import { motion } from 'motion/react';

interface ProfileProps {
  onBack: () => void;
  onLogout: () => void;
  onViewParentControl: () => void;
}

export default function Profile({ onBack, onLogout, onViewParentControl }: ProfileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-1 flex flex-col bg-background-light min-h-screen overflow-x-hidden pb-32"
    >
      <div className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-10 border-b border-primary/10">
        <button 
          onClick={onBack}
          className="text-slate-900 flex size-12 shrink-0 items-center justify-center cursor-pointer"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">个人管理中心</h2>
      </div>

      <div className="flex p-6">
        <div className="flex w-full flex-col gap-4">
          <div className="flex gap-4 items-center">
            <div 
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-20 w-20 border-4 border-primary/20" 
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC-uxM59-RE7-ZxdCuU4Rfh9u3tX0H6Chgd5X8rEtdGjtCAeuTxh0MJ2L1N4OgkCbUxbmfVzAUVFQuszviLt8vDMRZJz2xb89mxVdl9EUJD-8laxvo4a5kTOw6JDa_LJyTBZcDX0ceiAjVCtOdJVkNlkfgIwSyOXlqO7Tw1cklp0cbS6ja2vDZRidM34Q5tMeh57SOyp1jyAf1bxQ20ZVuz4ByMUVzm7EylmjjfM5Jal5Ra4GpL8QiCbk9dnYRCyotUIFCMhoBFM4uJ")' }}
            ></div>
            <div className="flex flex-col justify-center">
              <p className="text-slate-900 text-[20px] font-bold leading-tight">亲爱的家长</p>
              <p className="text-primary font-medium text-sm">管理您的家庭与账户信息</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 flex-grow">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-primary/5">
          <h3 className="text-slate-900 text-base font-bold leading-tight mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">shield_person</span>
            家长审核
          </h3>
          <button 
            onClick={onViewParentControl}
            className="w-full flex items-center justify-between py-2 hover:bg-slate-50 transition-colors"
          >
            <p className="text-slate-600 text-sm">进入待审核任务</p>
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </button>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-primary/5">
          <h3 className="text-slate-900 text-base font-bold leading-tight mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">settings</span>
            账户设置
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-background-light">
              <p className="text-slate-600 text-sm">用户名</p>
              <div className="flex items-center gap-2">
                <p className="text-slate-900 text-sm font-medium">林小明的爸爸</p>
                <span className="material-symbols-outlined text-slate-400 text-sm">edit</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <p className="text-slate-600 text-sm">修改密码</p>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-primary/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-900 text-base font-bold leading-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">child_care</span>
              孩子信息
            </h3>
            <button className="text-primary text-sm font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">add_circle</span>
              添加
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-background-light rounded-lg">
              <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">face</span>
              </div>
              <div className="flex-1">
                <p className="text-slate-900 text-sm font-bold">林小明</p>
                <p className="text-slate-500 text-xs">8岁 • 小学二年级</p>
              </div>
              <div className="flex gap-2">
                <button className="p-1 text-slate-400 hover:text-primary"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                <button className="p-1 text-slate-400 hover:text-red-500"><span className="material-symbols-outlined text-[20px]">delete</span></button>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-background-light rounded-lg">
              <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">face_3</span>
              </div>
              <div className="flex-1">
                <p className="text-slate-900 text-sm font-bold">林小芳</p>
                <p className="text-slate-500 text-xs">5岁 • 幼儿园大班</p>
              </div>
              <div className="flex gap-2">
                <button className="p-1 text-slate-400 hover:text-primary"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                <button className="p-1 text-slate-400 hover:text-red-500"><span className="material-symbols-outlined text-[20px]">delete</span></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <button className="w-full bg-primary text-slate-900 font-bold py-4 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform">
          保存更改
        </button>
        <button 
          onClick={onLogout}
          className="w-full mt-4 text-slate-400 text-sm font-medium py-2"
        >
          退出登录
        </button>
      </div>
    </motion.div>
  );
}
