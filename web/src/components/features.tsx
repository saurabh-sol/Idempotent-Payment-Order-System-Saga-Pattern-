"use client";

import { motion } from "motion/react";
import {
  Shield,
  ArrowsClockwise,
  Clock,
  Warning,
  CreditCard,
  Robot,
} from "@phosphor-icons/react";

const features = [
  {
    icon: Shield,
    title: "Idempotency Layer",
    description:
      "Same request, same result. Redis fast path plus Postgres unique constraint as the real lock.",
    accent: true,
  },
  {
    icon: ArrowsClockwise,
    title: "Saga Orchestration",
    description:
      "Multi-step transactions with automatic compensating rollback when later steps fail.",
    accent: false,
  },
  {
    icon: Clock,
    title: "Audit Timeline",
    description:
      "Every saga step logged. Full visibility into what happened, when, and why.",
    accent: false,
  },
  {
    icon: Warning,
    title: "Anomaly Detection",
    description:
      "Real-time flagging of retry storms, burst buying, and suspicious patterns.",
    accent: false,
  },
  {
    icon: CreditCard,
    title: "Stripe Integration",
    description:
      "Real PaymentIntents, refunds, and signed webhooks. Not mock stubs.",
    accent: false,
  },
  {
    icon: Robot,
    title: "AI Agent Ready",
    description:
      "Tool-calling interface for LLM agents with deterministic idempotency key generation.",
    accent: false,
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-24 border-t border-border-subtle">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for real-world reliability
          </h2>
          <p className="mt-4 text-text-secondary max-w-[50ch]">
            Every edge case handled. Every failure recoverable.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                duration: 0.5,
                delay: index * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`group relative rounded-2xl border border-border bg-surface-card p-6 transition-all hover:border-border hover:bg-surface-hover card-glow ${
                feature.accent ? "lg:col-span-2" : ""
              }`}
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${
                  feature.accent
                    ? "bg-gradient-to-br from-accent/20 to-accent/5"
                    : "bg-surface-elevated"
                }`}
              >
                <feature.icon
                  weight="duotone"
                  className={`h-6 w-6 ${
                    feature.accent ? "text-accent" : "text-text-secondary"
                  }`}
                />
              </div>

              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-text-secondary">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
