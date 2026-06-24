import * as React from "react";
import { cn } from "@/lib/utils";

type ToggleChipProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pressed: boolean;
};

export function ToggleChip({
  className,
  pressed,
  type = "button",
  ...props
}: ToggleChipProps) {
  return (
    <button
      aria-pressed={pressed}
      className={cn(
        "min-h-9 rounded-md border px-3 py-1.5 text-xs font-medium capitalize shadow-sm transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        pressed
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-white/72 text-muted-foreground hover:border-primary/45 hover:bg-white hover:text-foreground",
        className,
      )}
      data-state={pressed ? "on" : "off"}
      type={type}
      {...props}
    />
  );
}
