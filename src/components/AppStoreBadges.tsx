import type { ReactNode } from "react";
import { FaApple, FaGooglePlay } from "react-icons/fa";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/constants/branding";

type AppStoreBadgesProps = {
  className?: string;
  layout?: "row" | "column";
};

function StoreBadge({
  href,
  label,
  sublabel,
  icon,
  comingSoon,
}: {
  href: string;
  label: string;
  sublabel: string;
  icon: ReactNode;
  comingSoon: boolean;
}) {
  const content = (
    <>
      <span className="text-2xl shrink-0" aria-hidden>
        {icon}
      </span>
      <span className="text-left leading-tight">
        <span className="block text-[10px] uppercase tracking-wide opacity-90">
          {comingSoon ? "Coming soon on" : sublabel}
        </span>
        <span className="block text-sm font-semibold">{label}</span>
      </span>
    </>
  );

  const className =
    "inline-flex items-center gap-3 rounded-xl border border-white/25 bg-black/80 px-4 py-3 text-white shadow-lg transition-all duration-200 hover:bg-black hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-green-400";

  if (comingSoon || !href) {
    return (
      <span
        className={`${className} cursor-default opacity-90`}
        aria-label={`${label} — launching soon`}
      >
        {content}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={`Download on ${label}`}
    >
      {content}
    </a>
  );
}

export default function AppStoreBadges({
  className = "",
  layout = "row",
}: AppStoreBadgesProps) {
  const layoutClass =
    layout === "column" ? "flex flex-col gap-3" : "flex flex-wrap gap-3 justify-center";

  return (
    <div className={`${layoutClass} ${className}`}>
      <StoreBadge
        href={APP_STORE_URL}
        sublabel="Download on the"
        label="App Store"
        icon={<FaApple />}
        comingSoon={!APP_STORE_URL}
      />
      <StoreBadge
        href={PLAY_STORE_URL}
        sublabel="Get it on"
        label="Google Play"
        icon={<FaGooglePlay />}
        comingSoon={!PLAY_STORE_URL}
      />
    </div>
  );
}
