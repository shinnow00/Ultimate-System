"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { Message, Profile } from "@/types/database";
import { Plus, Send, Smile, Loader2 } from "lucide-react";

interface ChatAreaProps {
    userProfile?: Profile | null;
}

export default function ChatArea({ userProfile }: ChatAreaProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const supabaseRef = useRef(createClient());

    // Scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch initial messages and set up realtime subscription
    useEffect(() => {
        const supabase = supabaseRef.current;

        const fetchMessages = async () => {
            console.log("DEBUG: Starting initial history fetch...");
            // Try with joined profiles first
            const { data, error } = await supabase
                .from("messages")
                .select(`
                    *,
                    sender:profiles!sender_id (
                        email,
                        avatar_url
                    )
                `)
                .eq("channel_id", "general")
                .order("created_at", { ascending: true })
                .limit(100);

            if (error) {
                console.warn("DEBUG: Initial fetch with join failed, falling back to plain messages:", error.message);
                // Fallback: Fetch plain messages without profiles
                const { data: plainData, error: plainError } = await supabase
                    .from("messages")
                    .select("*")
                    .eq("channel_id", "general")
                    .order("created_at", { ascending: true })
                    .limit(100);

                if (plainError) {
                    console.error("DEBUG: Plain history fetch also failed:", plainError);
                } else {
                    console.log("DEBUG: Plain history fetched:", plainData?.length);
                    setMessages(plainData || []);
                }
            } else {
                console.log("DEBUG: Joined history fetched:", data?.length);
                setMessages(data || []);
            }
            setLoading(false);

            // Give the DOM a moment to render before scrolling
            setTimeout(scrollToBottom, 100);
        };

        fetchMessages();

        // Set up realtime subscription
        const channel = supabase
            .channel("general-chat")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: "channel_id=eq.general",
                },
                async (payload) => {
                    console.log("DEBUG: Realtime payload received:", payload);
                    // Fetch the new message with profile info
                    const { data: newMsg, error: fetchError } = await supabase
                        .from("messages")
                        .select(`
              *,
              sender:profiles!sender_id (
                email,
                avatar_url
              )
            `)
                        .eq("id", payload.new.id)
                        .single();

                    if (fetchError) {
                        console.error("DEBUG: Error fetching realtime message details:", fetchError.message, fetchError.details);
                        // Fallback: Add message without profile info
                        setMessages((prev) => [...prev, { ...payload.new } as Message]);
                    } else if (newMsg) {
                        console.log("DEBUG: Realtime message added to state:", newMsg.id);
                        setMessages((prev) => [...prev, newMsg]);
                    }
                }
            )
            .subscribe();

        // Cleanup subscription on unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Send a message
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        const supabase = supabaseRef.current;
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.error("Not authenticated");
            return;
        }

        setSending(true);

        const { error } = await supabase.from("messages").insert({
            channel_id: "general",
            sender_id: user.id,
            content: newMessage.trim(),
        });

        if (error) {
            console.error("DEBUG: Error sending message:", error);
        } else {
            console.log("DEBUG: Message inserted successfully");
            setNewMessage("");
        }

        setSending(false);
    };

    // Format timestamp
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    // Format date for day separators
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return "Today";
        } else if (date.toDateString() === yesterday.toDateString()) {
            return "Yesterday";
        }
        return date.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    };

    // Check if we need a date separator
    const needsDateSeparator = (msg: Message, prevMsg?: Message) => {
        if (!prevMsg) return true;
        const msgDate = new Date(msg.created_at).toDateString();
        const prevDate = new Date(prevMsg.created_at).toDateString();
        return msgDate !== prevDate;
    };

    // Get user display name
    const getUserName = (msg: any) => {
        // 1. Check joined sender/profiles
        const profile = msg.sender || msg.profiles;
        if (profile?.full_name) return profile.full_name;
        if (profile?.email) return profile.email.split("@")[0];

        // 2. Fallback to local user profile if it's the current user
        if (userProfile && msg.sender_id === userProfile.id) {
            return userProfile.full_name || userProfile.email.split("@")[0];
        }

        return "Unknown User";
    };

    // Get user initial for avatar
    const getInitial = (msg: any) => {
        const name = getUserName(msg);
        return name[0]?.toUpperCase() || "?";
    };

    // Generate color from user ID
    const getAvatarColor = (senderId: string) => {
        const colors = [
            "bg-discord-blurple",
            "bg-discord-green",
            "bg-pink-500",
            "bg-orange-500",
            "bg-yellow-500",
            "bg-cyan-500",
            "bg-red-500",
            "bg-purple-500",
        ];
        const hash = senderId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-discord-blurple" size={32} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 bg-discord-item rounded-full flex items-center justify-center mb-4">
                            <span className="text-3xl">👋</span>
                        </div>
                        <h2 className="text-xl font-bold text-discord-text mb-2">
                            Welcome to #general!
                        </h2>
                        <p className="text-discord-text-muted max-w-md">
                            This is the start of the #general channel. Say hello!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg, index) => {
                            const prevMsg = messages[index - 1];
                            const showDateSeparator = needsDateSeparator(msg, prevMsg);
                            const sameUser = prevMsg?.sender_id === msg.sender_id && !showDateSeparator;
                            const timeDiff = prevMsg
                                ? new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()
                                : Infinity;
                            const showHeader = !sameUser || timeDiff > 5 * 60 * 1000; // 5 min gap

                            return (
                                <div key={msg.id}>
                                    {/* Date Separator */}
                                    {showDateSeparator && (
                                        <div className="flex items-center gap-4 my-4">
                                            <div className="flex-1 h-px bg-discord-item" />
                                            <span className="text-xs font-semibold text-discord-text-muted px-2">
                                                {formatDate(msg.created_at)}
                                            </span>
                                            <div className="flex-1 h-px bg-discord-item" />
                                        </div>
                                    )}

                                    {/* Message */}
                                    <div
                                        className={`flex gap-4 hover:bg-discord-item/20 px-2 py-0.5 -mx-2 rounded ${showHeader ? "mt-4" : ""
                                            }`}
                                    >
                                        {/* Avatar */}
                                        {showHeader ? (
                                            <div
                                                className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${getAvatarColor(
                                                    msg.sender_id
                                                )}`}
                                            >
                                                <span className="text-white font-medium">{getInitial(msg)}</span>
                                            </div>
                                        ) : (
                                            <div className="w-10 flex-shrink-0" />
                                        )}

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            {showHeader && (
                                                <div className="flex items-baseline gap-2">
                                                    <span className="font-medium text-discord-text hover:underline cursor-pointer">
                                                        {getUserName(msg)}
                                                    </span>
                                                    <span className="text-xs text-discord-text-muted">
                                                        {formatTime(msg.created_at)}
                                                    </span>
                                                </div>
                                            )}
                                            <p className="text-discord-text break-words">{msg.content}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="px-4 pb-6">
                <form onSubmit={handleSendMessage} className="relative">
                    <div className="flex items-center gap-2 bg-discord-item rounded-lg px-4 py-2.5">
                        {/* Plus Button */}
                        <button
                            type="button"
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-discord-text-muted hover:bg-discord-text transition-colors"
                        >
                            <Plus size={16} className="text-discord-bg" />
                        </button>

                        {/* Text Input */}
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Message #general"
                            className="flex-1 bg-transparent text-discord-text placeholder-discord-text-muted focus:outline-none"
                            disabled={sending}
                        />

                        {/* Emoji Button */}
                        <button
                            type="button"
                            className="text-discord-text-muted hover:text-discord-text transition-colors"
                        >
                            <Smile size={22} />
                        </button>

                        {/* Send Button (visible when typing) */}
                        {newMessage.trim() && (
                            <button
                                type="submit"
                                disabled={sending}
                                className="text-discord-blurple hover:text-discord-blurple/80 transition-colors"
                            >
                                {sending ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <Send size={20} />
                                )}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
