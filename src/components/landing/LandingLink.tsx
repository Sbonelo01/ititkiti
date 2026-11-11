import Link from "next/link";
import type { ReactNode } from "react";

export type LandingVariant = "primary" | "secondary" | "onGreen" | "ghostOnGreen";

function variantClass(variant: LandingVariant): string {
  switch (variant) {
    case "primary":
      return "bg-green-600 text-white hover:bg-green-700";
    case "secondary":
      return "bg-white text-green-900 ring-2 ring-green-200 hover:bg-green-50";
    case "onGreen":
      return "bg-white text-green-900 hover:bg-green-50";
    case "ghostOnGreen":
      return "bg-transparent text-white ring-2 ring-white/70 hover:bg-white/10";
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

type LandingLinkProps = {
  href: string;
  variant?: LandingVariant;
  className?: string;
  children: ReactNode;
};

export function landingLinkClass(variant: LandingVariant = "primary", className = ""): string {
      return `inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-center text-[15px] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-green-700)] ${variantClass(variant)} ${className}`;
}

export function LandingLink({
  href,
  variant = "primary",
  className = "",
  children,
}: LandingLinkProps) {
  return (
    <Link href={href} className={landingLinkClass(variant, className)}>
      {children}
    </Link>
  );
}
