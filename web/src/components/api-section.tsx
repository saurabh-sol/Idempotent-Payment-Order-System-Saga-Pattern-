"use client";

import { motion } from "motion/react";

const endpoints = [
  { method: "GET", path: "/api/products", description: "List all products" },
  {
    method: "POST",
    path: "/api/orders",
    description: "Create order (Idempotency-Key required)",
  },
  { method: "GET", path: "/api/orders/{id}", description: "Get order status" },
  {
    method: "GET",
    path: "/api/orders/{id}/timeline",
    description: "Saga step audit trail",
  },
  { method: "GET", path: "/health", description: "Service health check" },
  { method: "GET", path: "/metrics", description: "Prometheus metrics" },
];

export function ApiSection() {
  return (
    <section id="api" className="relative py-24 border-t border-border-subtle">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            API Endpoints
          </h2>
          <p className="mt-4 text-text-secondary max-w-[50ch]">
            RESTful interface for orders, products, and observability.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden rounded-2xl border border-border bg-surface-card"
        >
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <span className="text-sm font-medium">Available Endpoints</span>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs text-emerald-400">Live</span>
            </div>
          </div>

          <div className="divide-y divide-border-subtle">
            {endpoints.map((endpoint, index) => (
              <motion.div
                key={endpoint.path}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex flex-wrap items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-hover"
              >
                <span
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                    endpoint.method === "GET"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-blue-500/10 text-blue-400"
                  }`}
                >
                  {endpoint.method}
                </span>
                <code className="text-sm text-text-secondary font-mono">
                  {endpoint.path}
                </code>
                <span className="ml-auto text-sm text-text-muted">
                  {endpoint.description}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
