# 🐺 Cerberus AI — Multi-Agent Cybersecurity System

<p align="center">
  <img src="https://img.shields.io/badge/Version-2.0_Onyx-DC143C?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/Framework-Next.js_16-000000?style=for-the-badge&logo=next.js" alt="Framework">
  <img src="https://img.shields.io/badge/AI-Mistral-FF7000?style=for-the-badge" alt="Mistral AI">
  <img src="https://img.shields.io/badge/License-Apache_2.0-D4AF37?style=for-the-badge" alt="License">
</p>

Sistem multi-agent berbasis AI untuk riset dan edukasi keamanan siber. Cerberus AI menggunakan 6 agent spesialis yang ditenagai oleh model-model gratis dari Mistral AI.

## 🐕‍🦺 Para Agent Cerberus

| Agent | Emoji | Peran | Model |
|-------|-------|-------|-------|
| **Onyx Overseer** | 🐺 | Master Orchestrator & Reasoning | devstral-small-2507 |
| **Phantom Executor** | 💀 | Code & Exploit Development | devstral-small-2507 |
| **Oracle Intelligence** | 🔮 | OSINT & Research | mistral-large-2411 |
| **Wraith Stealth** | 👻 | Evasion & Stealth | devstral-small-2507 |
| **Harbinger Social** | 🎭 | Social Engineering | mistral-large-2411 |
| **Swift Responder** | ⚡ | Fast Response & FAQ | ministral-3b-latest |

## 🚀 Fitur

- **6 Agent Spesialis** — Routing otomatis berdasarkan kata kunci
- **Mistral AI Free Models** — Menggunakan model gratis dari Mistral AI
- **Desain Mistikal** — Tema gelap dengan nuansa legendaris Cerberus
- **Respons Cepat** — Streaming chat dengan fallback otomatis
- **Mobile Responsive** — Tampilan optimal di semua perangkat
- **Markdown Support** — Respons AI terformat dengan markdown

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React, Tailwind CSS 4, Framer Motion, shadcn/ui
- **Backend**: Next.js API Routes, Mistral AI REST API
- **AI Models**: Mistral AI (devstral-small-2507, mistral-large-2411, ministral-3b-latest, codestral-latest)
- **Deployment**: HuggingFace Spaces (Docker)

## 📦 Instalasi Lokal

```bash
# Clone repo
git clone https://github.com/Beulxsm4332/cerberus-ai.git
cd cerberus-ai

# Install dependencies
bun install

# Setup environment
cp .env.example .env
# Edit .env dan masukkan MISTRAL_API_KEY

# Jalankan development server
bun run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MISTRAL_API_KEY` | ✅ | API key gratis dari [console.mistral.ai](https://console.mistral.ai) |

## 🌐 Deployment ke HuggingFace Spaces

1. Buat Space baru di HuggingFace dengan SDK **Docker**
2. Set secret `MISTRAL_API_KEY` di Settings > Repository Secrets
3. Push kode ini ke repo Space tersebut
4. Deployment otomatis via Docker

## ⚠️ Disclaimer

Cerberus AI adalah framework untuk **PENELITIAN KEAMANAN** dan **EDUKASI**. Penggunaan untuk aktivitas ilegal adalah **TANGGUNG JAWAB PENGGUNA**. Pengembang tidak bertanggung jawab atas penyalahgunaan.

## 📄 License

Apache-2.0

---

**Dibuat oleh Kak Sal & Agent Salbjork** untuk komunitas mahasiswa cybersecurity Indonesia.
