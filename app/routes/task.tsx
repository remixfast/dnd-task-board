import { ActionFunctionArgs, json } from "@remix-run/node";
import { useFetcher, useFetchers, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import invariant from "tiny-invariant";
import { Task, taskStatusList, taskWorkflow } from "~/models/task";
import { getTask, getTasks, updateTaskStatus } from "~/models/task.server";

export async function loader() {
  const tasks: Task[] = await getTasks();
  return json({ tasks });
}

export async function action({ request }: ActionFunctionArgs) {
  // artificial delay
  // await new Promise((resolve) => setTimeout(resolve, 1000));
  const formData = await request.formData();
  const method = formData.get("method");
  if (method === "put") {
    const taskId = +(formData.get("taskId")?.toString() || 0);
    const status = formData.get("status")?.toString();
    if (!taskId || !status) {
      return json({
        success: false,
        error: "Missing data",
      });
    }
    if (!taskStatusList.includes(status as Task["status"])) {
      return json({
        success: false,
        error: "Invalid status",
      });
    }
    //
    const existingTask = await getTask(taskId);
    if (!existingTask) {
      return json({
        success: false,
        error: "Task not found",
      });
    }
    // check for rules to validate task transition
    const currentStatus = existingTask.status;
    const validTransition = (
      taskWorkflow[currentStatus] as Task["status"][]
    ).includes(status as Task["status"]);
    if (!validTransition) {
      return json({
        success: false,
        error: `Invalid transition, can not move task from ${currentStatus} to ${status}`,
      });
    }

    // update task
    await updateTaskStatus(taskId, status as Task["status"]);
    return json({ success: true });
  }
}
export default function TaskListRoute() {
  const { tasks } = useLoaderData<typeof loader>();
  const fetchers = useFetchers();
  const pendingTasks = usePendingTasks();
  // create a board, board is made up of columns, each column = task status, each column has list of task filtered on task status for that column
  // console.log(`actionData:`, JSON.stringify(actionData));
  const error = fetchers.filter((fetcher) => fetcher.data?.error)?.[0]?.data
    ?.error;
  for (const pendingTask of pendingTasks) {
    const task = tasks.find((task) => task.taskId === pendingTask.taskId);
    if (task) {
      task.status = pendingTask.status;
      (task as Task & { pending?: boolean }).pending = true;
    }
  }
  return (
    <div>
      {error ? <div className="text-red-500 p-4 m-4">{error}</div> : null}

      <div className="flex flex-row flex-nowrap m-4 gap-4">
        {taskStatusList.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={tasks.filter((task) => task.status === status)}
          />
        ))}
      </div>
    </div>
  );
}

function Column({
  status,
  tasks,
}: {
  status: Task["status"]; // status from type Task
  tasks: Task[];
}) {
  const [acceptDrop, setAcceptDrop] = useState(false);
  const fetcher = useFetcher();
  const submit = fetcher.submit; // useSubmit();
  return (
    <div
      key={status}
      className={
        " flex-shrink-0 flex flex-col overflow-hidden max-h-full w-80 border-slate-400 rounded-xl shadow-sm shadow-slate-400 bg-slate-100 " +
        (acceptDrop ? `outline outline-2 outline-brand-red` : ``)
      }
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("task")) {
          event.preventDefault();
          setAcceptDrop(true);
        }
      }}
      onDragLeave={() => {
        setAcceptDrop(false);
      }}
      onDrop={(event) => {
        const task: Task = JSON.parse(event.dataTransfer.getData("task"));
        invariant(task.taskId, "missing taskId");
        invariant(task.status, "missing status");
        if (task.status === status) {
          setAcceptDrop(false);
          return;
        }
        const taskToMove: Task = {
          taskId: task.taskId,
          taskName: task.taskName,
          status,
        };

        submit(
          { ...taskToMove, method: "put" },
          {
            method: "put",
            navigate: false,
            // use the same fetcher instance for any mutations on this card so
            // that interruptions cancel the earlier request and revalidation
            fetcherKey: `card:${task.taskId}`,
          }
        );
        setAcceptDrop(false);
      }}
    >
      <div className="text-large font-semibold">{status}</div>
      <div className="h-full overflow-auto">
        {tasks
          //.filter((task) => task.status === status)
          .map((task) => (
            <div
              key={task.taskId}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("task", JSON.stringify(task));
              }}
              className={
                "m-4 rounded-md border p-4" +
                ((task as Task & { pending?: boolean })?.pending
                  ? `  border-dashed border-slate-300`
                  : ``)
              }
            >
              <div className="text-large font-semibold">{task.taskName}</div>
            </div>
          ))}
      </div>
    </div>
  );
}

function usePendingTasks() {
  type PendingItem = ReturnType<typeof useFetchers>[number] & {
    formData: FormData;
  };
  return useFetchers()
    .filter((fetcher): fetcher is PendingItem => {
      if (!fetcher.formData) return false;
      const intent = fetcher.formData.get("method");
      return intent === "put";
    })
    .map((fetcher) => {
      const taskId = Number(fetcher.formData.get("taskId"));
      const taskName = String(fetcher.formData.get("taskName"));
      const status = String(fetcher.formData.get("status")) as Task["status"];
      const item: Task = { taskId, taskName, status };
      return item;
    });
}
