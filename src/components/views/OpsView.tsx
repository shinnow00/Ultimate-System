"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Task } from "@/types/database";
import {
    Package,
    Truck,
    MapPin,
    DollarSign,
    Calendar,
    Search,
    Loader2,
    AlertCircle,
    CheckCircle2,
    MoreHorizontal,
    Edit3
} from "lucide-react";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function OpsView() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Update Logistics Dialog
    const [logisticsDialogOpen, setLogisticsDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [updating, setUpdating] = useState(false);

    // Edit fields
    const [editPrice, setEditPrice] = useState("");
    const [editLocation, setEditLocation] = useState("");
    const [editStatus, setEditStatus] = useState<"Todo" | "In Progress" | "Done" | "Shipped">("Todo");

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        setLoading(true);
        const supabase = createClient();

        try {
            const { data, error: fetchError } = await supabase
                .from("tasks")
                .select("*")
                .eq("department", "Operations")
                .order("created_at", { ascending: false });

            if (fetchError) throw fetchError;
            setTasks(data || []);
        } catch (err: any) {
            console.error("Error fetching Ops tasks:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const openUpdateDialog = (task: Task) => {
        setSelectedTask(task);
        setEditPrice(String(task.meta_data?.price || ""));
        setEditLocation(String(task.meta_data?.shipping_location || ""));
        setEditStatus((task.meta_data?.shipment_status as any) || task.status);
        setLogisticsDialogOpen(true);
    };

    const handleUpdateLogistics = async () => {
        if (!selectedTask) return;
        setUpdating(true);
        setError(null);

        const supabase = createClient();

        // Update both the status field and the meta_data for price/location
        const newMetaData = {
            ...(selectedTask.meta_data || {}),
            price: parseFloat(editPrice) || 0,
            shipping_location: editLocation,
            shipment_status: editStatus
        };

        try {
            const { error: updateError } = await supabase
                .from("tasks")
                .update({
                    status: editStatus === "Shipped" ? "Done" : editStatus as any,
                    meta_data: newMetaData,
                    updated_at: new Date().toISOString()
                })
                .eq("id", selectedTask.id);

            if (updateError) throw updateError;

            setLogisticsDialogOpen(false);
            fetchTasks();
        } catch (err: any) {
            console.error("Error updating logistics:", err);
            setError(err.message);
        } finally {
            setUpdating(false);
        }
    };

    const filteredTasks = tasks.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.meta_data?.client_name as string || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.meta_data?.company_name as string || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading && tasks.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center bg-discord-bg">
                <Loader2 className="animate-spin text-discord-blurple" size={40} />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-discord-bg overflow-hidden uppercase-none">
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-discord-sidebar/30 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Package className="text-yellow-500" size={28} />
                            <h1 className="text-2xl font-bold text-discord-text tracking-tight">Operations Control</h1>
                        </div>
                        <p className="text-discord-text-muted text-sm">Logistics Monitoring & Shipment Tracking</p>
                    </div>

                    <div className="relative group max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-text-muted group-focus-within:text-discord-blurple transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search shipments, clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-discord-dark border border-white/5 rounded-full pl-10 pr-4 py-2.5 text-sm text-discord-text focus:outline-none focus:ring-2 focus:ring-discord-blurple/50 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Tasks Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredTasks.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-discord-text-muted">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                <Search size={24} />
                            </div>
                            <p className="text-lg font-medium">No results found</p>
                            <p className="text-sm">Try adjusting your search query</p>
                        </div>
                    ) : (
                        filteredTasks.map((task) => (
                            <ShipmentCard
                                key={task.id}
                                task={task}
                                onUpdate={() => openUpdateDialog(task)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Logistics Dialog */}
            <Dialog open={logisticsDialogOpen} onOpenChange={setLogisticsDialogOpen}>
                <DialogContent className="bg-discord-sidebar border-white/10 text-discord-text max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl tracking-tight">
                            <Truck className="text-discord-blurple" size={22} />
                            Logistics Update
                        </DialogTitle>
                        <DialogDescription className="text-discord-text-muted">
                            Setting up fulfillment details for: <span className="text-discord-text font-bold underline decoration-discord-blurple">{selectedTask?.title}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Status Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-discord-text-muted uppercase tracking-widest">Shipment Status</label>
                            <div className="grid grid-cols-2 gap-2">
                                {["Todo", "In Progress", "Shipped"].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setEditStatus(status as any)}
                                        className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${editStatus === status
                                                ? "bg-discord-blurple border-discord-blurple text-white shadow-lg shadow-discord-blurple/20"
                                                : "bg-discord-dark border-white/10 text-discord-text-muted hover:border-discord-blurple/50"
                                            }`}
                                    >
                                        {status.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Price Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-discord-text-muted uppercase tracking-widest flex items-center gap-2">
                                <DollarSign size={14} /> Price
                            </label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-text-muted" size={16} />
                                <input
                                    type="number"
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-discord-dark border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-discord-blurple/50 transition-all font-mono"
                                />
                            </div>
                        </div>

                        {/* Shipping Location Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-discord-text-muted uppercase tracking-widest flex items-center gap-2">
                                <MapPin size={14} /> Shipping Location
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-text-muted" size={16} />
                                <input
                                    type="text"
                                    value={editLocation}
                                    onChange={(e) => setEditLocation(e.target.value)}
                                    placeholder="Enter physical address..."
                                    className="w-full bg-discord-dark border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-discord-blurple/50 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setLogisticsDialogOpen(false)}
                            className="bg-transparent border-white/10 text-discord-text hover:bg-white/5"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateLogistics}
                            disabled={updating}
                            className="bg-discord-blurple hover:bg-discord-blurple/80 text-white font-bold px-6"
                        >
                            {updating ? <Loader2 className="animate-spin" size={18} /> : "Record Logistics"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ShipmentCard({ task, onUpdate }: { task: Task; onUpdate: () => void }) {
    const clientName = (task.meta_data?.client_name as string) || "Individual Client";
    const companyName = (task.meta_data?.company_name as string) || "N/A";
    const price = (task.meta_data?.price as number) || 0;
    const location = (task.meta_data?.shipping_location as string) || "TBD";
    const shipmentStatus = (task.meta_data?.shipment_status as string) || task.status;

    return (
        <div className="bg-discord-sidebar group hover:bg-discord-sidebar/80 rounded-xl border border-white/5 hover:border-discord-blurple/30 transition-all duration-300 overflow-hidden flex flex-col shadow-lg hover:shadow-discord-blurple/5">
            {/* Status Indicator Bar */}
            <div className={`h-1.5 w-full ${shipmentStatus === "Shipped" || shipmentStatus === "Done" ? "bg-green-500" :
                    shipmentStatus === "In Progress" ? "bg-discord-blurple" : "bg-discord-text-muted/30"
                }`} />

            <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-discord-dark rounded-lg border border-white/5">
                        <Package className="text-discord-text-muted group-hover:text-yellow-500 transition-colors" size={20} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${shipmentStatus === "Shipped" || shipmentStatus === "Done" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                            shipmentStatus === "In Progress" ? "bg-discord-blurple/10 text-discord-blurple border border-discord-blurple/20" :
                                "bg-white/5 text-discord-text-muted border border-white/10"
                        }`}>
                        {shipmentStatus}
                    </span>
                </div>

                <div className="mb-4">
                    <h3 className="text-lg font-bold text-discord-text leading-tight mb-1 group-hover:text-discord-blurple transition-colors line-clamp-2">
                        {task.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-discord-text-muted font-bold">
                        <Users size={12} className="text-discord-blurple" />
                        {clientName} {companyName !== "N/A" && <span className="opacity-50">• {companyName}</span>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-discord-dark/50 p-2.5 rounded-lg border border-white/5">
                        <div className="text-[9px] font-black text-discord-text-muted uppercase tracking-tighter mb-1 select-none">Est. Value</div>
                        <div className="text-sm font-bold text-green-400 font-mono">
                            ${price.toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-discord-dark/50 p-2.5 rounded-lg border border-white/5 overflow-hidden">
                        <div className="text-[9px] font-black text-discord-text-muted uppercase tracking-tighter mb-1 select-none flex items-center gap-1">
                            <MapPin size={9} /> Location
                        </div>
                        <div className="text-sm font-bold text-discord-text truncate" title={location}>
                            {location}
                        </div>
                    </div>
                </div>

                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex flex-col">
                        <div className="text-[9px] font-black text-discord-text-muted uppercase tracking-widest mb-1">Target Date</div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-discord-text">
                            <Calendar size={12} className="text-discord-text-muted" />
                            {task.deadline ? format(new Date(task.deadline), "MMM dd") : "No Date"}
                        </div>
                    </div>

                    <button
                        onClick={onUpdate}
                        className="p-2.5 bg-discord-blurple/10 hover:bg-discord-blurple text-discord-blurple hover:text-white rounded-lg transition-all duration-200"
                        title="Update Logistics"
                    >
                        <Edit3 size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// Support Icons (needed if not already imported in page.tsx)
import { Users } from "lucide-react";
