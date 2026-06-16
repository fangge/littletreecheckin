
import Icon from '../components/Icon';
interface CheckinCalendarProps {
  checkinDates: string[];
  sharedCompletedDates?: string[];
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
  onDateClick: (date: string) => void;
}

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

const formatDateStr = (year: number, month: number, day: number): string => {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

const getTodayStr = (): string => {
  const now = new Date();
  return formatDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());
};

export default function CheckinCalendar({
  checkinDates,
  sharedCompletedDates = [],
  selectedMonth,
  onMonthChange,
  onDateClick,
}: CheckinCalendarProps) {
  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth() + 1; // 1-12
  const todayStr = getTodayStr();

  const checkinSet = new Set(checkinDates);
  const sharedCompletedSet = new Set(sharedCompletedDates);

  // 当月第一天是星期几（0=周日）
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  // 当月天数
  const daysInMonth = new Date(year, month, 0).getDate();

  // 生成日期格子：前置空格 + 当月日期
  const cells: Array<{ day: number | null; dateStr: string | null }> = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ day: null, dateStr: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: formatDateStr(year, month, d) });
  }

  const handlePrevMonth = () => {
    const prev = new Date(year, month - 2, 1);
    onMonthChange(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(year, month, 1);
    onMonthChange(next);
  };

  const handleDayClick = (dateStr: string | null) => {
    if (!dateStr || !checkinSet.has(dateStr)) return;
    onDateClick(dateStr);
  };

  return (
    <div className="bg-white dark:bg-[var(--bg-surface)] rounded-2xl p-2.5 shadow-sm border border-slate-100 dark:border-[var(--border-color)] transition-colors">
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-slate-900 font-extrabold text-sm">我的成长足迹</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="flex size-6 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-[var(--bg-card)] transition-colors text-slate-500 dark:text-[var(--text-secondary)]"
            aria-label="上一月"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && handlePrevMonth()}
          >
            <Icon name="chevron_left" className="text-base" />
          </button>
          <span className="text-slate-500 dark:text-[var(--text-secondary)] text-xs font-medium min-w-[72px] text-center">
            {year}年{month}月
          </span>
          <button
            onClick={handleNextMonth}
            className="flex size-6 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-[var(--bg-card)] transition-colors text-slate-500 dark:text-[var(--text-secondary)]"
            aria-label="下一月"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && handleNextMonth()}
          >
            <Icon name="chevron_right" className="text-base" />
          </button>
        </div>
      </div>

      {/* 星期行 */}
      <div className="grid grid-cols-7 mb-0.5">
        {WEEK_DAYS.map(day => (
          <div key={day} className="text-center text-[11px] text-slate-400 dark:text-[var(--text-muted)] font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* 日期格子 */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell, idx) => {
          if (!cell.day || !cell.dateStr) {
            return <div key={`empty-${idx}`} />;
          }

          const isToday = cell.dateStr === todayStr;
          const isCheckin = checkinSet.has(cell.dateStr);
          const isSharedCompleted = sharedCompletedSet.has(cell.dateStr);
          const isClickable = isCheckin;

          return (
            <button
              key={cell.dateStr}
              onClick={() => handleDayClick(cell.dateStr)}
              disabled={!isClickable}
              tabIndex={isClickable ? 0 : -1}
              aria-label={isCheckin ? `${month}月${cell.day}日，已打卡，点击查看详情` : `${month}月${cell.day}日`}
              className={`flex flex-col items-center justify-center rounded-lg transition-colors ${
                isClickable ? 'cursor-pointer hover:bg-primary/10 active:bg-primary/20' : 'cursor-default'
              }`}
            >
              <span
                className={`text-[11px] font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday
                    ? 'bg-primary text-white'
                    : isCheckin
                    ? 'text-slate-800 dark:text-[var(--text-primary)]'
                    : 'text-slate-400 dark:text-[var(--text-muted)]'
                }`}
              >
                {cell.day}
              </span>
              {isSharedCompleted ? (
                <Icon name="eco" filled className="text-amber-400 text-[10px] leading-none mt-px" />
              ) : isCheckin ? (
                <Icon name="eco" filled className="text-primary text-[10px] leading-none mt-px" />
              ) : (
                <span className="h-[10px] mt-px" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
