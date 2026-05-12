# HexStrike AI — HuggingFace Spaces Docker Deployment
# Core: hexstrike_server.py + hexstrike_mcp.py
# AI: Gemini 2.5 Flash (Planner) + Devstral 2512 (Executor)
# Dashboard: Gradio on port 7860
#
# HF Spaces Secrets (set in Settings > Variables and secrets):
#   MISTRAL_API_KEY — Devstral 2512 (Executor)
#   GEMINI_API_KEY  — Gemini 2.5 Flash (Planner)

FROM python:3.11-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    wget \
    nmap \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python dependencies
COPY hexstrike/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application code
COPY . .

# Expose port for HuggingFace Spaces
ENV PORT=7860
ENV HOSTNAME="0.0.0.0"

# API Keys — Will be overridden by HF Spaces secrets
# (set in Settings > Variables and secrets > Repository secrets)
ENV MISTRAL_API_KEY=""
ENV GEMINI_API_KEY=""

# Command to run — Gradio dashboard (starts HexStrike server internally)
CMD ["python", "main.py", "--port", "7860"]
