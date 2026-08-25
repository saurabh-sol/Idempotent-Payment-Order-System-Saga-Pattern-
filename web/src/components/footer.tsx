"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { GithubLogo, Lightning, Heart, ArrowUpRight } from "@phosphor-icons/react";
import { DOCS_URL, GRAFANA_URL } from "@/lib/api";

const footerLinks = [
  { label: "Features", href: "#features" },
  { label: "Architecture", href: "#architecture" },
  { label: "API", href: "#api" },
  { label: "Demo", href: "/checkout" },
  { label: "Anomalies", href: "/anomalies" },
  { label: "API Docs", href: DOCS_URL, external: true },
  { label: "Grafana", href: GRAFANA_URL, external: true },
];

const socialLinks = [
  {
    label: "GitHub",
    href: "https://github.com/saurabh-sol/Idempotent-Payment-Order-System-Saga-Pattern-",
    icon: GithubLogo,
  },
];

export function Footer() {
  return (
    <footer className="relative bg-white border-t border-border">
      {/* CTA Section */}
      <div className="mx-auto max-w-7xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h3 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
            Ready to see it in action?
          </h3>
          <p className="text-text-secondary mb-8 max-w-md mx-auto">
            Try the demo checkout and watch the saga pattern handle failures gracefully.
          </p>
          <Link
            href="/checkout"
            className="inline-flex items-center gap-2 shimmer-btn rounded-xl bg-gradient-to-r from-brand to-brand-light px-8 py-4 text-sm font-semibold text-white transition-all hover:-translate-y-1 hover:shadow-glow-lg"
          >
            Launch Demo
            <ArrowUpRight weight="bold" className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>

      {/* Main Footer */}
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Logo & Description */}
            <div className="flex flex-col items-center md:items-start gap-4">
              <Link href="/" className="flex items-center gap-3 group">
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
              <p className="text-sm text-text-muted text-center md:text-left max-w-xs">
                Production-grade distributed transactions with zero double-charges.
              </p>
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-wrap items-center justify-center gap-6">
              {footerLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  target={"external" in link && link.external ? "_blank" : undefined}
                  className="text-sm font-medium text-text-secondary hover:text-brand transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-secondary hover:bg-brand-muted border border-border hover:border-brand/30 transition-all"
                >
                  <social.icon weight="fill" className="h-5 w-5 text-text-secondary hover:text-brand" />
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border bg-surface-secondary">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-muted flex items-center gap-1">
              Built with <Heart weight="fill" className="h-4 w-4 text-brand" /> for system design
            </p>
            <p className="text-sm text-text-muted">
              Stripe Test Mode Only — No real charges
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
