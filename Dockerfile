# HexStrike AI — HuggingFace Spaces Docker Deployment
FROM python:3.11-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python dependencies
COPY hexstrike/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (for BrowserAgent)
RUN pip install --no-cache-dir playwright && playwright install chromium --with-deps

# Copy all application code
COPY . .

# Expose port for HuggingFace Spaces
ENV PORT=7860
ENV HOSTNAME="0.0.0.0"

# Command to run — Gradio dashboard
CMD ["python", "main.py", "--port", "7860"]
