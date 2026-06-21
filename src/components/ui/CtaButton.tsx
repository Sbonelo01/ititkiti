import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type CtaVariant = "primary" | "secondary" | "outline" | "dark";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<CtaVariant, string> = {
  primary: "bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg",
  secondary: "bg-white text-green-800 hover:bg-green-50 shadow-md border border-green-100",
  outline: "border-2 border-white text-white hover:bg-white/15",
  dark: "bg-gray-900 text-white hover:bg-gray-800 shadow-md",
};

type CtaLinkProps = {
  href: string;
  variant?: CtaVariant;
  className?: string;
  children: ReactNode;
};

export function CtaLink({ href, variant = "primary", className = "", children }: CtaLinkProps) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}

type CtaButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: CtaVariant;
  children: ReactNode;
};

export function CtaButton({
  variant = "primary",
  className = "",
  children,
  type = "button",
  ...props
}: CtaButtonProps) {
  return (
    <button type={type} className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
