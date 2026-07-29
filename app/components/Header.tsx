"use client";

import { ChevronDown, Menu, Sprout, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { copy } from "../data/site-content";
import type { Language } from "../types";

type HeaderProps = {
  language: Language;
  onLanguageChange: (language: Language) => void;
  activePath?: string;
};

/** Shared navigation now links to real pages while preserving both languages. */
export function Header({
  language,
  onLanguageChange,
  activePath = "/",
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const content = copy[language];

  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Rekolt Alert — Akey">
        <span className="brand-mark" aria-hidden="true">
          <Sprout size={25} strokeWidth={2.2} />
        </span>
        <span>Rekolt Alert</span>
      </Link>

      <nav className="desktop-navigation" aria-label="Main navigation">
        {content.nav.map(([label, path]) => (
          <Link
            className={activePath === path ? "active" : ""}
            href={path}
            key={path}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="header-actions">
        <div
          className="language-switch"
          role="group"
          aria-label="Select language"
        >
          {(["mfe", "en"] as const).map((option) => (
            <button
              className={language === option ? "selected" : ""}
              type="button"
              aria-pressed={language === option}
              onClick={() => onLanguageChange(option)}
              key={option}
            >
              {copy[option].languageShort}
            </button>
          ))}
          <ChevronDown size={14} aria-hidden="true" />
        </div>

        <button
          className="mobile-menu-button"
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <nav className="mobile-navigation" aria-label="Mobile navigation">
          {content.nav.map(([label, path]) => (
            <Link
              href={path}
              onClick={() => setMenuOpen(false)}
              key={path}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
