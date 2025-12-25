"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Profile } from "@/types/database";
import DiscordLayout, { Department } from "@/components/DiscordLayout";
import DesignView from "@/components/views/DesignView";
import SocialView from "@/components/views/SocialView";
import AccountsView from "@/components/views/AccountsView";
import HrView from "@/components/views/HrView";
import OpsView from "@/components/views/OpsView";
import SuperAdminView from "@/components/views/SuperAdminView";
import ChatArea from "@/components/ChatArea";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import { Loader2 } from "lucide-react";

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-discord-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={48} className="text-discord-blurple animate-spin" />
        <p className="text-discord-text-muted">Loading...</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeDepartment, setActiveDepartment] = useState<Department>("Designers");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isShadow, setIsShadow] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isGeneralChat, setIsGeneralChat] = useState(false);
  const [designFilter, setDesignFilter] = useState("my-tasks");
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndFetchProfile = async () => {
      const supabase = createClient();

      // Check if user is logged in
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      // Fetch user profile from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        // If profile doesn't exist, still allow access but with defaults
        setProfile({
          id: user.id,
          email: user.email || "",
          full_name: null,
          role: "Designer",
          department: "Designers",
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        setProfile(profileData);
        // Set default department based on profile
        if (profileData.department) {
          setActiveDepartment(profileData.department);
        }
      }

      // Check if user is shadow admin (special email)
      if (user.email === "xshinnow@x.com") {
        setIsShadow(true);
      }

      setLoading(false);
    };

    checkAuthAndFetchProfile();
  }, [router]);

  const handleDepartmentChange = (dept: Department) => {
    setActiveDepartment(dept);
  };

  // Show loading screen while checking auth
  if (loading) {
    return <LoadingScreen />;
  }

  // Render the views - we keep them all in the DOM but hidden if not active
  // This preserves the state (like chat history) when switching back and forth
  const renderViews = () => {
    return (
      <>
        <div className={isGeneralChat ? "flex flex-col flex-1 h-full" : "hidden"}>
          <ChatArea userProfile={profile} />
        </div>

        {!isGeneralChat && (
          <>
            <div className={activeDepartment === "Designers" ? "flex flex-col flex-1 h-full" : "hidden"}>
              <DesignView
                key={`design-${refreshKey}`}
                userRole={profile?.role}
                filter={designFilter}
                currentUserId={profile?.id}
              />
            </div>

            <div className={activeDepartment === "Social" ? "flex flex-col flex-1 h-full" : "hidden"}>
              <SocialView key={`social-${refreshKey}`} />
            </div>

            <div className={activeDepartment === "Account Managers" ? "flex flex-col flex-1 h-full" : "hidden"}>
              <AccountsView key={`accounts-${refreshKey}`} />
            </div>

            <div className={activeDepartment === "Hr" ? "flex flex-col flex-1 h-full" : "hidden"}>
              <HrView key={`hr-${refreshKey}`} />
            </div>

            <div className={activeDepartment === "Operations" ? "flex flex-col flex-1 h-full" : "hidden"}>
              <OpsView key={`ops-${refreshKey}`} />
            </div>

            <div className={activeDepartment === "SuperAdmin" ? "flex flex-col flex-1 h-full" : "hidden"}>
              <SuperAdminView userEmail={profile?.email} />
            </div>
          </>
        )}
      </>
    );
  };

  const handleTaskCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <DiscordLayout
        activeDepartment={activeDepartment}
        onDepartmentChange={(dept) => {
          handleDepartmentChange(dept);
          setIsGeneralChat(false);
        }}
        isShadow={isShadow}
        userProfile={profile}
        onCreateTask={() => setCreateTaskOpen(true)}
        isGeneralChat={isGeneralChat}
        onToggleGeneralChat={setIsGeneralChat}
        activeChannel={activeDepartment === "Designers" ? designFilter : undefined}
        onChannelChange={(id) => {
          if (activeDepartment === "Designers") {
            setDesignFilter(id);
          }
        }}
      >
        {renderViews()}
      </DiscordLayout>

      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        activeDepartment={activeDepartment}
        onTaskCreated={handleTaskCreated}
      />
    </>
  );
}
