import { DerivedTask, Task } from '@/types';

/* =========================
   BUG 5 FIX – SAFE ROI
   ========================= */
export function computeROI(revenue: number, timeTaken: number): number {
  if (!Number.isFinite(revenue) || !Number.isFinite(timeTaken)) return 0;
  if (timeTaken <= 0) return 0;
  return Number((revenue / timeTaken).toFixed(2));
}

/* =========================
   Priority weight
   ========================= */
export function computePriorityWeight(priority: Task['priority']): 3 | 2 | 1 {
  switch (priority) {
    case 'High':
      return 3;
    case 'Medium':
      return 2;
    default:
      return 1;
  }
}

/* =========================
   Derived task
   ========================= */
export function withDerived(task: Task): DerivedTask {
  return {
    ...task,
    roi: computeROI(task.revenue, task.timeTaken),
    priorityWeight: computePriorityWeight(task.priority),
  };
}

/* =========================
   BUG 3 FIX – STABLE SORT
   ========================= */
export function sortTasks(tasks: ReadonlyArray<DerivedTask>): DerivedTask[] {
  return [...tasks].sort((a, b) => {
    const aROI = a.roi ?? -Infinity;
    const bROI = b.roi ?? -Infinity;

    if (bROI !== aROI) return bROI - aROI;
    if (b.priorityWeight !== a.priorityWeight) {
      return b.priorityWeight - a.priorityWeight;
    }
    return a.title.localeCompare(b.title);
  });
}

/* =========================
   Metrics
   ========================= */
export function computeTotalRevenue(tasks: ReadonlyArray<Task>): number {
  return tasks.filter(t => t.status === 'Done').reduce((s, t) => s + t.revenue, 0);
}

export function computeTotalTimeTaken(tasks: ReadonlyArray<Task>): number {
  return tasks.reduce((s, t) => s + t.timeTaken, 0);
}

export function computeTimeEfficiency(tasks: ReadonlyArray<Task>): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter(t => t.status === 'Done').length;
  return (done / tasks.length) * 100;
}

export function computeRevenuePerHour(tasks: ReadonlyArray<Task>): number {
  const revenue = computeTotalRevenue(tasks);
  const time = computeTotalTimeTaken(tasks);
  return time > 0 ? revenue / time : 0;
}

export function computeAverageROI(tasks: ReadonlyArray<Task>): number {
  const rois = tasks.map(t => computeROI(t.revenue, t.timeTaken));
  if (rois.length === 0) return 0;
  return rois.reduce((s, r) => s + r, 0) / rois.length;
}

export function computePerformanceGrade(
  avgROI: number
): 'Excellent' | 'Good' | 'Needs Improvement' {
  if (avgROI > 500) return 'Excellent';
  if (avgROI >= 200) return 'Good';
  return 'Needs Improvement';
}

/* =========================
   Analytics helpers
   ========================= */
export function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(aISO).getTime();
  const b = new Date(bISO).getTime();
  return Math.max(0, Math.round((b - a) / (24 * 3600 * 1000)));
}

export function computeVelocityByPriority(tasks: ReadonlyArray<Task>) {
  const groups: Record<Task['priority'], number[]> = { High: [], Medium: [], Low: [] };

  tasks.forEach(t => {
    if (t.completedAt) {
      groups[t.priority].push(daysBetween(t.createdAt, t.completedAt));
    }
  });

  return Object.fromEntries(
    (Object.keys(groups) as Task['priority'][]).map(p => {
      const arr = groups[p].sort((a, b) => a - b);
      const avg = arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
      const median = arr.length ? arr[Math.floor(arr.length / 2)] : 0;
      return [p, { avgDays: avg, medianDays: median }];
    })
  );
}

export function computeThroughputByWeek(tasks: ReadonlyArray<Task>) {
  const map = new Map<string, number>();

  tasks.forEach(t => {
    if (!t.completedAt) return;
    const d = new Date(t.completedAt);
    const key = `${d.getUTCFullYear()}-W${getWeekNumber(d)}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  });

  return Array.from(map.entries()).map(([week, count]) => ({ week, count }));
}

export function computeWeightedPipeline(tasks: ReadonlyArray<Task>): number {
  const weights = { Todo: 0.1, 'In Progress': 0.5, Done: 1 } as const;
  return tasks.reduce((s, t) => s + t.revenue * weights[t.status], 0);
}

export function computeForecast(
  weekly: Array<{ week: string; count: number }>,
  horizonWeeks = 4
) {
  const result: Array<{ week: string; count: number }> = [];
  if (weekly.length === 0) return result;

  const avg =
    weekly.reduce((s, w) => s + w.count, 0) / weekly.length;

  for (let i = 1; i <= horizonWeeks; i++) {
    result.push({ week: `+${i}`, count: Math.round(avg) });
  }
  return result;
}

export function computeCohortRevenue(tasks: ReadonlyArray<Task>) {
  const map = new Map<string, number>();

  tasks.forEach(t => {
    const d = new Date(t.createdAt);
    const key = `${d.getUTCFullYear()}-W${getWeekNumber(d)}|${t.priority}`;
    map.set(key, (map.get(key) ?? 0) + t.revenue);
  });

  return Array.from(map.entries()).map(([key, revenue]) => {
    const [week, priority] = key.split('|');
    return { week, priority: priority as Task['priority'], revenue };
  });
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
