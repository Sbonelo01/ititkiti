import { QrCodeIcon } from "@heroicons/react/24/outline";
import { ORGANIZER_APP, SCANNER_APP_URL } from "@/constants/branding";

type ScannerAppLinkProps = {
  className?: string;
  /** primary: green button; light: white on dark sections; outline: bordered on dark footer */
  variant?: "primary" | "light" | "outline";
  label?: string;
  showIcon?: boolean;
  onClick?: () => void;
};

const variantClasses: Record<NonNullable<ScannerAppLinkProps["variant"]>, string> = {
  primary:
    "bg-[#16A34A] text-white hover:bg-[#15803D] shadow-md px-6 py-3 text-sm sm:text-base",
  light:
    "bg-white text-green-800 hover:bg-green-50 shadow-lg px-6 py-3 text-sm sm:text-base",
  outline:
    "border border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm px-5 py-2.5 text-sm",
};

export default function ScannerAppLink({
  className = "",
  variant = "primary",
  label,
  showIcon = true,
  onClick,
}: ScannerAppLinkProps) {
  const text = label ?? `Open ${ORGANIZER_APP.name}`;

  return (
    <a
      href={SCANNER_APP_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors ${variantClasses[variant]} ${className}`}
    >
      {showIcon ? <QrCodeIcon className="h-5 w-5 shrink-0" aria-hidden /> : null}
      {text}
    </a>
  );
}
