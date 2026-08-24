"use client";

import { useState } from "react";
import { motion } from "motion/react";
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
} from "@phosphor-icons/react";

type OrderStatus = "idle" | "loading" | "success" | "error";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

const demoProducts: Product[] = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Developer Toolkit Pro", price: 49.99, stock: 100 },
  { id: "22222222-2222-2222-2222-222222222222", name: "API Gateway License", price: 199.99, stock: 50 },
  { id: "44444444-4444-4444-4444-444444444444", name: "Last Unit Item (Race Test)", price: 29.99, stock: 1 },
];

export default function CheckoutPage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [status, setStatus] = useState<OrderStatus>("idle");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [clickCount, setClickCount] = useState(0);

  const generateKey = () => {
    const key = `idem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setIdempotencyKey(key);
    return key;
  };

  const handleCheckout = async () => {
    if (!selectedProduct) return;

    setClickCount((c) => c + 1);
    setStatus("loading");

    const key = idempotencyKey || generateKey();

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key,
        },
        body: JSON.stringify({
          user_id: "00000000-0000-0000-0000-000000000001",
          items: [{ product_id: selectedProduct.id, quantity: 1 }],
        }),
      });

      const data = await response.json();

      if (response.status === 201 || response.status === 200) {
        setStatus("success");
        setOrderId(data.id);
      } else {
        setStatus("error");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setStatus("error");
    }
  };

  const resetDemo = () => {
    setSelectedProduct(null);
    setStatus("idle");
    setOrderId(null);
    setIdempotencyKey("");
    setClickCount(0);
  };

  return (
    <main className="min-h-[100dvh] bg-surface-secondary pt-24 pb-16">
      {/* Floating gradient orbs */}
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="gradient-orb gradient-orb-orange w-[400px] h-[400px] -top-20 -right-20 fixed opacity-30"
      />
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="gradient-orb gradient-orb-coral w-[300px] h-[300px] bottom-20 -left-20 fixed opacity-30"
      />

      <div className="mx-auto max-w-4xl px-6 relative">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-light shadow-glow">
              <Lightning weight="fill" className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">
              Demo Checkout
            </h1>
          </div>
          <p className="text-text-secondary">
            Test idempotency and saga rollback with simulated payments
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-white p-6 shadow-card"
            >
              <h2 className="mb-4 text-lg font-semibold flex items-center gap-2 text-text-primary">
                <ShoppingCart weight="duotone" className="h-5 w-5 text-brand" />
                Select Product
              </h2>

              <div className="space-y-3">
                {demoProducts.map((product) => (
                  <motion.button
                    key={product.id}
                    whileHover={{ scale: 1.01, y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      setSelectedProduct(product);
                      generateKey();
                      setStatus("idle");
                      setClickCount(0);
                    }}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      selectedProduct?.id === product.id
                        ? "border-brand bg-brand-muted shadow-glow"
                        : "border-border bg-surface-secondary hover:border-brand/30 hover:shadow-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-text-primary">{product.name}</div>
                        <div className="text-sm text-text-muted">
                          Stock: {product.stock} units
                        </div>
                      </div>
                      <div className="text-xl font-bold gradient-text">
                        ${product.price}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {selectedProduct && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-white p-6 shadow-card"
              >
                <h2 className="mb-4 text-lg font-semibold flex items-center gap-2 text-text-primary">
                  <CreditCard weight="duotone" className="h-5 w-5 text-brand" />
                  Payment
                </h2>

                <div className="mb-6 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-secondary">
                      Idempotency Key
                    </label>
                    <input
                      type="text"
                      value={idempotencyKey}
                      readOnly
                      className="w-full rounded-xl border border-border bg-surface-secondary px-4 py-3 font-mono text-sm text-text-secondary focus:border-brand focus:outline-none"
                    />
                    <p className="mt-2 text-xs text-text-muted flex items-center gap-1">
                      <ShieldCheck weight="fill" className="h-3 w-3 text-brand" />
                      Same key = same result. Try clicking Pay multiple times!
                    </p>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCheckout}
                  disabled={status === "loading" || status === "success"}
                  className="w-full shimmer-btn rounded-xl bg-gradient-to-r from-brand to-brand-light px-6 py-4 font-semibold text-white transition-all hover:shadow-glow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === "loading" ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner className="h-5 w-5 animate-spin" />
                      Processing Saga...
                    </span>
                  ) : status === "success" ? (
                    <span className="flex items-center justify-center gap-2">
                      <Check weight="bold" className="h-5 w-5" />
                      Order Placed!
                    </span>
                  ) : (
                    `Pay $${selectedProduct.price}`
                  )}
                </motion.button>

                {clickCount > 1 && status !== "error" && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-center text-sm text-brand font-medium bg-brand-muted rounded-lg py-2"
                  >
                    Button clicked {clickCount}x with same key — Only 1 order created!
                  </motion.p>
                )}
              </motion.div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-border bg-white p-6 shadow-card"
            >
              <h3 className="mb-4 text-sm font-semibold text-text-muted uppercase tracking-wide">
                Order Status
              </h3>

              {status === "idle" && (
                <p className="text-text-muted">Select a product to begin</p>
              )}

              {status === "loading" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-brand">
                    <Spinner className="h-4 w-4 animate-spin" />
                    <span className="font-medium">Running saga...</span>
                  </div>
                  <div className="font-mono text-xs text-text-muted bg-surface-secondary rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <ArrowsClockwise className="h-3 w-3 animate-spin" />
                      reserve_inventory → charge_payment → confirm_order
                    </div>
                  </div>
                </div>
              )}

              {status === "success" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-brand">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-muted">
                      <Check weight="bold" className="h-4 w-4" />
                    </div>
                    <span className="font-semibold">Order confirmed!</span>
                  </div>
                  <div className="rounded-xl bg-surface-secondary p-4 border border-border">
                    <div className="text-xs text-text-muted mb-1">Order ID</div>
                    <div className="font-mono text-sm text-text-primary break-all">{orderId}</div>
                  </div>
                  <button
                    onClick={resetDemo}
                    className="w-full rounded-xl border border-border py-3 text-sm font-medium text-text-secondary hover:bg-surface-hover hover:border-brand/30 transition-all"
                  >
                    Start New Order
                  </button>
                </div>
              )}

              {status === "error" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-black">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black">
                      <Warning weight="fill" className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold">Saga rolled back</span>
                  </div>
                  <div className="rounded-xl bg-black text-white p-4 text-sm">
                    Payment step failed. Inventory released. No charge made.
                  </div>
                  <button
                    onClick={resetDemo}
                    className="w-full rounded-xl border border-border py-3 text-sm font-medium text-text-secondary hover:bg-surface-hover transition-all"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-brand/20 bg-brand-muted p-6"
            >
              <h3 className="mb-2 text-sm font-semibold text-brand">
                Sandbox Mode
              </h3>
              <p className="text-sm text-text-secondary">
                No real charges are made. This demo simulates the saga flow with
                random failures to demonstrate rollback.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl border border-border bg-white p-6 shadow-card"
            >
              <h3 className="mb-3 text-sm font-semibold text-text-primary">
                What to test:
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <Check weight="bold" className="h-4 w-4 text-brand mt-0.5" />
                  <span>Click Pay multiple times — same order returned</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check weight="bold" className="h-4 w-4 text-brand mt-0.5" />
                  <span>Enable chaos in admin to test rollback</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check weight="bold" className="h-4 w-4 text-brand mt-0.5" />
                  <span>Try "Last Unit" for race condition demo</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
