"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Task, TaskPart } from "@/types/database";
import { CheckSquare, Loader2 } from "lucide-react";

interface DesignViewProps {
    userRole?: "Designer" | "Visual Manager" | "Social Media Manager" | "Account Manager" | "Admin";
    filter?: string;
    currentUserId?: string;
}

export default function DesignView({
    userRole = "Designer",
    filter = "my-tasks",
    currentUserId
}: DesignViewProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch tasks from Supabase
    useEffect(() => {
        const fetchTasks = async () => {
            setLoading(true);
            const supabase = createClient();

            let query = supabase
                .from("tasks")
                .select("*, task_parts(*)")
                .eq("department", "Designers");

            // Apply filters based on the active channel
            if (filter === "my-tasks" && currentUserId) {
                // query = query.eq("assigned_to", currentUserId); // COLUMN MISSING IN DB
                console.warn("DEBUG: 'my-tasks' filter requested but 'assigned_to' column is missing in DB.");
                query = query.neq("status", "Done");
            } else if (filter === "completed") {
                query = query.eq("status", "Done");
            }

            const { data: tasksWithParts, error: tasksError } = await query.order("created_at", { ascending: false });

            if (tasksError) {
                console.error("Error fetching tasks:", tasksError);
                setError("Failed to load tasks");
                setLoading(false);
                return;
            }

            setTasks(tasksWithParts || []);
            setLoading(false);
        };

        fetchTasks();
    }, [filter, currentUserId]);

    // Handle checkbox toggle based on user role
    const handleCheck = async (taskId: string, partId: string) => {
        const supabase = createClient();

        // Find the current task and part
        const task = tasks.find((t) => t.id === taskId);
        const part = task?.task_parts?.find((p) => p.id === partId);
        if (!part) return;

        let updateData: Partial<TaskPart>;

        if (userRole === "Designer") {
            // Designer can only toggle designer_checked
            updateData = {
                designer_checked: !part.designer_checked,
            };
        } else if (userRole === "Visual Manager" || userRole === "Admin") {
            // Visual Manager sets BOTH to true
            updateData = {
                designer_checked: true,
                manager_approved: true,
            };
        } else {
            return;
        }

        // Update in Supabase
        const { error } = await supabase
            .from("task_parts")
            .update(updateData)
            .eq("id", partId);

        if (error) {
            console.error("Error updating task part:", error);
            return;
        }

        // Update local state
        setTasks((prevTasks) =>
            prevTasks.map((t) => {
                if (t.id !== taskId) return t;
                return {
                    ...t,
                    task_parts: t.task_parts?.map((p) => {
                        if (p.id !== partId) return p;
                        return { ...p, ...updateData };
                    }),
                };
            })
        );
    };

    // Get checkbox styling based on state
    const getCheckboxStyle = (part: TaskPart) => {
        if (part.manager_approved) {
            return "bg-discord-green border-discord-green";
        } else if (part.designer_checked) {
            return "bg-discord-blurple border-discord-blurple";
        }
        return "bg-transparent border-discord-text-muted";
    };

    // Status badge colors
    const statusColors: Record<string, string> = {
        Todo: "bg-discord-text-muted/20 text-discord-text-muted",
        "In Progress": "bg-discord-blurple/20 text-discord-blurple",
        Done: "bg-discord-green/20 text-discord-green",
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-discord-blurple" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-6xl">
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
                    {error}
                </div>
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div className="max-w-6xl">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-discord-text mb-2">
                        Designer Task Board
                    </h1>
                    <p className="text-discord-text-muted">
                        No tasks found. Create some tasks to get started.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-discord-text mb-2">
                    Designer Task Board
                </h1>
                <p className="text-discord-text-muted">
                    Check off completed parts. Visual Managers can approve designer work.
                    <span className="ml-2 text-xs text-discord-blurple">Role: {userRole}</span>
                </p>
            </div>

            {/* Task Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {tasks.map((task) => (
                    <div
                        key={task.id}
                        className="bg-discord-sidebar rounded-lg overflow-hidden border-l-4 border-discord-blurple"
                    >
                        {/* Card Header */}
                        <div className="px-4 py-3 border-b border-black/20">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="font-semibold text-discord-text truncate flex-1">
                                    {task.title}
                                </h3>
                                <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${statusColors[task.status]}`}
                                >
                                    {task.status}
                                </span>
                            </div>
                        </div>

                        {/* Parts List */}
                        <div className="p-3 space-y-2">
                            {task.task_parts?.map((part) => (
                                <button
                                    key={part.id}
                                    onClick={() => handleCheck(task.id, part.id)}
                                    className="w-full flex items-center gap-3 p-2 rounded hover:bg-discord-item/50 transition-colors text-left group"
                                >
                                    {/* Custom Checkbox */}
                                    <div
                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${getCheckboxStyle(part)}`}
                                    >
                                        {(part.designer_checked || part.manager_approved) && (
                                            <CheckSquare size={14} className="text-white" strokeWidth={3} />
                                        )}
                                    </div>

                                    {/* Part Title */}
                                    <span
                                        className={`text-sm flex-1 transition-colors ${part.manager_approved
                                            ? "text-discord-text-muted line-through"
                                            : part.designer_checked
                                                ? "text-discord-text"
                                                : "text-discord-text-muted group-hover:text-discord-text"
                                            }`}
                                    >
                                        {part.title}
                                    </span>

                                    {/* Status Indicators */}
                                    <div className="flex gap-1.5 flex-shrink-0">
                                        {part.designer_checked && !part.manager_approved && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-discord-blurple/20 text-discord-blurple">
                                                Awaiting
                                            </span>
                                        )}
                                        {part.manager_approved && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-discord-green/20 text-discord-green">
                                                Approved
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Card Footer */}
                        <div className="px-4 py-2 bg-discord-dark/30 border-t border-black/10">
                            <div className="flex items-center justify-between text-xs text-discord-text-muted">
                                <span>
                                    {task.task_parts?.filter((p) => p.manager_approved).length || 0} /{" "}
                                    {task.task_parts?.length || 0} approved
                                </span>
                            </div>
                            <div className="mt-1.5 h-1 bg-discord-dark rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-discord-green transition-all duration-300"
                                    style={{
                                        width: `${task.task_parts?.length
                                            ? (task.task_parts.filter((p) => p.manager_approved).length /
                                                task.task_parts.length) *
                                            100
                                            : 0
                                            }%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
