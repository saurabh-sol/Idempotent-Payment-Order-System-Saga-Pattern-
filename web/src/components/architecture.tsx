"use client";

import { motion } from "motion/react";
import {
  User,
  Robot,
  ArrowRight,
  Database,
  Lightning,
  CreditCard,
  ChartLine,
} from "@phosphor-icons/react";

const nodes = [
  { icon: User, label: "Client", sublabel: "or AI Agent", highlight: false },
  { icon: Lightning, label: "FastAPI", sublabel: "Idempotency", highlight: true },
  { icon: Database, label: "Saga", sublabel: "Orchestrator", highlight: true },
  { icon: CreditCard, label: "Stripe", sublabel: "Payments", highlight: false },
];

const boundaries = [
  {
    title: "AI Agent",
    description: "Generates intent (what to buy, how much) via tool calls",
    color: "text-blue-400",
  },
  {
    title: "Deterministic Core",
    description: "Decides whether the transaction commits (saga + idempotency unchanged)",
    color: "text-accent",
  },
  {
    title: "Anomaly Detector",
    description: "Flags suspicion, triggers rate-limit. Never unilaterally approves or denies",
    color: "text-amber-400",
  },
];

export function Architecture() {
  return (
    <section
      id="architecture"
      className="relative py-24 border-t border-border-subtle"
    >
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            System Architecture
          </h2>
          <p className="mt-4 text-text-secondary max-w-[50ch]">
            AI generates intent. Deterministic core commits transactions.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-border bg-surface-card p-8 md:p-12"
        >
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {nodes.map((node, index) => (
              <div key={node.label} className="flex items-center gap-4 md:gap-6">
                <div
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 md:p-6 transition-all ${
                    node.highlight
                      ? "border-accent/30 bg-accent/5 shadow-lg shadow-accent/10"
                      : "border-border bg-surface-elevated"
                  }`}
                >
                  <node.icon
                    weight="duotone"
                    className={`h-8 w-8 ${
                      node.highlight ? "text-accent" : "text-text-secondary"
                    }`}
                  />
                  <div className="text-center">
                    <div className="text-sm font-medium">{node.label}</div>
                    <div className="text-xs text-text-muted">{node.sublabel}</div>
                  </div>
                </div>
                {index < nodes.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-text-muted" />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {boundaries.map((boundary, index) => (
            <motion.div
              key={boundary.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                duration: 0.5,
                delay: 0.2 + index * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="rounded-xl border border-border bg-surface-card p-6"
            >
              <h3 className={`text-sm font-semibold ${boundary.color}`}>
                {boundary.title}
              </h3>
              <p className="mt-2 text-sm text-text-secondary">
                {boundary.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
