"use client";

import { motion } from "motion/react";
import {
  User,
  ArrowRight,
  Database,
  Lightning,
  CreditCard,
  ShieldCheck,
  ArrowsClockwise,
  Cube,
} from "@phosphor-icons/react";

const flowSteps = [
  { icon: User, label: "Request", sublabel: "Client / Agent", color: "bg-black" },
  { icon: ShieldCheck, label: "Idempotency", sublabel: "Check Key", color: "bg-brand" },
  { icon: ArrowsClockwise, label: "Saga", sublabel: "Orchestrator", color: "bg-brand" },
  { icon: CreditCard, label: "Stripe", sublabel: "Payment", color: "bg-black" },
  { icon: Database, label: "Postgres", sublabel: "Commit", color: "bg-black" },
];

const dataStores = [
  { icon: Lightning, label: "Redis", description: "Fast path idempotency check", color: "text-brand" },
  { icon: Database, label: "PostgreSQL", description: "Authoritative state & audit log", color: "text-black" },
  { icon: Cube, label: "Kafka", description: "Event streaming & outbox", color: "text-brand" },
];

export function Architecture() {
  return (
    <section id="architecture" className="relative py-24 bg-white">
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
            Architecture
          </motion.span>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
            How it <span className="gradient-text">works</span>
          </h2>
          <p className="mt-4 text-lg text-text-secondary max-w-[50ch] mx-auto">
            Every request flows through idempotency checks, saga orchestration, and automatic compensation.
          </p>
        </motion.div>

        {/* Animated Flow Diagram */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-2xl border border-border bg-surface-secondary p-8 md:p-12 mb-12"
        >
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
            {flowSteps.map((step, index) => (
              <div key={step.label} className="flex items-center gap-2 md:gap-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-white p-4 md:p-6 shadow-card transition-all hover:shadow-card-hover hover:border-brand/30"
                >
                  <div className={`flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-xl ${step.color} shadow-lg`}>
                    <step.icon weight="fill" className="h-6 w-6 md:h-7 md:w-7 text-white" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-text-primary">{step.label}</div>
                    <div className="text-xs text-text-muted">{step.sublabel}</div>
                  </div>
                </motion.div>
                
                {index < flowSteps.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    whileInView={{ opacity: 1, scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.15 + 0.1 }}
                    className="relative"
                  >
                    <ArrowRight className="h-5 w-5 md:h-6 md:w-6 text-brand" />
                    {/* Pulsing dot on arrow */}
                    <motion.div
                      animate={{ x: [0, 20, 0], opacity: [0, 1, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                      className="absolute top-1/2 left-0 -translate-y-1/2 w-2 h-2 rounded-full bg-brand"
                    />
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          {/* Flow description */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-text-muted">
              <span className="text-brand font-semibold">Idempotency</span> checks prevent duplicates
              <span className="mx-2">|</span>
              <span className="text-brand font-semibold">Saga</span> handles multi-step transactions
              <span className="mx-2">|</span>
              <span className="text-brand font-semibold">Compensation</span> auto-rollback on failure
            </p>
          </motion.div>
        </motion.div>

        {/* Data Stores */}
        <div className="grid gap-6 md:grid-cols-3">
          {dataStores.map((store, index) => (
            <motion.div
              key={store.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ y: -5 }}
              className="group rounded-2xl border border-border bg-white p-6 transition-all hover:shadow-card-hover hover:border-brand/30"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-secondary group-hover:bg-brand-muted transition-colors">
                  <store.icon weight="duotone" className={`h-6 w-6 ${store.color} group-hover:text-brand transition-colors`} />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary group-hover:text-brand transition-colors">
                    {store.label}
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    {store.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Saga Steps Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 rounded-2xl border border-border bg-surface-secondary p-8"
        >
          <h3 className="text-lg font-semibold text-text-primary mb-6 text-center">
            Saga Transaction Flow
          </h3>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            {[
              { step: "1", label: "Reserve Inventory", undo: "Release Inventory" },
              { step: "2", label: "Charge Payment", undo: "Refund Payment" },
              { step: "3", label: "Confirm Order", undo: "Cancel Order" },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + index * 0.15 }}
                className="flex items-center gap-4"
              >
                <div className="relative">
                  <div className="w-48 rounded-xl border border-border bg-white p-4 shadow-card">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">
                        {item.step}
                      </span>
                      <span className="text-sm font-semibold text-text-primary">{item.label}</span>
                    </div>
                    <div className="text-xs text-text-muted flex items-center gap-1">
                      <ArrowsClockwise className="h-3 w-3" />
                      <span>Undo: {item.undo}</span>
                    </div>
                  </div>
                  {/* Connection line */}
                  {index < 2 && (
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="hidden md:block absolute top-1/2 -right-4 w-4 h-0.5 bg-brand"
                    />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
