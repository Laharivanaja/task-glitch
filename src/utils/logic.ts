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

    // deterministic tie-breaker
    return a.title.localeCompare(b.title);
  });
}

/* =========================
   Metrics
   ========================= */
export function computeTotalRevenue(tasks: ReadonlyArray<Task>): number {
  return tasks.filter(t => t.status === 'Done').reduce((sum, t) => sum + t.revenue, 0);
}

export function computeTotalTimeTaken(tasks: ReadonlyArray<Task>): number {
  return tasks.reduce((sum, t) => sum + t.timeTaken, 0);
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
  const rois = tasks
    .map(t => computeROI(t.revenue, t.timeTaken))
    .filter((v): v is number => Number.isFinite(v));

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
   Analytics (REQUIRED)
   ========================= */
export type FunnelCounts = {
  todo: number;
  inProgress: number;
  done: number;
  conversionTodoToInProgress: number;
  conversionInProgressToDone: number;
};

export function computeFunnel(tasks: ReadonlyArray<Task>): FunnelCounts {
  const todo = tasks.filter(t => t.status === 'Todo').length;
  const inProgress = tasks.filter(t => t.status === 'In Progress').length;
  const done = tasks.filter(t => t.status === 'Done').length;

  const base = todo + inProgress + done;
  return {
    todo,
    inProgress,
    done,
    conversionTodoToInProgress: base ? (inProgress + done) / base : 0,
    conversionInProgressToDone: inProgress ? done / inProgress : 0,
  };
}

/* =========================
   REQUIRED HELPERS
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
