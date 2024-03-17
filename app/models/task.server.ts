import { Task, tasks } from "./task";
// get list of task
export async function getTasks(): Promise<Task[]> {
  return tasks;
}

// get task by id
export async function getTask(taskId: number): Promise<Task | undefined> {
  return tasks.find((task) => task.taskId === taskId);
}

// update task status
export async function updateTaskStatus(
  taskId: number,
  status: Task["status"]
): Promise<Task | undefined> {
  const task = tasks.find((task) => task.taskId === taskId);
  if (!task) {
    return;
  }
  task.status = status;
  return task;
}
