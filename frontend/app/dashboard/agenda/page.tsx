"use client";

import CalendarSection from "@/components/dashboard/CalendarSection";
import { useDashboard } from "@/components/dashboard/DashboardProvider";

export default function AgendaPage() {
  const { calendar, setCalendar, reloadPosts, notify } = useDashboard();
  return (
    <div className="max-w-3xl">
      <CalendarSection status={calendar} setStatus={setCalendar} onSynced={() => void reloadPosts()} notify={notify} />
    </div>
  );
}
