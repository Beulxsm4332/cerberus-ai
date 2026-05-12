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

# Install Python dependencies FIRST (both files)
COPY requirements.txt .
COPY hexstrike/requirements.txt ./hexstrike-requirements.txt
RUN pip install --no-cache-dir -r requirements.txt -r hexstrike-requirements.txt

# Copy all application code
COPY . .

# Expose port for HuggingFace Spaces
ENV PORT=7860
ENV HOSTNAME="0.0.0.0"

# API Keys — Set via main.py hardcoded fallback or HF Spaces secrets
# (DO NOT set empty ENV here — it overrides the hardcoded keys in code)
# ENV MISTRAL_API_KEY=""
# ENV GEMINI_API_KEY=""

# Command to run — Gradio dashboard (starts HexStrike server internally)
CMD ["python", "main.py", "--port", "7860"]
