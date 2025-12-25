"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Department } from "@/components/DiscordLayout";
import { Profile } from "@/types/database";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, X, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface CreateTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    activeDepartment: Department;
    onTaskCreated: () => void;
}

interface ChecklistPart {
    id: string;
    title: string;
}

export default function CreateTaskDialog({
    open,
    onOpenChange,
    activeDepartment,
    onTaskCreated,
}: CreateTaskDialogProps) {
    // Standard fields
    const [title, setTitle] = useState("");
    const [deadline, setDeadline] = useState<Date | undefined>();
    const [assignedTo, setAssignedTo] = useState("");
    const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);

    // Social Media fields
    const [platform, setPlatform] = useState("");
    const [contentType, setContentType] = useState("");
    const [tov, setTov] = useState("");
    const [referenceLink, setReferenceLink] = useState("");

    // Designers fields
    const [checklistParts, setChecklistParts] = useState<ChecklistPart[]>([]);
    const [newPartTitle, setNewPartTitle] = useState("");

    // Operations fields
    const [shippingLocation, setShippingLocation] = useState("");
    const [price, setPrice] = useState("");
    const [targetDepartment, setTargetDepartment] = useState<Department>(activeDepartment);
    const [clientName, setClientName] = useState("");
    const [companyName, setCompanyName] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Map internal department IDs to Database names
    const DEPT_MAP: Record<string, string> = {
        'Designers': 'Designers',
        'Social': 'Social Media',
        'Account Managers': 'Account Managers',
        'Operations': 'Operations',
        'Hr': 'Hr',
        'SuperAdmin': 'Admin'
    };

    // Fetch users for the "Assigned To" dropdown
    useEffect(() => {
        const fetchUsers = async () => {
            const supabase = createClient();
            const dbDept = DEPT_MAP[targetDepartment] || targetDepartment;

            console.log(`DEBUG: Target Department: ${targetDepartment}, DB Search String: ${dbDept}`);

            // Fetch all profiles to ensure we see what's available (helpful for debugging RLS/Mismatches)
            // Note: browser confirmed profiles.full_name is missing.
            const { data: allProfiles, error: fetchError } = await supabase
                .from("profiles")
                .select("*")
                .order("email", { ascending: true }); // Order by email since full_name is missing

            if (fetchError) {
                console.error("DEBUG: Error fetching users:", fetchError);
                return;
            }

            if (allProfiles) {
                console.log("DEBUG: All profiles fetched from DB:", allProfiles);

                // Filter users where department matches either the mapped name or the internal ID
                const filtered = allProfiles.filter(u =>
                    u.department === dbDept ||
                    u.department === targetDepartment
                );

                console.log(`DEBUG: Filtered users for ${dbDept}:`, filtered);
                setAvailableUsers(filtered);
            } else {
                setAvailableUsers([]);
            }
        };
        if (open) fetchUsers();
    }, [open, targetDepartment]);

    // Reset form when dialog closes
    useEffect(() => {
        if (!open) {
            setTitle("");
            setDeadline(undefined);
            setAssignedTo("");
            setPlatform("");
            setContentType("");
            setTov("");
            setReferenceLink("");
            setChecklistParts([]);
            setNewPartTitle("");
            setShippingLocation("");
            setPrice("");
            setTargetDepartment(activeDepartment);
            setClientName("");
            setCompanyName("");
            setError(null);
        }
    }, [open, activeDepartment]);

    // Add a checklist part
    const addChecklistPart = () => {
        if (!newPartTitle.trim()) return;
        setChecklistParts([
            ...checklistParts,
            { id: crypto.randomUUID(), title: newPartTitle.trim() },
        ]);
        setNewPartTitle("");
    };

    // Remove a checklist part
    const removeChecklistPart = (id: string) => {
        setChecklistParts(checklistParts.filter((p) => p.id !== id));
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError("Title is required");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError("You must be logged in");
                setLoading(false);
                return;
            }

            // Build meta_data based on department
            const metaData: Record<string, unknown> = {};

            if (activeDepartment === "Social") {
                if (platform) metaData.platform = platform;
                if (contentType) metaData.content_type = contentType;
                if (tov) metaData.tone_of_voice = tov;
                if (referenceLink) metaData.reference_link = referenceLink;
            } else if (activeDepartment === "Account Managers" || targetDepartment === "Operations") {
                if (shippingLocation) metaData.shipping_location = shippingLocation;
                if (price) metaData.price = parseFloat(price) || 0;
                if (clientName) metaData.client_name = clientName;
                if (companyName) metaData.company_name = companyName;
            } else if (targetDepartment === "Designers" && activeDepartment === "Operations") {
                // Ops creating for Designers - pass the logistics info too
                if (clientName) metaData.client_name = clientName;
                if (companyName) metaData.company_name = companyName;
            }

            // Map department names to database values
            const departmentMap: Record<Department, string> = {
                Designers: "Designers",
                Social: "Social",
                "Account Managers": "Account Managers",
                Hr: "Hr",
                Operations: "Operations",
                SuperAdmin: "SuperAdmin",
            };

            // Insert task - note: assigned_to is reportedly missing in DB
            const taskObj: any = {
                title: title.trim(),
                department: departmentMap[targetDepartment],
                status: "Todo",
                deadline: deadline?.toISOString() || null,
                created_by: user.id,
                meta_data: Object.keys(metaData).length > 0 ? metaData : null,
            };

            // If we have an assigned user, we'll try to add it. 
            // If the INSERT fails with "column assigned_to does not exist", we'll know for sure.
            if (assignedTo) {
                taskObj.assigned_to = assignedTo;
            }

            const { data: taskData, error: taskError } = await supabase
                .from("tasks")
                .insert(taskObj)
                .select()
                .single();

            if (taskError) {
                console.error("Error creating task:", taskError);
                setError(`Failed to create task: ${taskError.message}`);
                setLoading(false);
                return;
            }

            // If Target is Designers and there are checklist parts, insert them
            if (targetDepartment === "Designers" && checklistParts.length > 0) {
                const partsToInsert = checklistParts.map((part) => ({
                    task_id: taskData.id,
                    title: part.title,
                    designer_checked: false,
                    manager_approved: false,
                }));

                const { error: partsError } = await supabase
                    .from("task_parts")
                    .insert(partsToInsert);

                if (partsError) {
                    console.error("Error creating task parts:", partsError);
                }
            }

            // Success - close dialog and refresh
            onOpenChange(false);
            onTaskCreated();
        } catch (err) {
            console.error("Unexpected error:", err);
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    // Get department display name
    const getDepartmentLabel = () => {
        switch (activeDepartment) {
            case "Designers":
                return "Design Team";
            case "Social":
                return "Social Media";
            case "Account Managers":
                return "Account Management";
            case "Operations":
                return "Operations";
            default:
                return "Task";
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-discord-sidebar border-discord-dark max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-discord-text">
                        Create {getDepartmentLabel()} Task
                    </DialogTitle>
                    <DialogDescription className="text-discord-text-muted">
                        Fill in the details below to create a new task.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="p-3 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Standard Fields */}
                    <div>
                        <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2">
                            Title <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-discord-dark border-none rounded text-discord-text placeholder-discord-text-muted focus:outline-none focus:ring-2 focus:ring-discord-blurple"
                            placeholder="Enter task title"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2">
                            Deadline
                        </label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-left bg-discord-dark border-none text-discord-text hover:bg-discord-item"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-discord-text-muted" />
                                    {deadline ? format(deadline, "PPP") : "Pick a date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-discord-sidebar border-discord-dark">
                                <Calendar
                                    mode="single"
                                    selected={deadline}
                                    onSelect={setDeadline}
                                    initialFocus
                                    className="bg-discord-sidebar text-discord-text"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2">
                            Assigned To
                        </label>
                        <Select value={assignedTo} onValueChange={setAssignedTo}>
                            <SelectTrigger className="w-full bg-discord-dark border-none text-discord-text">
                                <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                            <SelectContent className="bg-discord-sidebar border-discord-dark">
                                {availableUsers.map((user: any) => (
                                    <SelectItem
                                        key={user.id}
                                        value={user.id}
                                        className="text-discord-text focus:bg-discord-item focus:text-discord-text"
                                    >
                                        {user.full_name || user.email}
                                    </SelectItem>
                                ))}
                                {availableUsers.length === 0 && (
                                    <div className="p-2 text-xs text-discord-text-muted italic">
                                        No users found in this department
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Target Department Selection (Only for Ops View) */}
                    {activeDepartment === "Operations" && (
                        <div>
                            <label className="block text-xs font-bold text-discord-blurple uppercase tracking-wide mb-2">
                                For Which Department?
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTargetDepartment("Operations")}
                                    className={`px-3 py-2 rounded text-xs font-bold border transition-all ${targetDepartment === "Operations"
                                        ? "bg-discord-blurple border-discord-blurple text-white"
                                        : "bg-discord-dark border-white/5 text-discord-text-muted"
                                        }`}
                                >
                                    MYSELF (OPS)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTargetDepartment("Designers")}
                                    className={`px-3 py-2 rounded text-xs font-bold border transition-all ${targetDepartment === "Designers"
                                        ? "bg-discord-blurple border-discord-blurple text-white"
                                        : "bg-discord-dark border-white/5 text-discord-text-muted"
                                        }`}
                                >
                                    DESIGNERS
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Social Media Fields */}
                    {activeDepartment === "Social" && (
                        <>
                            <div className="border-t border-discord-dark pt-4">
                                <p className="text-xs font-bold text-discord-blurple uppercase tracking-wide mb-3">
                                    Social Media Details
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2">
                                    Platform
                                </label>
                                <Select value={platform} onValueChange={setPlatform}>
                                    <SelectTrigger className="w-full bg-discord-dark border-none text-discord-text">
                                        <SelectValue placeholder="Select platform" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-discord-sidebar border-discord-dark">
                                        <SelectItem value="Instagram" className="text-discord-text focus:bg-discord-item">
                                            Instagram
                                        </SelectItem>
                                        <SelectItem value="TikTok" className="text-discord-text focus:bg-discord-item">
                                            TikTok
                                        </SelectItem>
                                        <SelectItem value="LinkedIn" className="text-discord-text focus:bg-discord-item">
                                            LinkedIn
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2">
                                    Content Type
                                </label>
                                <Select value={contentType} onValueChange={setContentType}>
                                    <SelectTrigger className="w-full bg-discord-dark border-none text-discord-text">
                                        <SelectValue placeholder="Select content type" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-discord-sidebar border-discord-dark">
                                        <SelectItem value="Video" className="text-discord-text focus:bg-discord-item">
                                            Video
                                        </SelectItem>
                                        <SelectItem value="Image" className="text-discord-text focus:bg-discord-item">
                                            Image
                                        </SelectItem>
                                        <SelectItem value="Carousel" className="text-discord-text focus:bg-discord-item">
                                            Carousel
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2">
                                    Tone of Voice (TOV)
                                </label>
                                <input
                                    type="text"
                                    value={tov}
                                    onChange={(e) => setTov(e.target.value)}
                                    className="w-full px-3 py-2 bg-discord-dark border-none rounded text-discord-text placeholder-discord-text-muted focus:outline-none focus:ring-2 focus:ring-discord-blurple"
                                    placeholder="e.g., Professional, Casual, Fun"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2">
                                    Reference Link
                                </label>
                                <input
                                    type="url"
                                    value={referenceLink}
                                    onChange={(e) => setReferenceLink(e.target.value)}
                                    className="w-full px-3 py-2 bg-discord-dark border-none rounded text-discord-text placeholder-discord-text-muted focus:outline-none focus:ring-2 focus:ring-discord-blurple"
                                    placeholder="https://..."
                                />
                            </div>
                        </>
                    )}

                    {/* Designers Fields - Checklist Parts */}
                    {targetDepartment === "Designers" && (
                        <>
                            <div className="border-t border-discord-dark pt-4">
                                <p className="text-xs font-bold text-discord-blurple uppercase tracking-wide mb-3">
                                    Checklist Parts
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2">
                                    Add Parts
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newPartTitle}
                                        onChange={(e) => setNewPartTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                addChecklistPart();
                                            }
                                        }}
                                        className="flex-1 px-3 py-2 bg-discord-dark border-none rounded text-discord-text placeholder-discord-text-muted focus:outline-none focus:ring-2 focus:ring-discord-blurple"
                                        placeholder="e.g., Draft, Render, Final Polish"
                                    />
                                    <Button
                                        type="button"
                                        onClick={addChecklistPart}
                                        className="bg-discord-blurple hover:bg-discord-blurple/80"
                                    >
                                        <Plus size={18} />
                                    </Button>
                                </div>
                            </div>

                            {checklistParts.length > 0 && (
                                <div className="space-y-2">
                                    {checklistParts.map((part, index) => (
                                        <div
                                            key={part.id}
                                            className="flex items-center gap-2 px-3 py-2 bg-discord-dark rounded"
                                        >
                                            <span className="text-discord-text-muted text-sm">{index + 1}.</span>
                                            <span className="flex-1 text-discord-text text-sm">{part.title}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeChecklistPart(part.id)}
                                                className="text-discord-text-muted hover:text-red-400 transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Operations/Account Managers Fields */}
                    {(activeDepartment === "Account Managers" || targetDepartment === "Operations" || (activeDepartment === "Operations" && targetDepartment === "Designers")) && (
                        <>
                            <div className="border-t border-discord-dark pt-4">
                                <p className="text-xs font-bold text-discord-blurple uppercase tracking-wide mb-3">
                                    Logistics & Client Details
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2">
                                        Client Name
                                    </label>
                                    <input
                                        type="text"
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        className="w-full px-3 py-2 bg-discord-dark border-none rounded text-discord-text placeholder-discord-text-muted focus:outline-none focus:ring-2 focus:ring-discord-blurple"
                                        placeholder="Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2">
                                        Company Name
                                    </label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="w-full px-3 py-2 bg-discord-dark border-none rounded text-discord-text placeholder-discord-text-muted focus:outline-none focus:ring-2 focus:ring-discord-blurple"
                                        placeholder="Company"
                                    />
                                </div>
                            </div>

                            {(targetDepartment === "Operations" || activeDepartment === "Account Managers") && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2">
                                            Shipping Location
                                        </label>
                                        <input
                                            type="text"
                                            value={shippingLocation}
                                            onChange={(e) => setShippingLocation(e.target.value)}
                                            className="w-full px-3 py-2 bg-discord-dark border-none rounded text-discord-text placeholder-discord-text-muted focus:outline-none focus:ring-2 focus:ring-discord-blurple"
                                            placeholder="Enter address"
                                        />
                                    </div>

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
                                </>
                            )}
                        </>
                    )}

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="bg-discord-item border-none text-discord-text hover:bg-discord-item/70"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-discord-blurple hover:bg-discord-blurple/80"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="animate-spin" size={16} />
                                    Creating...
                                </span>
                            ) : (
                                "Create Task"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
