from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog
from pathlib import Path
from prometheus_fastapi_instrumentator import Instrumentator

from app.config import get_settings
from app.database import engine, Base, async_session_maker
from app.seed import seed_products

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Saga Payment System")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")
    
    async with async_session_maker() as db:
        await seed_products(db)
        logger.info("Seed data loaded")
    
    yield
    logger.info("Shutting down Saga Payment System")


app = FastAPI(
    title="Idempotent Payment System",
    description="Saga-pattern order processing with idempotency-key deduplication",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

static_path = Path(__file__).parent / "static"
static_path.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=static_path), name="static")


from app.routes import products, orders, webhooks, admin, agent, anomalies

app.include_router(products.router)
app.include_router(orders.router)
app.include_router(webhooks.router)
app.include_router(admin.router)
app.include_router(agent.router)
app.include_router(anomalies.router)

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "saga-payment-system"}


@app.get("/", response_class=HTMLResponse)
async def root():
    html_file = static_path / "index.html"
    if html_file.exists():
        return HTMLResponse(content=html_file.read_text())
    return HTMLResponse(content="""
    <!DOCTYPE html>
    <html><head><meta http-equiv="refresh" content="0;url=/static/index.html"></head></html>
    """)
