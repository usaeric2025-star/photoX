import * as React from "react"
import { cn } from "@/lib/utils"

const Alert = ({ className, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
  <div
    ref={ref}
    role="alert"
    className={cn(
      "relative w-full rounded-lg border border-slate-200 p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-slate-950",
      className
    )}
    {...props}
  />
);

const AlertTitle = ({ className, ref, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { ref?: React.Ref<HTMLParagraphElement> }) => (
  <h5
    ref={ref as any}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
);

const AlertDescription = ({ className, ref, ...props }: React.HTMLAttributes<HTMLParagraphElement> & { ref?: React.Ref<HTMLParagraphElement> }) => (
  <div
    ref={ref as any}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
);

export { Alert, AlertTitle, AlertDescription }
