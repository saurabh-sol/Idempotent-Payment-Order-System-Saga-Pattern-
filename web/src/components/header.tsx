"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Lightning } from "@phosphor-icons/react";

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border-subtle bg-surface/80 backdrop-blur-xl"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#00a8cc]">
              <Lightning weight="fill" className="h-5 w-5 text-surface" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Saga
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="#features"
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Features
            </Link>
            <Link
              href="#architecture"
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Architecture
            </Link>
            <Link
              href="#api"
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              API
            </Link>
            <Link
              href="https://github.com/saurabh-sol/Idempotent-Payment-Order-System-Saga-Pattern-"
              target="_blank"
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              GitHub
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface-card px-4 py-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-text-secondary">
                Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
