"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => {
  const internalRef = React.useRef<HTMLButtonElement | null>(null) as React.MutableRefObject<HTMLButtonElement | null>;
  const combinedRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      internalRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        Object.assign(ref, { current: node });
      }
    },
    [ref]
  );

  React.useEffect(() => {
    const updateStyles = () => {
      const element = internalRef.current;
      if (!element) return;
      
      const isChecked = element.getAttribute('data-state') === 'checked';
      element.style.backgroundColor = isChecked ? '#22c55e' : '#e5e7eb';
      element.style.borderColor = isChecked ? '#22c55e' : '#d1d5db';
    };

    updateStyles();
    
    const observer = new MutationObserver(updateStyles);
    if (internalRef.current) {
      observer.observe(internalRef.current, {
        attributes: true,
        attributeFilter: ['data-state']
      });
    }

    return () => observer.disconnect();
  }, []);

  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
      ref={combinedRef}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitives.Root>
  );
})
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch } 