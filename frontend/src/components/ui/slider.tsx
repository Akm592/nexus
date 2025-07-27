import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { cn } from '@/lib/utils';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center group', // Added group for potential hover effects
      className
    )}
    {...props}
  >
    {/* The background track of the slider */}
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/20">
      {/* The filled part of the slider, showing the current value with a gradient */}
      <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-sky-400 to-cyan-400" />
    </SliderPrimitive.Track>
    {/* The interactive handle of the slider */}
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-primary bg-white shadow-lg ring-offset-background transition-all duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-hover:scale-110" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
