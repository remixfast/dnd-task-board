export const taskStatusList: Task["status"][] = [
  "pending",
  "started",
  "completed",
  "holding",
];

export const taskWorkflow = {
  pending: ["started"],
  started: ["completed", "holding"],
  holding: ["started"],
  completed: [],
};

// task model
export interface Task {
  taskId: number;
  taskName: string;
  status: "pending" | "started" | "completed" | "holding";
}

// list of 20 in memory tasks
export const tasks: Task[] = Array.from({ length: 20 }, (_, i) => ({
  taskId: i + 1,
  taskName: `Task ${i + 1}`,
  status: "pending",
}));
