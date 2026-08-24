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
    <section id="features" className="relative py-24 bg-surface-secondary">
      <div className="section-divider absolute top-0 left-0 right-0" />
      
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 text-center"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block mb-4 px-4 py-1.5 rounded-full bg-brand-muted text-brand text-sm font-semibold"
          >
            Features
          </motion.span>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
            Built for{" "}
            <span className="gradient-text">real-world reliability</span>
          </h2>
          <p className="mt-4 text-lg text-text-secondary max-w-[50ch] mx-auto">
            Every edge case handled. Every failure recoverable.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={{ y: -5 }}
              className={`group relative rounded-2xl border border-border bg-white p-6 transition-all duration-300 hover:shadow-card-hover hover:border-brand/30 ${
                feature.accent ? "lg:col-span-2" : ""
              }`}
            >
              <div
                className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 ${
                  feature.accent
                    ? "bg-gradient-to-br from-brand to-brand-light shadow-glow"
                    : "bg-surface-secondary group-hover:bg-brand-muted"
                }`}
              >
                <feature.icon
                  weight="duotone"
                  className={`h-7 w-7 transition-colors duration-300 ${
                    feature.accent ? "text-white" : "text-text-secondary group-hover:text-brand"
                  }`}
                />
              </div>

              <h3 className="mb-2 text-xl font-semibold text-text-primary group-hover:text-brand transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-text-secondary">
                {feature.description}
              </p>

              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand/0 to-brand/0 opacity-0 group-hover:opacity-100 group-hover:from-brand/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
              
              {/* Corner accent */}
              <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-brand/0 group-hover:bg-brand transition-all duration-300" />
            </motion.div>
          ))}
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {[
            { value: "99.99%", label: "Uptime SLA" },
            { value: "<50ms", label: "P99 Latency" },
            { value: "0", label: "Double Charges" },
            { value: "100%", label: "Auto Rollback" },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold gradient-text">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-text-muted">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
