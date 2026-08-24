# Idempotent Payment Order System (Saga Pattern)

Production-grade distributed transaction system with Saga pattern orchestration, idempotency-key deduplication, and AI-powered anomaly detection.

**Goal:** Handle concurrent order placement with **zero double-charges** and **automatic rollback on partial failure**.

> ⚠️ This project uses **Stripe TEST MODE only**. No real charges are ever made.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           AI LAYER                                   │
│  ┌─────────────┐                           ┌──────────────────┐     │
│  │  Shopping   │  generates intent         │    Anomaly       │     │
│  │   Agent     │ ─────────────────────────▶│   Detector       │     │
│  └─────────────┘                           └──────────────────┘     │
│         │                                          ▲                │
│         │ tool calls                               │ flags only     │
└─────────┼──────────────────────────────────────────┼────────────────┘
          ▼                                          │
┌─────────────────────────────────────────────────────────────────────┐
│                      DETERMINISTIC CORE                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │ Idempotency │───▶│    Saga     │───▶│   Stripe    │             │
│  │   Layer     │    │ Orchestrator│    │  Gateway    │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│         │                  │                                        │
│         ▼                  ▼                                        │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │   Redis     │    │  Postgres   │───▶│   Kafka     │             │
│  │ (fast path) │    │ (authority) │    │  (events)   │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

**Key boundary:** The LLM never directly commits a payment. It generates *intent* via tool calls. The deterministic core decides *whether* transactions commit. The anomaly detector only *flags* — never unilaterally approves or denies.

---

## Features

| Feature | Description |
|---------|-------------|
| **Idempotency Layer** | Same request → same result. Redis fast path + Postgres unique constraint as the real lock. |
| **Saga Orchestration** | `reserve_inventory` → `charge_payment` → `confirm_order` with automatic compensating rollback. |
| **Audit Timeline** | Every saga step persisted to `saga_steps` table. Full visibility for debugging. |
| **Anomaly Detection** | Real-time flagging of retry storms, burst buying, suspicious patterns. |
| **Stripe Integration** | Real PaymentIntents, refunds, and signed webhooks (test mode). |
| **AI Agent Ready** | Tool-calling interface for LLM agents with deterministic idempotency key generation. |

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.12+
- Stripe account (for test keys)

### 1. Clone and setup

```bash
git clone https://github.com/saurabh-sol/Idempotent-Payment-Order-System-Saga-Pattern-.git
cd Idempotent-Payment-Order-System-Saga-Pattern-

cp .env.example .env
# Add your Stripe test keys to .env
```

### 2. Start services

```bash
docker compose up -d
```

### 3. Access the app

- **Web UI:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List products |
| GET | `/api/products/{id}` | Product details |
| POST | `/api/orders` | Create order (requires `Idempotency-Key` header) |
| GET | `/api/orders/{id}` | Order status |
| GET | `/api/orders/{id}/timeline` | Saga audit trail |
| POST | `/webhooks/stripe` | Stripe webhook receiver |
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |

---

## Tech Stack

- **API:** Python 3.12, FastAPI, SQLAlchemy 2 (async), Pydantic v2
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Payments:** Stripe (test mode)
- **Events:** Kafka (KRaft)
- **Observability:** structlog, Prometheus, Grafana

---

## Project Structure

```
├── api/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Settings
│   │   ├── database.py          # SQLAlchemy setup
│   │   ├── models.py            # Database models
│   │   ├── idempotency.py       # Idempotency middleware
│   │   ├── saga/
│   │   │   ├── orchestrator.py  # Saga coordinator
│   │   │   └── steps.py         # Forward + compensate actions
│   │   ├── stripe_client.py     # Stripe integration
│   │   └── static/              # Frontend assets
│   └── requirements.txt
├── agent/                        # AI shopping agent (Phase 8+)
├── anomaly/                      # Anomaly detector (Phase 10+)
├── tests/
├── docker-compose.yml
└── README.md
```

---

## Failure Scenario Table

| Scenario | Expected Behavior | Status |
|----------|------------------|--------|
| Reserve inventory fails | Order fails immediately, no payment attempted | 🔲 |
| Payment fails | Inventory released, order marked failed | 🔲 |
| Confirm fails after payment | Refund issued + inventory released | 🔲 |
| 20 concurrent identical requests | Exactly 1 order created | 🔲 |
| Last unit, 2 concurrent orders | Exactly 1 wins, other fails cleanly | 🔲 |
| AI agent retry storm (3 calls) | Collapses to 1 order | 🔲 |

---

## How This Would Scale to 100M URLs

*(Interview talking points)*

- **Database sharding:** Shard `orders` table by hash of `user_id` once single Postgres can't handle write volume
- **Read replicas:** Order lookups vastly outnumber creates; replicas relieve primary
- **Connection pooling:** PgBouncer in front of Postgres
- **ID generation:** Move from UUID to Snowflake IDs to avoid single point of contention
- **CDN:** Cache static assets and consider edge caching for read-heavy endpoints

---

## License

MIT
