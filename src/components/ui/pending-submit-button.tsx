"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

type PendingSubmitButtonProps = ButtonProps & {
  pendingLabel?: React.ReactNode;
};

export function PendingSubmitButton({
  children,
  disabled,
  pendingLabel,
  type = "submit",
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button aria-disabled={pending || disabled} disabled={pending || disabled} type={type} {...props}>
      {pending ? pendingLabel ?? "Working..." : children}
    </Button>
  );
}
