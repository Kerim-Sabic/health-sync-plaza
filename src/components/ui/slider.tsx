import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex h-11 w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-surface-3">
      <SliderPrimitive.Range className="absolute h-full rounded-full bg-volt" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block size-7 cursor-grab rounded-full bg-white shadow-[0_2px_8px_oklch(0_0_0/0.3),0_0_0_0.5px_oklch(0_0_0/0.08)] transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-110 active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
