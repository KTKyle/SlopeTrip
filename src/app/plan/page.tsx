import { AppShell } from "@/components/app-shell";
import { TripPlanner } from "@/components/trip-planner";
import { resorts } from "@/lib/resorts";

export default function PlanPage() {
  return (
    <AppShell>
      <TripPlanner resorts={resorts} />
    </AppShell>
  );
}
