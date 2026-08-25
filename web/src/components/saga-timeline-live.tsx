"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Clock, Warning } from "@phosphor-icons/react";

interface SagaStep {
  id: string;
  step_name: string;
  status: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

interface TimelineData {
  order_id: string;
  status: string;
  steps: SagaStep[];
}

interface SagaTimelineLiveProps {
  orderId: string | null;
  onStepsLoaded?: (steps: SagaStep[]) => void;
}

export function SagaTimelineLive({ orderId, onStepsLoaded }: SagaTimelineLiveProps) {
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setTimeline(null);
      return;
    }

    let cancelled = false;

    async function fetchTimeline() {
      setLoading(true);
      try {
        const res = await fetch(`/api/orders/${orderId}/timeline`);
        if (res.ok) {
          const data: TimelineData = await res.json();
          if (!cancelled) {
            setTimeline(data);
            onStepsLoaded?.(data.steps);
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTimeline();
    const interval = setInterval(fetchTimeline, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId, onStepsLoaded]);

  if (!orderId) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-secondary p-6 text-center">
        <Clock className="mx-auto h-8 w-8 text-text-muted mb-2" />
        <p className="text-sm text-text-muted">
          Complete a checkout to see the real saga audit log from the database
        </p>
      </div>
    );
  }

  if (loading && !timeline) {
    return (
      <div className="rounded-xl border border-border bg-white p-6 animate-pulse">
        <div className="h-4 bg-surface-secondary rounded w-1/3 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-surface-secondary rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!timeline) return null;

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-surface-secondary">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Audit Log (from Postgres)
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            timeline.status === "confirmed"
              ? "bg-black text-white"
              : timeline.status === "cancelled"
                ? "bg-brand text-white"
                : "bg-surface-secondary text-text-muted"
          }`}
        >
          {timeline.status}
        </span>
      </div>
      <div className="divide-y divide-border">
        {timeline.steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className="px-4 py-3"
          >
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-mono text-text-primary">
                {step.step_name}
              </code>
              <span
                className={`text-[10px] font-bold uppercase ${
                  step.status === "succeeded"
                    ? "text-black"
                    : step.status === "failed"
                      ? "text-brand"
                      : step.status === "compensated"
                        ? "text-text-muted"
                        : step.status === "started"
                          ? "text-brand"
                          : "text-text-muted"
                }`}
              >
                {step.status}
              </span>
            </div>
            {step.error_message && (
              <div className="mt-1 flex items-start gap-1 text-xs text-brand">
                <Warning className="h-3 w-3 shrink-0 mt-0.5" />
                {step.error_message}
              </div>
            )}
            <div className="mt-1 text-[10px] text-text-muted font-mono">
              {new Date(step.created_at).toLocaleTimeString()}
              {step.completed_at &&
                ` → ${new Date(step.completed_at).toLocaleTimeString()}`}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
