"use client";

import { motion } from "motion/react";
import { ArrowRight, ShieldCheck } from "@phosphor-icons/react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-[100dvh] pt-32 pb-20">
      <div className="gradient-blur left-1/2 top-20 -translate-x-1/2" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-12 lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-card px-4 py-2">
              <ShieldCheck weight="fill" className="h-4 w-4 text-accent" />
              <span className="text-sm text-text-secondary">
                Distributed Transactions Done Right
              </span>
            </div>

            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="block">Zero double-charges.</span>
              <span className="mt-2 block bg-gradient-to-r from-accent to-[#00a8cc] bg-clip-text text-transparent">
                Automatic rollback.
              </span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-text-secondary max-w-[48ch]">
              Production-grade order processing with Saga pattern orchestration,
              idempotency-key deduplication, and real-time anomaly detection.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/checkout"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-[#00a8cc] px-6 py-3.5 text-sm font-medium text-surface transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/20"
              >
                Try Demo Checkout
                <ArrowRight
                  weight="bold"
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-card px-6 py-3.5 text-sm font-medium text-text-primary transition-all hover:border-text-muted hover:bg-surface-hover"
              >
                Documentation
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="rounded-2xl border border-border bg-surface-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="ml-3 text-xs text-text-muted font-mono">
                  saga-orchestrator
                </span>
              </div>

              <div className="space-y-3 font-mono text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-text-muted">1</span>
                  <span className="text-emerald-400">reserve_inventory</span>
                  <span className="ml-auto text-text-muted">OK</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-text-muted">2</span>
                  <span className="text-emerald-400">charge_payment</span>
                  <span className="ml-auto text-text-muted">OK</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-text-muted">3</span>
                  <span className="text-red-400">confirm_order</span>
                  <span className="ml-auto text-red-400">FAILED</span>
                </div>
                <div className="my-4 border-t border-border-subtle" />
                <div className="text-amber-400">Compensating...</div>
                <div className="flex items-center gap-3 pl-4">
                  <span className="text-text-muted">-</span>
                  <span className="text-blue-400">refund_payment</span>
                  <span className="ml-auto text-emerald-400">DONE</span>
                </div>
                <div className="flex items-center gap-3 pl-4">
                  <span className="text-text-muted">-</span>
                  <span className="text-blue-400">release_inventory</span>
                  <span className="ml-auto text-emerald-400">DONE</span>
                </div>
                <div className="my-4 border-t border-border-subtle" />
                <div className="text-text-secondary">
                  Order status: <span className="text-text-primary">cancelled</span>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -right-4 -z-10 h-full w-full rounded-2xl bg-gradient-to-br from-accent/10 to-transparent" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
