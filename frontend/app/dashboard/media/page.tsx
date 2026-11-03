"use client";

import { useDashboard } from "@/components/dashboard/DashboardProvider";
import MediaSection from "@/components/dashboard/MediaSection";

export default function MediaPage() {
  const { media, setMedia, notify } = useDashboard();
  return <MediaSection media={media} setMedia={setMedia} notify={notify} />;
}
