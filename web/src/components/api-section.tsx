"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Copy, Check, Code, Terminal, BookOpen } from "@phosphor-icons/react";

const endpoints = [
  { method: "GET", path: "/api/products", description: "List all products with inventory" },
  { method: "POST", path: "/api/orders", description: "Create order (Idempotency-Key header required)" },
  { method: "GET", path: "/api/orders/{id}", description: "Get order status and details" },
  { method: "GET", path: "/api/orders/{id}/timeline", description: "Saga step audit trail" },
  { method: "POST", path: "/api/admin/chaos", description: "Enable/disable chaos testing" },
  { method: "GET", path: "/api/anomalies", description: "List anomaly detection flags" },
  { method: "GET", path: "/health", description: "Service health check" },
];

const codeExamples = {
  curl: `curl -X POST http://localhost:8000/api/orders \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order-123-abc" \\
  -d '{
    "user_id": "user-001",
    "items": [
      {"product_id": "11111111-1111-1111-1111-111111111111", "quantity": 1}
    ]
  }'`,
  response: `{
  "id": "ord_abc123",
  "status": "confirmed",
  "total_amount": "49.99",
  "items": [...],
  "payment": {
    "stripe_payment_intent_id": "pi_xxx",
    "status": "succeeded"
  }
}`,
};

export function ApiSection() {
  const [activeTab, setActiveTab] = useState<"curl" | "response">("curl");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExamples[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="api" className="relative py-24 bg-surface-secondary">
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
            API Reference
          </motion.span>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
            Simple <span className="gradient-text">RESTful</span> Interface
          </h2>
          <p className="mt-4 text-lg text-text-secondary max-w-[50ch] mx-auto">
            Clean endpoints for orders, products, and observability.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Endpoints List */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="rounded-2xl border border-border bg-white shadow-card overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-secondary">
              <div className="flex items-center gap-2">
                <BookOpen weight="duotone" className="h-5 w-5 text-brand" />
                <span className="font-semibold text-text-primary">Endpoints</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                </span>
                <span className="text-xs font-medium text-brand">Live</span>
              </div>
            </div>

            <div className="divide-y divide-border">
              {endpoints.map((endpoint, index) => (
                <motion.div
                  key={endpoint.path}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="group flex flex-wrap items-center gap-3 px-6 py-4 transition-all hover:bg-surface-hover cursor-pointer"
                >
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                      endpoint.method === "GET"
                        ? "bg-black text-white"
                        : "bg-brand text-white"
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <code className="text-sm text-text-primary font-mono font-medium group-hover:text-brand transition-colors">
                    {endpoint.path}
                  </code>
                  <span className="w-full sm:w-auto sm:ml-auto text-sm text-text-muted">
                    {endpoint.description}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Code Example */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-2xl border border-border bg-white shadow-card overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-secondary">
              <div className="flex items-center gap-2">
                <Code weight="duotone" className="h-5 w-5 text-brand" />
                <span className="font-semibold text-text-primary">Example</span>
              </div>
              
              {/* Tabs */}
              <div className="flex items-center gap-1 rounded-lg bg-surface-tertiary p-1">
                {(["curl", "response"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      activeTab === tab
                        ? "text-white"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {activeTab === tab && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-brand rounded-md"
                        transition={{ type: "spring", duration: 0.3 }}
                      />
                    )}
                    <span className="relative z-10 capitalize">
                      {tab === "curl" ? "Request" : "Response"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="bg-[#1a1a1a] p-6 overflow-x-auto">
                <pre className="text-sm text-gray-300 font-mono leading-relaxed">
                  <code>{codeExamples[activeTab]}</code>
                </pre>
              </div>
              
              {/* Copy button */}
              <button
                onClick={handleCopy}
                className="absolute top-4 right-4 flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition-all"
              >
                {copied ? (
                  <>
                    <Check weight="bold" className="h-3.5 w-3.5 text-brand" />
                    <span className="text-brand">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy weight="bold" className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Tip */}
            <div className="px-6 py-4 bg-brand-muted border-t border-brand/20">
              <p className="text-sm text-brand flex items-center gap-2">
                <Terminal weight="duotone" className="h-4 w-4" />
                <span>
                  <strong>Tip:</strong> Same Idempotency-Key = Same result. Try sending twice!
                </span>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
