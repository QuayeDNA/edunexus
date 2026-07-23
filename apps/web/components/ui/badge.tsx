import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-brand-100 text-brand-700",
        success: "bg-accent-100 text-accent-700",
        // was: bg-yellow-100 text-yellow-700 (unthemed Tailwind default)
        warning: "bg-[color-mix(in_oklch,var(--color-warning)_18%,white)] text-[color-mix(in_oklch,var(--color-warning)_70%,black)]",
        // was: bg-red-100 text-red-700 (unthemed Tailwind default)
        danger: "bg-destructive/10 text-destructive",
        // was: bg-blue-100 text-blue-700 (unthemed Tailwind default)
        info: "bg-[color-mix(in_oklch,var(--color-info)_15%,white)] text-[color-mix(in_oklch,var(--color-info)_75%,black)]",
        outline: "border border-border text-text-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
