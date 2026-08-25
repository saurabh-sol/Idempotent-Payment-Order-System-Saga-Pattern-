"use client";

import { motion } from "motion/react";
import {
  Package,
  CreditCard,
  CheckCircle,
  ArrowDown,
  ArrowsClockwise,
} from "@phosphor-icons/react";

export type PipelineStepState =
  | "idle"
  | "running"
  | "done"
  | "failed"
  | "compensating"
  | "undone";

interface PipelineStep {
  id: string;
  label: string;
  description: string;
  compensate?: string;
  icon: typeof Package;
}

const SAGA_STEPS: PipelineStep[] = [
  {
    id: "reserve_inventory",
    label: "Reserve Inventory",
    description: "Lock stock so nobody else can buy the last unit",
    compensate: "Release Inventory",
    icon: Package,
  },
  {
    id: "charge_payment",
    label: "Charge Payment",
    description: "Create Stripe PaymentIntent (test mode)",
    compensate: "Refund Payment",
    icon: CreditCard,
  },
  {
    id: "confirm_order",
    label: "Confirm Order",
    description: "Mark order as confirmed in database",
    compensate: "Cancel Order",
    icon: CheckCircle,
  },
];

interface SagaPipelineProps {
  stepStates: Record<string, PipelineStepState>;
  showCompensation?: boolean;
}

export function SagaPipeline({ stepStates, showCompensation }: SagaPipelineProps) {
  return (
    <div className="space-y-0">
      {SAGA_STEPS.map((step, index) => {
        const state = stepStates[step.id] ?? "idle";
        const isActive = state === "running";
        const isDone = state === "done";
        const isFailed = state === "failed";
        const isUndone = state === "undone";

        return (
          <div key={step.id}>
            <motion.div
              layout
              className={`relative rounded-xl border p-4 transition-all duration-300 ${
                isActive
                  ? "border-brand bg-brand-muted shadow-glow"
                  : isDone
                    ? "border-black bg-white"
                    : isFailed
                      ? "border-black bg-black text-white"
                      : isUndone
                        ? "border-border bg-surface-secondary opacity-60"
                        : "border-border bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isActive || isDone
                      ? "bg-brand text-white"
                      : isFailed
                        ? "bg-brand text-white"
                        : "bg-surface-secondary text-text-muted"
                  }`}
                >
                  {isActive ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <ArrowsClockwise className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <step.icon weight="duotone" className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm">{step.label}</span>
                    <StepBadge state={state} />
                  </div>
                  <p
                    className={`mt-1 text-xs leading-relaxed ${
                      isFailed ? "text-white/70" : "text-text-muted"
                    }`}
                  >
                    {step.description}
                  </p>
                  {showCompensation && isFailed && step.compensate && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-2 flex items-center gap-1.5 text-xs text-brand font-medium"
                    >
                      <ArrowsClockwise className="h-3 w-3" />
                      Undo: {step.compensate}
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>

            {index < SAGA_STEPS.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowDown
                  className={`h-4 w-4 ${
                    isDone ? "text-brand" : "text-border"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepBadge({ state }: { state: PipelineStepState }) {
  const styles: Record<PipelineStepState, string> = {
    idle: "bg-surface-secondary text-text-muted",
    running: "bg-brand text-white",
    done: "bg-black text-white",
    failed: "bg-brand text-white",
    compensating: "bg-black text-white",
    undone: "bg-surface-secondary text-text-muted line-through",
  };

  const labels: Record<PipelineStepState, string> = {
    idle: "Waiting",
    running: "Running",
    done: "Done",
    failed: "Failed",
    compensating: "Rolling back",
    undone: "Undone",
  };

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[state]}`}
    >
      {labels[state]}
    </span>
  );
}

export { SAGA_STEPS };
