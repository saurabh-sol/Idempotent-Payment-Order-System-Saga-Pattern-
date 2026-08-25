export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const DOCS_URL = `${API_BASE}/docs`;
export const GRAFANA_URL = "http://localhost:3001";

export interface ApiProduct {
  id: string;
  name: string;
  price: string;
  available_qty: number;
  description?: string;
}

export async function fetchProducts(): Promise<ApiProduct[]> {
  const res = await fetch("/api/products");
  if (!res.ok) throw new Error("Failed to load products");
  const data = await res.json();
  return data.products ?? [];
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch("/health", { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export interface StripeConfig {
  enabled: boolean;
  publishable_key: string | null;
  mode: "test" | "live" | null;
  dashboard_url: string;
}

export async function fetchStripeConfig(): Promise<StripeConfig> {
  const res = await fetch("/api/stripe/config");
  if (!res.ok) {
    return {
      enabled: false,
      publishable_key: null,
      mode: null,
      dashboard_url: "https://dashboard.stripe.com/test/payments",
    };
  }
  return res.json();
}
