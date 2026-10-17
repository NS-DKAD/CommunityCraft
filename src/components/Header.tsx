import React from "react";
import Link from "next/link";
import Image from "next/image";
import CommunityCraftLogo from "../../assets/CommunityCraft-Logo.png";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(17,17,17,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3"
          aria-label="CommunityCraft homepage"
        >
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <Image
              src={CommunityCraftLogo}
              alt="CommunityCraft logo"
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-lg font-semibold tracking-[-0.04em] text-[var(--text)]">
                CommunityCraft
              </span>
            </div>
            <p className="hidden text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] sm:block">
              ArtCraft Directory
            </p>
          </div>
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[0_8px_22px_rgba(15,23,42,0.04)] md:flex"
        >
          <Link
            href="/#discover"
            className="rounded-full px-3 py-1.5 text-sm text-[var(--text-soft)] transition-colors hover:bg-[var(--brand-soft)] hover:text-[var(--text)]"
          >
            Discover
          </Link>
          <Link
            href="/#catalog"
            className="rounded-full px-3 py-1.5 text-sm text-[var(--text-soft)] transition-colors hover:bg-[var(--brand-soft)] hover:text-[var(--text)]"
          >
            Search
          </Link>
          <Link
            href="/#catalog"
            className="rounded-full px-3 py-1.5 text-sm text-[var(--text-soft)] transition-colors hover:bg-[var(--brand-soft)] hover:text-[var(--text)]"
          >
            Tags
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/submit"
            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--text)]/20 sm:text-sm"
          >
            Submit
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-soft)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--text)]/20 sm:text-sm"
            aria-label="View CommunityCraft source code on GitHub (opens in a new tab)"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
