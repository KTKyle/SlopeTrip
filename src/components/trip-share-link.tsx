"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TripShareLink({ token }: { token: string }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const href = useMemo(() => {
    if (typeof window === "undefined") return `/share/${token}`;
    return `${window.location.origin}/share/${token}`;
  }, [token]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(href);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }

    window.setTimeout(() => setCopyStatus("idle"), 1800);
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-white/72 p-3 text-sm shadow-sm">
      <span className="break-all text-muted-foreground">{href}</span>
      <Button type="button" variant="outline" onClick={copyLink}>
        {copyStatus === "copied" ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copyStatus === "copied" ? "Copied" : "Copy public link"}
      </Button>
      {copyStatus !== "idle" && (
        <span className="text-xs text-muted-foreground" role={copyStatus === "error" ? "alert" : "status"}>
          {copyStatus === "copied" && "Public link copied."}
          {copyStatus === "error" && "Copy failed. Select the link and copy it manually."}
        </span>
      )}
    </div>
  );
}
