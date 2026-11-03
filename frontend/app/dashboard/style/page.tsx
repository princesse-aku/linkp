"use client";

import { useDashboard } from "@/components/dashboard/DashboardProvider";
import StyleSection from "@/components/dashboard/StyleSection";

export default function StylePage() {
  const { examples, setExamples, profile, setProfile, aiKey, notify } = useDashboard();
  return (
    <div className="max-w-3xl">
      <StyleSection examples={examples} setExamples={setExamples} profile={profile} onProfile={setProfile} aiReady={aiKey.configured} notify={notify} />
    </div>
  );
}
