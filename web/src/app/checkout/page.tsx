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
} from "@phosphor-icons/react";

type OrderStatus = "idle" | "loading" | "success" | "error";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

const demoProducts: Product[] = [
  { id: "prod_001", name: "Developer Toolkit Pro", price: 49.99, stock: 10 },
  { id: "prod_002", name: "API Gateway License", price: 199.99, stock: 5 },
  { id: "prod_003", name: "Last Unit Item (Race Test)", price: 29.99, stock: 1 },
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

    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (Math.random() > 0.2) {
      setStatus("success");
      setOrderId(`ord_${Math.random().toString(36).slice(2, 11)}`);
    } else {
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
    <main className="min-h-[100dvh] bg-surface pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-6">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-semibold tracking-tight">
            Demo Checkout
          </h1>
          <p className="mt-2 text-text-secondary">
            Test idempotency and saga rollback with simulated payments
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-surface-card p-6"
            >
              <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
                <ShoppingCart weight="duotone" className="h-5 w-5 text-accent" />
                Select Product
              </h2>

              <div className="space-y-3">
                {demoProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      setSelectedProduct(product);
                      generateKey();
                      setStatus("idle");
                      setClickCount(0);
                    }}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      selectedProduct?.id === product.id
                        ? "border-accent bg-accent/5"
                        : "border-border bg-surface-elevated hover:border-text-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-text-muted">
                          Stock: {product.stock} units
                        </div>
                      </div>
                      <div className="text-lg font-semibold">
                        ${product.price}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            {selectedProduct && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-surface-card p-6"
              >
                <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
                  <CreditCard weight="duotone" className="h-5 w-5 text-accent" />
                  Payment
                </h2>

                <div className="mb-6 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-text-secondary">
                      Idempotency Key
                    </label>
                    <input
                      type="text"
                      value={idempotencyKey}
                      readOnly
                      className="w-full rounded-lg border border-border bg-surface-elevated px-4 py-3 font-mono text-sm text-text-secondary"
                    />
                    <p className="mt-1 text-xs text-text-muted">
                      Same key = same result. Try clicking Pay multiple times.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={status === "loading" || status === "success"}
                  className="w-full rounded-xl bg-gradient-to-r from-accent to-[#00a8cc] px-6 py-4 font-medium text-surface transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {status === "loading" ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner className="h-5 w-5 animate-spin" />
                      Processing...
                    </span>
                  ) : status === "success" ? (
                    <span className="flex items-center justify-center gap-2">
                      <Check weight="bold" className="h-5 w-5" />
                      Order Placed
                    </span>
                  ) : (
                    `Pay $${selectedProduct.price}`
                  )}
                </button>

                {clickCount > 1 && status !== "error" && (
                  <p className="mt-3 text-center text-sm text-amber-400">
                    Button clicked {clickCount}x with same key. Only 1 order created.
                  </p>
                )}
              </motion.div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-border bg-surface-card p-6"
            >
              <h3 className="mb-4 text-sm font-semibold text-text-secondary uppercase tracking-wide">
                Order Status
              </h3>

              {status === "idle" && (
                <p className="text-text-muted">Select a product to begin</p>
              )}

              {status === "loading" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Spinner className="h-4 w-4 animate-spin" />
                    Running saga...
                  </div>
                  <div className="font-mono text-xs text-text-muted">
                    reserve_inventory → charge_payment → confirm_order
                  </div>
                </div>
              )}

              {status === "success" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Check weight="bold" className="h-4 w-4" />
                    Order confirmed
                  </div>
                  <div className="rounded-lg bg-surface-elevated p-3">
                    <div className="text-xs text-text-muted">Order ID</div>
                    <div className="font-mono text-sm">{orderId}</div>
                  </div>
                  <button
                    onClick={resetDemo}
                    className="w-full rounded-lg border border-border py-2 text-sm text-text-secondary hover:bg-surface-hover"
                  >
                    Start New Order
                  </button>
                </div>
              )}

              {status === "error" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-red-400">
                    <Warning weight="fill" className="h-4 w-4" />
                    Saga rolled back
                  </div>
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                    Payment step failed. Inventory released. No charge made.
                  </div>
                  <button
                    onClick={resetDemo}
                    className="w-full rounded-lg border border-border py-2 text-sm text-text-secondary hover:bg-surface-hover"
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
              className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6"
            >
              <h3 className="mb-2 text-sm font-semibold text-amber-400">
                Sandbox Mode
              </h3>
              <p className="text-sm text-text-secondary">
                No real charges are made. This demo simulates the saga flow with
                random failures to demonstrate rollback.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
