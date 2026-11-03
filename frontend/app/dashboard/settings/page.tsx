"use client";

import { useDashboard } from "@/components/dashboard/DashboardProvider";
import ProfileSection from "@/components/dashboard/ProfileSection";

export default function SettingsPage() {
  const { profile, setProfile, aiKey, setAiKey, notify } = useDashboard();
  return (
    <div className="max-w-3xl space-y-6">
      <ProfileSection profile={profile} onChange={setProfile} aiKey={aiKey} onAiKey={setAiKey} notify={notify} />
    </div>
  );
}
