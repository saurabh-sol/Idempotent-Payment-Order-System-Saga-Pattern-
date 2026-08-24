"use client";

import { motion } from "motion/react";
import { ArrowRight, ShieldCheck, Play } from "@phosphor-icons/react";
import Link from "next/link";
import { Typewriter } from "./typewriter";
import { useState, useEffect } from "react";

const terminalLines = [
  { num: "1", text: "reserve_inventory", status: "OK", statusColor: "text-white" },
  { num: "2", text: "charge_payment", status: "OK", statusColor: "text-white" },
  { num: "3", text: "confirm_order", status: "FAILED", statusColor: "text-brand" },
];

const compensationLines = [
  { text: "refund_payment", status: "DONE", statusColor: "text-white" },
  { text: "release_inventory", status: "DONE", statusColor: "text-white" },
];

export function Hero() {
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalStep, setTerminalStep] = useState(0);
  const [showCompensation, setShowCompensation] = useState(false);
  const [compensationStep, setCompensationStep] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setShowTerminal(true), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showTerminal) return;
    if (terminalStep < terminalLines.length) {
      const timer = setTimeout(() => setTerminalStep(prev => prev + 1), 600);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setShowCompensation(true), 500);
      return () => clearTimeout(timer);
    }
  }, [showTerminal, terminalStep]);

  useEffect(() => {
    if (!showCompensation) return;
    if (compensationStep < compensationLines.length) {
      const timer = setTimeout(() => setCompensationStep(prev => prev + 1), 500);
      return () => clearTimeout(timer);
    }
  }, [showCompensation, compensationStep]);

  return (
    <section className="relative min-h-[100dvh] pt-32 pb-20 overflow-hidden bg-pattern">
      {/* Floating gradient orbs */}
      <motion.div
        animate={{ y: [0, -30, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="gradient-orb gradient-orb-orange w-[500px] h-[500px] -top-20 -right-20 absolute"
      />
      <motion.div
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="gradient-orb gradient-orb-coral w-[400px] h-[400px] top-1/2 -left-40 absolute"
      />
      <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="gradient-orb gradient-orb-peach w-[300px] h-[300px] bottom-20 right-1/4 absolute"
      />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-12 lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-muted px-4 py-2"
            >
              <ShieldCheck weight="fill" className="h-4 w-4 text-brand" />
              <span className="text-sm font-medium text-brand">
                Distributed Transactions Done Right
              </span>
            </motion.div>

            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
              <span className="block">
                <Typewriter 
                  text="Zero double-charges." 
                  speed={60} 
                  delay={400}
                  showCursor={false}
                />
              </span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5 }}
                className="mt-2 block gradient-text"
              >
                Automatic rollback.
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-6 text-lg leading-relaxed text-text-secondary max-w-[48ch]"
            >
              Production-grade order processing with Saga pattern orchestration,
              idempotency-key deduplication, and real-time anomaly detection.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Link
                href="/checkout"
                className="group shimmer-btn inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-light px-6 py-3.5 text-sm font-semibold text-white transition-all hover:-translate-y-1 hover:shadow-glow-lg"
              >
                <Play weight="fill" className="h-4 w-4" />
                Try Demo Checkout
                <ArrowRight
                  weight="bold"
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                />
              </Link>
              <Link
                href="#architecture"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-6 py-3.5 text-sm font-semibold text-text-primary transition-all hover:border-brand hover:bg-surface-hover hover:-translate-y-1"
              >
                View Architecture
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-12 flex items-center gap-6"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full bg-gradient-to-br from-brand/20 to-brand-light/20 border-2 border-white flex items-center justify-center text-xs font-bold text-brand"
                  >
                    {i}
                  </div>
                ))}
              </div>
              <p className="text-sm text-text-muted">
                <span className="font-semibold text-text-primary">10K+</span> orders processed safely
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Terminal Card */}
            <div className="rounded-2xl border border-border bg-white p-1 shadow-card-hover">
              <div className="rounded-xl bg-[#1a1a1a] p-6">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-white/30" />
                  <div className="h-3 w-3 rounded-full bg-white/50" />
                  <div className="h-3 w-3 rounded-full bg-brand" />
                  <span className="ml-3 text-xs text-gray-500 font-mono">
                    saga-orchestrator
                  </span>
                </div>

                <div className="space-y-3 font-mono text-sm min-h-[280px]">
                  {terminalLines.slice(0, terminalStep).map((line, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-3"
                    >
                      <span className="text-gray-600 w-4">{line.num}</span>
                      <span className={line.status === "FAILED" ? "text-brand" : "text-white"}>
                        {line.text}
                      </span>
                      <span className={`ml-auto ${line.statusColor}`}>{line.status}</span>
                    </motion.div>
                  ))}

                  {showCompensation && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="my-4 border-t border-gray-700"
                      />
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-brand"
                      >
                        Compensating...
                      </motion.div>
                      {compensationLines.slice(0, compensationStep).map((line, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                          className="flex items-center gap-3 pl-4"
                        >
                          <span className="text-gray-600">-</span>
                          <span className="text-white/80">{line.text}</span>
                          <span className={`ml-auto ${line.statusColor}`}>{line.status}</span>
                        </motion.div>
                      ))}
                      {compensationStep >= compensationLines.length && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <div className="my-4 border-t border-gray-700" />
                          <div className="text-gray-400">
                            Order status: <span className="text-white font-medium">cancelled</span>
                          </div>
                          <div className="text-gray-500 text-xs mt-1">
                            User refunded. Inventory released. Zero charge.
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-6 -right-6 w-24 h-24 border-2 border-dashed border-brand/20 rounded-full"
            />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-brand/10 to-transparent rounded-2xl -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
