import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { BRAND } from "@/constants/branding";

export const metadata = buildPageMetadata({
  title: `Event Not Found | ${BRAND.name}`,
  description: "This event may have ended or the link is incorrect. Browse upcoming events on Tikiti.",
  path: "/events",
});

export default function EventNotFound() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Event not found</h1>
        <p className="text-gray-600 mb-6">
          This event may have been removed or the link is incorrect.
        </p>
        <Link
          href="/events"
          className="inline-flex items-center justify-center rounded-xl bg-green-600 px-5 py-3 text-white font-semibold hover:bg-green-700"
        >
          Browse events
        </Link>
      </div>
    </div>
  );
}
