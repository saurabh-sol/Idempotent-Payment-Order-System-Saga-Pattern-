"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingCart,
  CreditCard,
  Check,
  Warning,
  Spinner,
  Lightning,
  ShieldCheck,
  ArrowsClockwise,
  Flask,
  Repeat,
  Users,
  CaretRight,
} from "@phosphor-icons/react";
import {
  SagaPipeline,
  type PipelineStepState,
} from "@/components/saga-pipeline";
import { SagaTimelineLive } from "@/components/saga-timeline-live";
import { fetchProducts, fetchStripeConfig, type StripeConfig } from "@/lib/api";

type OrderStatus = "idle" | "loading" | "success" | "error";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  tag?: string;
}

interface DemoScenario {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof ShoppingCart;
  productId: string;
  explain: string;
  tip: string;
  enableChaos?: string;
}

const RACE_PRODUCT_ID = "44444444-4444-4444-4444-444444444444";

const scenarios: DemoScenario[] = [
  {
    id: "happy",
    title: "Normal Checkout",
    subtitle: "See the full 3-step saga succeed",
    icon: ShoppingCart,
    productId: "11111111-1111-1111-1111-111111111111",
    explain:
      "Watch inventory get reserved, payment charged, and order confirmed — step by step.",
    tip: "Click Pay once. All 3 saga steps should turn green (done).",
  },
  {
    id: "idempotency",
    title: "Double-Click Test",
    subtitle: "Prove no double-charge happens",
    icon: Repeat,
    productId: "22222222-2222-2222-2222-222222222222",
    explain:
      "Same Idempotency-Key is sent with every click. The server returns the SAME order — never creates a second charge.",
    tip: "Click Pay 3–5 times fast. Request count goes up, but only 1 order is created.",
  },
  {
    id: "rollback",
    title: "Failure + Rollback",
    subtitle: "See automatic compensation",
    icon: Flask,
    productId: "11111111-1111-1111-1111-111111111111",
    explain:
      "Chaos mode forces payment to fail. The saga automatically undoes inventory reservation — no money lost.",
    tip: "Chaos is auto-enabled. If payment fails, watch compensation steps run.",
    enableChaos: "charge_payment",
  },
  {
    id: "race",
    title: "Last Unit Race",
    subtitle: "Only 1 buyer wins",
    icon: Users,
    productId: "44444444-4444-4444-4444-444444444444",
    explain:
      "Only 1 item in stock. If two users checkout at the same time, database locking ensures exactly one wins.",
    tip: "Open two browser tabs, both select this product, click Pay simultaneously.",
  },
];

function buildPipelineFromTimeline(
  steps: { step_name: string; status: string }[]
): Record<string, PipelineStepState> {
  const states: Record<string, PipelineStepState> = {
    reserve_inventory: "idle",
    charge_payment: "idle",
    confirm_order: "idle",
  };

  for (const step of steps) {
    if (step.step_name.startsWith("compensate_")) {
      const base = step.step_name.replace("compensate_", "");
      if (states[base] !== undefined) {
        if (step.status === "compensated" || step.status === "succeeded") {
          states[base] = "undone";
        } else if (step.status === "started") {
          states[base] = "compensating";
        }
      }
      continue;
    }

    if (states[step.step_name] === undefined) continue;

    if (step.status === "succeeded") {
      states[step.step_name] = "done";
    } else if (step.status === "failed") {
      states[step.step_name] = "failed";
    } else if (step.status === "started") {
      states[step.step_name] = "running";
    }
  }

  return states;
}

