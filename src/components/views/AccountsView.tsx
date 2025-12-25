"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Task } from "@/types/database";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MoreVertical, CheckCircle, Clock, XCircle, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

// Status configuration
const statusConfig: Record<string, { color: string; icon: typeof CheckCircle }> = {
    "Closed Won": { color: "text-discord-green", icon: CheckCircle },
    "Closed Lost": { color: "text-red-400", icon: XCircle },
    "In Progress": { color: "text-discord-blurple", icon: Clock },
    "Proposal Sent": { color: "text-yellow-400", icon: AlertCircle },
    "Negotiation": { color: "text-orange-400", icon: Clock },
    "New Lead": { color: "text-discord-text-muted", icon: AlertCircle },
    Todo: { color: "text-discord-text-muted", icon: AlertCircle },
    Done: { color: "text-discord-green", icon: CheckCircle },
};

export default function AccountsView() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Convert to Ops dialog state
    const [convertDialogOpen, setConvertDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [price, setPrice] = useState("");
    const [shippingLocation, setShippingLocation] = useState("");
    const [converting, setConverting] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        const supabase = createClient();

        const { data, error: fetchError } = await supabase
            .from("tasks")
            .select("*")
            .eq("department", "Account Managers")
            .order("created_at", { ascending: false });

        if (fetchError) {
            console.error("Error fetching accounts:", fetchError);
            setError("Failed to load accounts");
            setLoading(false);
            return;
        }

        setTasks(data || []);
        setLoading(false);
    };

    const openConvertDialog = (task: Task) => {
        setSelectedTask(task);
        setPrice("");
        setShippingLocation("");
        setConvertDialogOpen(true);
    };

    const handleConvertToOps = async () => {
        if (!selectedTask) return;

        setConverting(true);

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setError("You must be logged in");
                setConverting(false);
                return;
            }

            // Create new Operations task
            const { error: insertError } = await supabase.from("tasks").insert({
                title: `Ops: ${selectedTask.title}`,
                department: "Account Managers", // Could be "Operations" if you have that department
                status: "Todo",
                created_by: user.id,
                meta_data: {
                    source_task_id: selectedTask.id,
                    price: parseFloat(price) || 0,
                    shipping_location: shippingLocation,
                    converted_from: "Account Managers",
                },
            });

            if (insertError) {
                console.error("Error creating ops task:", insertError);
                setError("Failed to create operations task");
                setConverting(false);
                return;
            }

            // Update original task status
            await supabase
                .from("tasks")
                .update({ status: "Done" })
                .eq("id", selectedTask.id);

            // Refresh and close
            setConvertDialogOpen(false);
            fetchTasks();
        } catch (err) {
            console.error("Unexpected error:", err);
            setError("An unexpected error occurred");
        } finally {
            setConverting(false);
        }
    };

    // Calculate stats
    const totalValue = tasks.reduce((sum, t) => {
        const meta = t.meta_data as Record<string, number> | null;
        return sum + (meta?.price || 0);
    }, 0);

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

    return (
        <div className="max-w-6xl">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-discord-text mb-2">Account Management</h1>
                <p className="text-discord-text-muted">Track client relationships and convert deals to operations.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-discord-sidebar rounded-lg p-4">
                    <p className="text-discord-text-muted text-sm mb-1">Total Accounts</p>
                    <p className="text-2xl font-bold text-discord-text">{tasks.length}</p>
                </div>
                <div className="bg-discord-sidebar rounded-lg p-4">
                    <p className="text-discord-text-muted text-sm mb-1">Pipeline Value</p>
                    <p className="text-2xl font-bold text-discord-blurple">${totalValue.toLocaleString()}</p>
                </div>
                <div className="bg-discord-sidebar rounded-lg p-4">
                    <p className="text-discord-text-muted text-sm mb-1">Active Deals</p>
                    <p className="text-2xl font-bold text-discord-green">
                        {tasks.filter((t) => t.status !== "Done").length}
                    </p>
                </div>
            </div>

            {/* Table View */}
            {tasks.length === 0 ? (
                <div className="bg-discord-sidebar rounded-lg p-8 text-center">
                    <p className="text-discord-text-muted">No accounts found. Create some to get started.</p>
                </div>
            ) : (
                <div className="bg-discord-sidebar rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-black/20">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-discord-text-muted uppercase tracking-wide">
                                        Client / Company
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-discord-text-muted uppercase tracking-wide">
                                        Contact
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-discord-text-muted uppercase tracking-wide">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-discord-text-muted uppercase tracking-wide">
                                        Value
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-discord-text-muted uppercase tracking-wide">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map((task, index) => {
                                    const meta = (task.meta_data as Record<string, string | number>) || {};
                                    const dealStatus = task.status;
                                    const priceValue = meta.price || 0;
                                    const phone = meta.phone || "";
                                    const email = meta.email || "";

                                    const statusData = statusConfig[dealStatus] || statusConfig.Todo;
                                    const StatusIcon = statusData.icon;

                                    return (
                                        <tr
                                            key={task.id}
                                            className={`border-b border-black/10 hover:bg-discord-item/30 transition-colors ${index === tasks.length - 1 ? "border-b-0" : ""
                                                }`}
                                        >
                                            {/* Client Name */}
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-discord-text">{task.title}</p>
                                                    <p className="text-xs text-discord-text-muted">
                                                        {task.deadline
                                                            ? `Due: ${new Date(task.deadline).toLocaleDateString()}`
                                                            : "No deadline"}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* Contact */}
                                            <td className="px-4 py-3">
                                                <div className="space-y-1">
                                                    {phone && (
                                                        <div className="flex items-center gap-2 text-sm text-discord-text-muted">
                                                            <Phone size={14} />
                                                            <span>{phone}</span>
                                                        </div>
                                                    )}
                                                    {email && (
                                                        <div className="flex items-center gap-2 text-sm text-discord-text-muted">
                                                            <Mail size={14} />
                                                            <span>{email}</span>
                                                        </div>
                                                    )}
                                                    {!phone && !email && (
                                                        <span className="text-sm text-discord-text-muted">—</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <div className={`flex items-center gap-2 ${statusData.color}`}>
                                                    <StatusIcon size={16} />
                                                    <span className="text-sm font-medium">{dealStatus}</span>
                                                </div>
                                            </td>

                                            {/* Value */}
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-sm font-medium text-discord-text">
                                                    {typeof priceValue === "number" && priceValue > 0
                                                        ? `$${priceValue.toLocaleString()}`
                                                        : "—"}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    {task.status !== "Done" && (
                                                        <button
                                                            onClick={() => openConvertDialog(task)}
                                                            className="flex items-center gap-1 px-2 py-1 text-xs bg-discord-blurple/20 text-discord-blurple rounded hover:bg-discord-blurple/30 transition-colors"
                                                        >
                                                            <ArrowRight size={12} />
                                                            <span>Convert to Ops</span>
                                                        </button>
                                                    )}
                                                    <button className="p-1.5 rounded hover:bg-discord-item transition-colors text-discord-text-muted hover:text-discord-text">
                                                        <MoreVertical size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Convert to Ops Dialog */}
            <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
                <DialogContent className="bg-discord-sidebar border-discord-dark max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-discord-text">Convert to Operations</DialogTitle>
                        <DialogDescription className="text-discord-text-muted">
                            Create an operations task for: {selectedTask?.title}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2">
                                Price
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full px-3 py-2 bg-discord-dark border-none rounded text-discord-text placeholder-discord-text-muted focus:outline-none focus:ring-2 focus:ring-discord-blurple"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2">
                                Shipping Location
                            </label>
                            <input
                                type="text"
                                value={shippingLocation}
                                onChange={(e) => setShippingLocation(e.target.value)}
                                className="w-full px-3 py-2 bg-discord-dark border-none rounded text-discord-text placeholder-discord-text-muted focus:outline-none focus:ring-2 focus:ring-discord-blurple"
                                placeholder="Enter shipping address"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConvertDialogOpen(false)}
                            className="bg-discord-item border-none text-discord-text hover:bg-discord-item/70"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConvertToOps}
                            disabled={converting}
                            className="bg-discord-blurple hover:bg-discord-blurple/80"
                        >
                            {converting ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="animate-spin" size={16} />
                                    Converting...
                                </span>
                            ) : (
                                "Create Ops Task"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
