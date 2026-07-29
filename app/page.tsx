import type { Metadata } from "next";
import { headers } from "next/headers";
import { RekoltAlertHome } from "./components/RekoltAlertHome";

/**
 * Builds absolute social-image metadata from the active request host so local,
 * preview and deployed URLs all share the correct card without hard-coded URLs.
 */
export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";
  const socialImage = new URL("/og.png", origin).toString();

  return {
    title: "Rekolt Alert — Protez sak rekolt Moris",
    description:
      "Bann alert agrikol lokal, meteo an direk ek done par distrik pou bann planter Moris.",
    openGraph: {
      title: "Rekolt Alert — Gard nou rekolt an sekirite",
      description:
        "Alert lokal, meteo an direk ek vizibilite lor tou distrik Moris.",
      images: [{ url: socialImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: [socialImage],
    },
  };
}

/**
 * The route stays intentionally small: the interactive homepage is split into
 * focused modules under app/components so each section can evolve separately.
 */
export default function Home() {
  return <RekoltAlertHome />;
}
