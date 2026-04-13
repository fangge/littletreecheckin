import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { messagesApi, MessageData } from '../services/api';
import PullToRefresh from '../components/PullToRefresh';

export default function Messages() {
  const navigate = useNavigate();
  const { currentChild, user } = useAuth();
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!currentChild) return;
    try {
      const res = await messagesApi.list(currentChild.id);
      setMessages(res.data);
      // 标记所有消息为已读
      await messagesApi.markAllRead(currentChild.id);
    } catch (err) {
      console.error('获取消息失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [currentChild]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !currentChild || isSending) return;

    setIsSending(true);
    const text = inputText.trim();
    setInputText('');

    try {
      const res = await messagesApi.send(currentChild.id, text);
      setMessages(prev => [...prev, res.data]);
    } catch (err) {
      console.error('发送失败:', err);
      setInputText(text); // 恢复输入
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // 下拉刷新处理函数
  const handleRefresh = useCallback(async () => {
    await fetchMessages();
  }, [currentChild]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col h-screen bg-background-light"
      >
      <header className="flex items-center bg-background-light/80 dark:bg-[var(--bg-primary)]/80 backdrop-blur-md p-4 shrink-0 z-10 justify-between border-b border-primary/10 dark:border-[var(--border-color)] transition-colors">
        <div className="text-slate-900 dark:text-[var(--text-primary)] flex size-12 shrink-0 items-center justify-start">
          <span
            onClick={() => navigate('/tasks')}
            className="material-symbols-outlined cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && navigate('/tasks')}
            aria-label="返回"
          >
            arrow_back_ios
          </span>
        </div>
        <h2 className="text-slate-900 dark:text-[var(--text-primary)] text-lg font-bold leading-tight flex-1 text-center">消息中心</h2>
        <div className="flex w-12 items-center justify-end">
          <button
            className="flex items-center justify-center rounded-full h-10 w-10 bg-primary/20 dark:bg-[var(--bg-card)] text-slate-900 dark:text-[var(--text-primary)]"
            aria-label="设置"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto relative px-6 min-h-0">
        <div className="absolute inset-x-0 top-0 h-96 opacity-40 z-0 pointer-events-none">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBnhspIJcu3dIyHe63mXvTZe8L2LxISb7jBfphjnWDvt5gO5lRPy-wKk6RNDFHXr9cYT6NnmKgBCINnAqqh-SrNNVe508PDzWRq6J3yZ1nc3rCLHueSGn3-oRvdGwuyDEUliP5vEPuYq7UWOiWBjklqa7gB68FVgZ-cmjT4Od0l5C0rTY5Ow6D8X2rTijt-1fNqXNLIkqGRuJOjSQLyIsrnHH8nCBTvKlDo2cy3V9PUxWaTALEU9uy1YM_cQFLf6B7zUWj4drcELsHZ")' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background-light" />
        </div>

        <div className="relative z-10 pt-12 pb-24">
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <div className="size-24 rounded-full border-4 border-primary bg-primary/10 flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-primary text-5xl">person</span>
              </div>
              <div className="absolute bottom-1 right-1 bg-green-500 size-5 rounded-full border-4 border-background-light" />
            </div>
            <h3 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-[var(--text-primary)]">{user?.username || '家长'}</h3>
            <p className="text-slate-500 dark:text-[var(--text-muted)] font-medium">{currentChild?.name ? `与${currentChild.name}的对话` : '消息'}</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="material-symbols-outlined text-primary text-4xl animate-pulse">mail</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-[var(--text-muted)]">
              <span className="material-symbols-outlined text-5xl mb-3 block">chat_bubble_outline</span>
              <p>还没有消息，发送第一条鼓励吧！</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="flex flex-col items-start gap-2">
                  {msg.type === 'text' && msg.text && (
                    <div className={`shadow-sm rounded-2xl rounded-tl-none px-5 py-4 max-w-[85%] border border-slate-100 dark:border-[var(--border-color)] ${
                      msg.sender_type === 'system'
                        ? 'bg-primary/10 text-primary border-primary/20 text-sm'
                        : 'bg-white dark:bg-[var(--bg-surface)] text-slate-800 dark:text-[var(--text-primary)]'
                    }`}>
                      <p className="text-lg leading-relaxed">{msg.text}</p>
                    </div>
                  )}
                  {msg.type === 'sticker' && msg.content && (
                    <div className="rounded-xl overflow-hidden border-4 border-white shadow-md max-w-[70%]">
                      <img alt="奖励贴纸" className="w-full h-auto" src={msg.content} />
                    </div>
                  )}
                  <span className="text-xs text-slate-400 dark:text-[var(--text-muted)] font-medium ml-2">{formatTime(msg.created_at)}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-[var(--bg-surface)] border-t border-slate-100 dark:border-[var(--border-color)] flex items-center gap-3 shrink-0 transition-colors">
        <button
          className="text-primary hover:text-primary/80 transition-colors"
          aria-label="添加附件"
        >
          <span className="material-symbols-outlined text-3xl">add_circle</span>
        </button>
        <div className="flex-1 bg-slate-100 dark:bg-[var(--bg-card)] rounded-full px-4 py-2 flex items-center">
          <input
            className="bg-transparent border-none focus:ring-0 w-full text-slate-700 dark:text-[var(--text-primary)]"
            placeholder="输入鼓励的话..."
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="消息输入框"
          />
          <span className="material-symbols-outlined text-slate-400 dark:text-[var(--text-muted)]">mood</span>
        </div>
        <button
          className="bg-primary text-slate-900 size-10 rounded-full flex items-center justify-center shadow-md disabled:opacity-50"
          onClick={handleSend}
          disabled={!inputText.trim() || isSending}
          aria-label="发送消息"
        >
          <span className="material-symbols-outlined">send</span>
        </button>
      </div>
      </motion.div>
    </PullToRefresh>
  );
}
