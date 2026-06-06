import { AppShell } from "@/components/app-shell";
import { ResortMap } from "@/components/resort-map";
import { resorts } from "@/lib/resorts";

export default function Home() {
  return (
    <AppShell>
      <ResortMap resorts={resorts} />
    </AppShell>
  );
}
