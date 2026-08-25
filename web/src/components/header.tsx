"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { Lightning, List, X } from "@phosphor-icons/react";
import { useState, useEffect } from "react";
import { checkApiHealth, DOCS_URL } from "@/lib/api";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const { scrollY } = useScroll();
  
  const headerBg = useTransform(
    scrollY,
    [0, 50],
    ["rgba(255, 255, 255, 0.8)", "rgba(255, 255, 255, 0.95)"]
  );

  useEffect(() => {
    checkApiHealth().then(setApiOnline);
    const interval = setInterval(() => checkApiHealth().then(setApiOnline), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#architecture", label: "Architecture" },
    { href: "#api", label: "API" },
    { href: "/anomalies", label: "Anomalies" },
    { href: DOCS_URL, label: "Docs", external: true },
    { href: "https://github.com/saurabh-sol/Idempotent-Payment-Order-System-Saga-Pattern-", label: "GitHub", external: true },
  ];

  return (
    <>
      <motion.header
        style={{ backgroundColor: headerBg }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl transition-shadow duration-300 ${
          isScrolled ? "shadow-nav border-b border-border" : ""
        }`}
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="group flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: 15, scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-light shadow-glow"
              >
                <Lightning weight="fill" className="h-5 w-5 text-white" />
              </motion.div>
              <span className="text-xl font-bold tracking-tight text-text-primary">
                Saga
              </span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  className="nav-link px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2"
              >
                <span className="relative flex h-2 w-2">
                  {apiOnline ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-text-muted"></span>
                  )}
                </span>
                <span className="text-xs font-medium text-text-secondary">
                  {apiOnline === null ? "Checking..." : apiOnline ? "API Online" : "API Offline"}
                </span>
              </motion.div>

              <Link
                href="/checkout"
                className="hidden sm:inline-flex shimmer-btn items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-light px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-glow"
              >
                Try Demo
              </Link>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-surface-secondary transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6 text-text-primary" />
                ) : (
                  <List className="h-6 w-6 text-text-primary" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={isMobileMenuOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        className={`fixed top-16 left-0 right-0 z-40 glass-strong border-b border-border md:hidden ${
          isMobileMenuOpen ? "block" : "hidden"
        }`}
      >
        <nav className="flex flex-col p-4 space-y-1">
          {navLinks.map((link, index) => (
            <motion.div
              key={link.href}
              initial={{ opacity: 0, x: -20 }}
              animate={isMobileMenuOpen ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                href={link.href}
                target={link.external ? "_blank" : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-3 text-sm font-medium text-text-secondary hover:text-brand hover:bg-surface-hover rounded-lg transition-all"
              >
                {link.label}
              </Link>
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isMobileMenuOpen ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ delay: 0.2 }}
            className="pt-2"
          >
            <Link
              href="/checkout"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-center shimmer-btn rounded-xl bg-gradient-to-r from-brand to-brand-light px-5 py-3 text-sm font-semibold text-white"
            >
              Try Demo
            </Link>
          </motion.div>
        </nav>
      </motion.div>
    </>
  );
}
