"use client";

import { useState } from "react";
import { CheckSquare } from "lucide-react";

// Task Data Interface
export interface TaskPart {
    id: string;
    title: string;
    designer_checked: boolean;
    manager_approved: boolean;
}

export interface Task {
    id: string;
    title: string;
    task_parts: TaskPart[];
    status: "Todo" | "In Progress" | "Done";
}

// User Role - Change this to test different behaviors
export const USER_ROLE: "Designer" | "Visual Manager" = "Visual Manager";

interface TaskCardProps {
    task: Task;
    onTaskUpdate?: (updatedTask: Task) => void;
}

export default function TaskCard({ task, onTaskUpdate }: TaskCardProps) {
    const [taskData, setTaskData] = useState<Task>(task);

    // Handle checkbox toggle based on user role
    const handleCheck = (partId: string) => {
        setTaskData((prevTask) => {
            const updatedParts = prevTask.task_parts.map((part) => {
                if (part.id !== partId) return part;

                if (USER_ROLE === "Designer") {
                    // Designer can only toggle designer_checked
                    return {
                        ...part,
                        designer_checked: !part.designer_checked,
                    };
                } else if (USER_ROLE === "Visual Manager") {
                    // Visual Manager sets BOTH to true
                    return {
                        ...part,
                        designer_checked: true,
                        manager_approved: true,
                    };
                }
                return part;
            });

            const updatedTask = { ...prevTask, task_parts: updatedParts };
            onTaskUpdate?.(updatedTask);
            return updatedTask;
        });
    };

    // Get checkbox styling based on state
    const getCheckboxStyle = (part: TaskPart) => {
        if (part.manager_approved) {
            // Manager approved - Green
            return "bg-discord-green border-discord-green";
        } else if (part.designer_checked) {
            // Designer checked - Blue/Blurple
            return "bg-discord-blurple border-discord-blurple";
        }
        // Unchecked - Gray border
        return "bg-transparent border-discord-text-muted";
    };

    // Status badge colors
    const statusColors: Record<string, string> = {
        Todo: "bg-discord-text-muted/20 text-discord-text-muted",
        "In Progress": "bg-discord-blurple/20 text-discord-blurple",
        Done: "bg-discord-green/20 text-discord-green",
    };

    return (
        <div className="bg-discord-sidebar rounded-lg overflow-hidden border-l-4 border-discord-blurple">
            {/* Card Header - Like Discord Embed */}
            <div className="px-4 py-3 border-b border-black/20">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-discord-text truncate flex-1">
                        {taskData.title}
                    </h3>
                    <span
                        className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${statusColors[taskData.status]}`}
                    >
                        {taskData.status}
                    </span>
                </div>
            </div>

            {/* Parts List */}
            <div className="p-3 space-y-2">
                {taskData.task_parts.map((part) => (
                    <button
                        key={part.id}
                        onClick={() => handleCheck(part.id)}
                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-discord-item/50 transition-colors text-left group"
                    >
                        {/* Custom Checkbox */}
                        <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${getCheckboxStyle(part)}`}
                        >
                            {(part.designer_checked || part.manager_approved) && (
                                <CheckSquare
                                    size={14}
                                    className="text-white"
                                    strokeWidth={3}
                                />
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
                                    Awaiting Approval
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

            {/* Card Footer - Progress */}
            <div className="px-4 py-2 bg-discord-dark/30 border-t border-black/10">
                <div className="flex items-center justify-between text-xs text-discord-text-muted">
                    <span>
                        {taskData.task_parts.filter((p) => p.manager_approved).length} /{" "}
                        {taskData.task_parts.length} approved
                    </span>
                    <span className="text-discord-text-muted/70">
                        Role: {USER_ROLE}
                    </span>
                </div>
                {/* Progress Bar */}
                <div className="mt-1.5 h-1 bg-discord-dark rounded-full overflow-hidden">
                    <div
                        className="h-full bg-discord-green transition-all duration-300"
                        style={{
                            width: `${(taskData.task_parts.filter((p) => p.manager_approved).length / taskData.task_parts.length) * 100}%`,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
