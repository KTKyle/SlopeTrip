"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

type DestructiveSubmitButtonProps = ButtonProps & {
  confirmMessage: string;
  pendingLabel?: React.ReactNode;
};

export function DestructiveSubmitButton({
  children,
  confirmMessage,
  disabled,
  onClick,
  pendingLabel,
  type = "submit",
  ...props
}: DestructiveSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      aria-disabled={pending || disabled}
      disabled={pending || disabled}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
          return;
        }

        onClick?.(event);
      }}
      type={type}
      {...props}
    >
      {pending ? pendingLabel ?? "Deleting..." : children}
    </Button>
  );
}
