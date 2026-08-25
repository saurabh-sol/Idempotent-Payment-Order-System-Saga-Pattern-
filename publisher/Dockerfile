FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY publisher/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY publisher/outbox_publisher.py .
COPY api/app ./app

ENV PYTHONPATH=/app

CMD ["python", "outbox_publisher.py"]
