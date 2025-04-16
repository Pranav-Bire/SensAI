"use client"

import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts.map(function ({ id, title, description, action, onOpenChange, ...props }) {
        return (
          <Toast 
            key={id} 
            {...props}
            // Custom handler that calls onOpenChange internally
            onMouseDown={(e) => {
              if (e.target.hasAttribute('toast-close') && typeof onOpenChange === 'function') {
                onOpenChange(false);
              }
              props.onMouseDown?.(e);
            }}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
    </div>
  );
} 
 