export default function CheckoutPage() {
  const [activeScenario, setActiveScenario] = useState<string>("happy");
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stripeConfig, setStripeConfig] = useState<StripeConfig | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [status, setStatus] = useState<OrderStatus>("idle");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [clickCount, setClickCount] = useState(0);
  const [requestLog, setRequestLog] = useState<
    { time: string; status: number; note: string }[]
  >([]);
  const [pipelineStates, setPipelineStates] = useState<
    Record<string, PipelineStepState>
  >({
    reserve_inventory: "idle",
    charge_payment: "idle",
    confirm_order: "idle",
  });
  const [chaosEnabled, setChaosEnabled] = useState(false);
  const [userId, setUserId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    generateKey();
    fetchStripeConfig().then(setStripeConfig).catch(console.error);
  }, []);

  useEffect(() => {
    fetchProducts()
      .then((apiProducts) => {
        const mapped: Product[] = apiProducts.map((p) => ({
          id: p.id,
          name: p.name,
          price: parseFloat(p.price),
          stock: p.available_qty,
          tag: p.id === RACE_PRODUCT_ID ? "Race condition test" : undefined,
        }));
        setProducts(mapped);
        const defaultScenario = scenarios.find((s) => s.id === "happy")!;
        const defaultProduct =
          mapped.find((p) => p.id === defaultScenario.productId) ?? mapped[0] ?? null;
        setSelectedProduct(defaultProduct);
      })
      .catch(console.error)
      .finally(() => setProductsLoading(false));
  }, []);

  const currentScenario = scenarios.find((s) => s.id === activeScenario)!;

  const generateKey = () => {
    const key = `idem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setIdempotencyKey(key);
    return key;
  };

  const setChaos = async (enabled: boolean, failStep?: string) => {
    try {
      await fetch("/api/admin/chaos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          fail_step: failStep ?? null,
          failure_mode: "always",
        }),
      });
      setChaosEnabled(enabled);
    } catch {
      /* ignore */
    }
  };

  const selectScenario = async (scenario: DemoScenario) => {
    setActiveScenario(scenario.id);
    const product = products.find((p) => p.id === scenario.productId);
    if (product) setSelectedProduct(product);
    generateKey();
    setStatus("idle");
    setOrderId(null);
    setClickCount(0);
    setRequestLog([]);
    setPipelineStates({
      reserve_inventory: "idle",
      charge_payment: "idle",
      confirm_order: "idle",
    });

    if (scenario.enableChaos) {
      await setChaos(true, scenario.enableChaos);
    } else {
      await setChaos(false);
    }
  };

  const handleTimelineLoaded = useCallback(
    (steps: { step_name: string; status: string }[]) => {
      setPipelineStates(buildPipelineFromTimeline(steps));
    },
    []
  );

  const handleCheckout = async () => {
    if (!selectedProduct) return;

    setClickCount((c) => c + 1);
    setStatus("loading");
    setPaymentIntentId(null);

    setPipelineStates({
      reserve_inventory: "running",
      charge_payment: "idle",
      confirm_order: "idle",
    });

    const key = idempotencyKey || generateKey();
    const startTime = new Date().toLocaleTimeString();

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key,
        },
        body: JSON.stringify({
          user_id: userId,
          items: [{ product_id: selectedProduct.id, quantity: 1 }],
        }),
      });

      const data = await response.json();

      setRequestLog((prev) => [
        ...prev,
        {
          time: startTime,
          status: response.status,
          note:
            response.status === 201
              ? "New order created"
              : response.status === 200
                ? "Same order returned (idempotent)"
                : response.status === 409
                  ? "Conflict — duplicate in progress"
                  : `Order ${data.status ?? "failed"}`,
        },
        ...prev,
      ]);

      if (response.status === 201 || response.status === 200) {
        setStatus(data.status === "cancelled" ? "error" : "success");
        setOrderId(data.id);
        setPaymentIntentId(data.payment?.gateway_txn_id ?? null);
      } else {
        setStatus("error");
        if (data.id) setOrderId(data.id);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setStatus("error");
      setRequestLog((prev) => [
        { time: startTime, status: 0, note: "Network error" },
        ...prev,
      ]);
    }
  };

  const resetDemo = async () => {
    setStatus("idle");
    setOrderId(null);
    setPaymentIntentId(null);
    setUserId(crypto.randomUUID());
    setClickCount(0);
    setRequestLog([]);
    generateKey();
    setPipelineStates({
      reserve_inventory: "idle",
      charge_payment: "idle",
      confirm_order: "idle",
    });
    if (currentScenario.enableChaos) {
      await setChaos(true, currentScenario.enableChaos);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-white pt-24 pb-16">
      <div className="mx-auto max-w-6xl px-6">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-brand transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        {/* Header + Problem statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
              <Lightning weight="fill" className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
                Interactive Saga Lab
              </h1>
              <p className="text-sm text-text-secondary">
                See exactly what happens behind every payment
              </p>
              {stripeConfig?.enabled && (
                <p className="text-xs text-brand font-medium mt-1">
                  Stripe Test Mode — real PaymentIntents, no real money charged
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-4 bg-surface-secondary">
              <div className="text-xs font-bold uppercase tracking-wide text-brand mb-1">
                Problem 1
              </div>
              <p className="text-sm font-semibold text-text-primary">
                Double charge
              </p>
              <p className="text-xs text-text-muted mt-1">
                User clicks Pay twice → network retries → 2 payments.{" "}
                <span className="text-brand font-medium">
                  Fixed by Idempotency Key.
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-surface-secondary">
              <div className="text-xs font-bold uppercase tracking-wide text-brand mb-1">
                Problem 2
              </div>
              <p className="text-sm font-semibold text-text-primary">
                Partial failure
              </p>
              <p className="text-xs text-text-muted mt-1">
                Payment succeeds but order fails → money gone.{" "}
                <span className="text-brand font-medium">
                  Fixed by Saga rollback.
                </span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Scenario picker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted mb-3">
            Pick a scenario
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => selectScenario(scenario)}
                className={`rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
                  activeScenario === scenario.id
                    ? "border-brand bg-brand-muted shadow-glow"
                    : "border-border bg-white hover:border-brand/30"
                }`}
              >
                <scenario.icon
                  weight="duotone"
                  className={`h-6 w-6 mb-2 ${
                    activeScenario === scenario.id
                      ? "text-brand"
                      : "text-text-muted"
                  }`}
                />
                <div className="font-semibold text-sm text-text-primary">
                  {scenario.title}
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  {scenario.subtitle}
                </div>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeScenario}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 rounded-xl border border-brand/20 bg-brand-muted p-4"
            >
              <p className="text-sm text-text-primary">{currentScenario.explain}</p>
              <p className="text-xs text-brand font-medium mt-2 flex items-center gap-1">
                <CaretRight weight="bold" className="h-3 w-3" />
                {currentScenario.tip}
              </p>
              {chaosEnabled && (
                <p className="text-xs text-black font-medium mt-2 flex items-center gap-1">
                  <Flask weight="fill" className="h-3 w-3" />
                  Chaos mode ON — payment step will fail
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Main grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Action panel */}
          <div className="space-y-6">
            {/* Product card */}
            {productsLoading && (
              <div className="rounded-2xl border border-border bg-white p-6 shadow-card flex items-center justify-center gap-2 text-text-muted">
                <Spinner className="h-5 w-5 animate-spin" />
                Loading products from API...
              </div>
            )}
            {!productsLoading && !selectedProduct && (
              <div className="rounded-2xl border border-border bg-surface-secondary p-6 text-center text-sm text-text-muted">
                No products available. Make sure the API is running.
              </div>
            )}
            {selectedProduct && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-white p-6 shadow-card"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-semibold text-text-primary">
                      {selectedProduct.name}
                    </div>
                    <div className="text-sm text-text-muted">
                      Stock: {selectedProduct.stock} units
                      {selectedProduct.tag && (
                        <span className="ml-2 text-brand font-medium">
                          · {selectedProduct.tag}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-brand">
                    ${selectedProduct.price}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Idempotency Key (sent with every request)
                  </label>
                  <input
                    type="text"
                    value={idempotencyKey}
                    readOnly
                    className="w-full rounded-lg border border-border bg-surface-secondary px-3 py-2 font-mono text-xs text-text-secondary"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: status === "idle" ? 1.01 : 1 }}
                  whileTap={{ scale: status === "idle" ? 0.99 : 1 }}
                  onClick={handleCheckout}
                  disabled={status === "loading"}
                  className="w-full shimmer-btn rounded-xl bg-brand px-6 py-4 font-semibold text-white transition-all hover:shadow-glow disabled:opacity-60"
                >
                  {status === "loading" ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner className="h-5 w-5 animate-spin" />
                      Running Saga...
                    </span>
                  ) : status === "success" ? (
                    <span className="flex items-center justify-center gap-2">
                      <Check weight="bold" className="h-5 w-5" />
                      Done — click again to test idempotency
                    </span>
                  ) : status === "error" ? (
                    <span className="flex items-center justify-center gap-2">
                      <Warning weight="fill" className="h-5 w-5" />
                      Rolled back — Try Again
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <CreditCard weight="fill" className="h-5 w-5" />
                      Pay ${selectedProduct.price}
                    </span>
                  )}
                </motion.button>

                {/* Stats row */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-surface-secondary p-3 text-center">
                    <div className="text-2xl font-bold text-text-primary">
                      {clickCount}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-text-muted">
                      Pay clicks
                    </div>
                  </div>
                  <div className="rounded-lg bg-surface-secondary p-3 text-center">
                    <div className="text-2xl font-bold text-brand">
                      {orderId ? 1 : 0}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-text-muted">
                      Orders created
                    </div>
                  </div>
                </div>

                {clickCount > 1 && orderId && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 text-center text-xs font-medium text-brand bg-brand-muted rounded-lg py-2"
                  >
                    {clickCount} clicks, 1 order — idempotency working!
                  </motion.p>
                )}

                {(status === "success" || status === "error") && (
                  <button
                    onClick={resetDemo}
                    className="mt-3 w-full rounded-lg border border-border py-2 text-sm text-text-secondary hover:bg-surface-hover transition-all"
                  >
                    Reset & start fresh
                  </button>
                )}
              </motion.div>
            )}

            {/* Request log */}
            {requestLog.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-white p-4 shadow-card"
              >
                <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  HTTP Request Log
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {requestLog.map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs font-mono"
                    >
                      <span className="text-text-muted">{entry.time}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 font-bold ${
                          entry.status === 201
                            ? "bg-black text-white"
                            : entry.status === 200
                              ? "bg-brand text-white"
                              : "bg-surface-secondary text-text-muted"
                        }`}
                      >
                        {entry.status || "ERR"}
                      </span>
                      <span className="text-text-secondary truncate">
                        {entry.note}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right: Behind the scenes */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-border bg-white p-6 shadow-card"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted mb-4 flex items-center gap-2">
                <ArrowsClockwise className="h-4 w-4 text-brand" />
                Live Saga Pipeline
              </h3>
              <SagaPipeline
                stepStates={pipelineStates}
                showCompensation={status === "error"}
              />
            </motion.div>

            <SagaTimelineLive
              orderId={orderId}
              onStepsLoaded={handleTimelineLoaded}
            />

            {orderId && (
              <div className="rounded-xl border border-border bg-surface-secondary p-4 space-y-3">
                <div>
                  <div className="text-xs text-text-muted mb-1">Order ID</div>
                  <code className="text-xs font-mono text-text-primary break-all">
                    {orderId}
                  </code>
                </div>
                {paymentIntentId && (
                  <div>
                    <div className="text-xs text-text-muted mb-1">
                      Stripe PaymentIntent
                    </div>
                    <code className="text-xs font-mono text-text-primary break-all">
                      {paymentIntentId}
                    </code>
                    {stripeConfig?.dashboard_url && (
                      <a
                        href={`${stripeConfig.dashboard_url}/${paymentIntentId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs font-medium text-brand hover:underline"
                      >
                        View in Stripe Dashboard →
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
