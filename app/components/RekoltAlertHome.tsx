"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { useLanguage } from "../context/LanguageContext";
import { AlertSection } from "./AlertSection";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { HeroSection } from "./HeroSection";
import { StatusStrip } from "./StatusStrip";

/**
 * The homepage shell owns only shared UI state. Individual content areas remain
 * isolated components so they can later become routes without a rewrite.
 */
export function RekoltAlertHome() {
  const { language, setLanguage } = useLanguage();
  const [selectedDistrict, setSelectedDistrict] = useState("pamplemousses");
  const router = useRouter();

  /**
   * Keeps the selected map card and destination card connected through the
   * browser View Transition API. Older browsers receive a short 3D exit first.
   */
  const openDistrictData = (districtId: string) => {
    // Commit the clicked polygon before the browser captures the old frame.
    flushSync(() => setSelectedDistrict(districtId));
    const href = `/banne-done?district=${encodeURIComponent(districtId)}`;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      router.push(href);
      return;
    }

    if (!document.startViewTransition) {
      window.requestAnimationFrame(() => {
        document.documentElement.classList.add("district-route-exit");
        window.setTimeout(() => {
          router.push(href);

          // The root element survives client navigation, so remove the flag.
          window.setTimeout(
            () =>
              document.documentElement.classList.remove("district-route-exit"),
            450,
          );
        }, 260);
      });
      return;
    }

    document.startViewTransition(async () => {
      router.push(href);

      // Wait for the new card to exist before the browser captures its frame.
      await new Promise<void>((resolve) => {
        const selector = `[data-district-data-page="${districtId}"]`;

        if (document.querySelector(selector)) {
          resolve();
          return;
        }

        const observer = new MutationObserver(() => {
          if (document.querySelector(selector)) {
            observer.disconnect();
            window.clearTimeout(timeout);
            resolve();
          }
        });
        const timeout = window.setTimeout(() => {
          observer.disconnect();
          resolve();
        }, 1600);

        observer.observe(document.body, { childList: true, subtree: true });
      });
    });
  };

  return (
    <main>
      <div className="hero-shell">
        <Header
          language={language}
          onLanguageChange={setLanguage}
          activePath="/"
        />
        <HeroSection
          language={language}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={openDistrictData}
        />
        <StatusStrip language={language} />
      </div>

      <AlertSection
        language={language}
        selectedDistrict={selectedDistrict}
        onSelectDistrict={setSelectedDistrict}
      />
      <Footer language={language} />
    </main>
  );
}
