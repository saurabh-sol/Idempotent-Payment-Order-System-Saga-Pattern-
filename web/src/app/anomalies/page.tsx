"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Warning,
  ChartBar,
  ShieldWarning,
  Spinner,
} from "@phosphor-icons/react";

interface AnomalyFlag {
  id: string;
  user_id: string;
  reason: string;
  action_taken: string;
  created_at: string;
}

interface AnomalyStats {
  total_flags: number;
  unique_users: number;
  by_reason: Record<string, number>;
  by_action: Record<string, number>;
  period_hours: number;
}

export default function AnomaliesPage() {
  const [flags, setFlags] = useState<AnomalyFlag[]>([]);
  const [stats, setStats] = useState<AnomalyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [flagsRes, statsRes] = await Promise.all([
          fetch("/api/anomalies?since_hours=168"),
          fetch("/api/anomalies/stats?since_hours=168"),
        ]);
        if (!flagsRes.ok || !statsRes.ok) {
          throw new Error("Failed to load anomaly data");
        }
        const flagsData = await flagsRes.json();
        const statsData = await statsRes.json();
        setFlags(flagsData.flags ?? []);
        setStats(statsData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-[100dvh] bg-white pt-24 pb-16">
      <div className="mx-auto max-w-5xl px-6">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-brand"
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
              <ShieldWarning weight="fill" className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
                Anomaly Detection
              </h1>
              <p className="text-sm text-text-secondary">
                Flags suspicious patterns — retry storms, burst buying, duplicate intents
              </p>
            </div>
          </div>
        </motion.div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-text-muted">
            <Spinner className="h-5 w-5 animate-spin" />
            Loading from API...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-border bg-surface-secondary p-6 text-center">
            <Warning className="mx-auto h-8 w-8 text-brand mb-2" />
            <p className="text-sm text-text-secondary">{error}</p>
            <p className="text-xs text-text-muted mt-2">
              Make sure the API is running on port 8000
            </p>
          </div>
        )}

        {!loading && !error && stats && (
          <>
            <div className="grid gap-4 sm:grid-cols-3 mb-8">
              {[
                { label: "Total flags (7d)", value: stats.total_flags },
                { label: "Unique users", value: stats.unique_users },
                { label: "Flag reasons", value: Object.keys(stats.by_reason).length },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-border bg-surface-secondary p-5 text-center"
                >
                  <div className="text-3xl font-bold text-brand">{item.value}</div>
                  <div className="text-xs text-text-muted mt-1">{item.label}</div>
                </div>
              ))}
            </div>

            {Object.keys(stats.by_reason).length > 0 && (
              <div className="rounded-xl border border-border bg-white p-6 mb-8 shadow-card">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted mb-4 flex items-center gap-2">
                  <ChartBar className="h-4 w-4" />
                  By reason
                </h2>
                <div className="space-y-2">
                  {Object.entries(stats.by_reason).map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between text-sm">
                      <code className="text-text-primary">{reason}</code>
                      <span className="font-bold text-brand">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-white overflow-hidden shadow-card">
              <div className="border-b border-border px-6 py-4 bg-surface-secondary">
                <h2 className="font-semibold text-text-primary">Recent flags</h2>
              </div>
              {flags.length === 0 ? (
                <div className="p-8 text-center text-sm text-text-muted">
                  No anomalies detected yet. Try the Double-Click or Rollback scenarios in{" "}
                  <Link href="/checkout" className="text-brand hover:underline">
                    Saga Lab
                  </Link>
                  .
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {flags.map((flag) => (
                    <div key={flag.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <code className="text-sm font-medium text-text-primary">
                            {flag.reason}
                          </code>
                          <p className="text-xs text-text-muted mt-1">
                            User: {flag.user_id.slice(0, 8)}... · Action: {flag.action_taken}
                          </p>
                        </div>
                        <time className="text-xs text-text-muted shrink-0">
                          {new Date(flag.created_at).toLocaleString()}
                        </time>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
