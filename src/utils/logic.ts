import { DerivedTask, Task } from '@/types';


export function computeROI(revenue: number, timeTaken: number): number {
  if (!Number.isFinite(revenue) || !Number.isFinite(timeTaken)) return 0;
  if (timeTaken <= 0) return 0;
  return Number((revenue / timeTaken).toFixed(2));
}


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


export function withDerived(task: Task): DerivedTask {
  return {
    ...task,
    roi: computeROI(task.revenue, task.timeTaken),
    priorityWeight: computePriorityWeight(task.priority),
  };
}


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
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

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

  const baseTodo = todo + inProgress + done;
  const conversionTodoToInProgress = baseTodo ? (inProgress + done) / baseTodo : 0;
  const conversionInProgressToDone = inProgress ? done / inProgress : 0;

  return {
    todo,
    inProgress,
    done,
    conversionTodoToInProgress,
    conversionInProgressToDone,
  };
}
