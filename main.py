#!/usr/bin/env python3
"""
HexStrike AI — Main Entry Point & Gradio Chat Dashboard
Multi-Agent System: Gemini 2.5 Flash (Planner) + Devstral 2512 (Executor)

Entry point ini menggabungkan:
  - Semua AI agents (Planner, Executor, Recon, Browser, MCP)
  - HexStrike Server (150+ security tools via Flask API)
  - Gradio dashboard untuk interaksi chat

Usage:
  python main.py                    # Start Gradio dashboard only
  python main.py --with-server      # Start HexStrike server + Gradio
  python main.py --port 7860        # Custom port
"""

import argparse
import json
import os
import sys
import threading
from datetime import datetime, timezone
from typing import Optional

from hexstrike.utils.logger import get_logger, setup_logging, format_timestamp
from hexstrike.utils.helpers import validate_input, sanitize_output, truncate_text


def create_agent_system():
    """Inisialisasi semua agent HexStrike.

    Returns:
        Dictionary berisi semua instance agent.
    """
    logger = get_logger("main")

    logger.info("Inisialisasi HexStrike Agent System...")

    agents = {}

    try:
        from hexstrike.agents.recon import ReconAgent
        agents["recon"] = ReconAgent()
        logger.info("  ReconAgent    : OK (local)")
    except Exception as exc:
        logger.error(f"  ReconAgent    : FAIL ({exc})")

    try:
        from hexstrike.agents.planner import PlannerAgent
        agents["planner"] = PlannerAgent()
        status = "OK" if agents["planner"].api_key else "NO API KEY"
        logger.info(f"  PlannerAgent  : {status} (Gemini 2.5 Flash)")
    except Exception as exc:
        logger.error(f"  PlannerAgent  : FAIL ({exc})")

    try:
        from hexstrike.agents.executor import ExecutorAgent
        agents["executor"] = ExecutorAgent()
        status = "OK" if agents["executor"].api_key else "NO API KEY"
        logger.info(f"  ExecutorAgent : {status} (Devstral 2512)")
    except Exception as exc:
        logger.error(f"  ExecutorAgent : FAIL ({exc})")

    try:
        from hexstrike.agents.browser_agent import BrowserAgent
        agents["browser"] = BrowserAgent()
        logger.info("  BrowserAgent  : OK (Playwright)")
    except Exception as exc:
        logger.warning(f"  BrowserAgent  : SKIP ({exc})")

    try:
        from hexstrike.agents.mcp_agent import MCPAgent
        agents["mcp"] = MCPAgent()
        logger.info("  MCPAgent      : OK (local)")
    except Exception as exc:
        logger.error(f"  MCPAgent      : FAIL ({exc})")

    logger.info(f"Total agent aktif: {len(agents)}/5")
    return agents


def run_hexstrike_server(port: int = 9999):
    """Jalankan HexStrike Flask server di background thread.

    Args:
        port: Port untuk Flask server.
    """
    logger = get_logger("main")
    logger.info(f"Memulai HexStrike Server di port {port}...")

    hexstrike_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hexstrike")
    if hexstrike_dir not in sys.path:
        sys.path.insert(0, hexstrike_dir)

    try:
        from hexstrike_server import app
        app.config["JSON_SORT_KEYS"] = False
        app.run(host="0.0.0.0", port=port, threaded=True, debug=False)
    except ImportError:
        logger.error("Gagal import hexstrike_server. Pastikan hexstrike/hexstrike_server.py ada.")
    except Exception as exc:
        logger.error(f"Gagal menjalankan HexStrike Server: {exc}")


def process_chat(message: str, history: list, agents: dict, mode: str = "auto") -> str:
    """Proses pesan chat dari user dan return respons.

    Args:
        message: Pesan dari user.
        history: History percakapan Gradio.
        agents: Dictionary semua instance agent.
        mode: Mode operasi (auto, planner, executor, recon, chat).

    Returns:
        String respons yang akan ditampilkan di dashboard.
    """
    logger = get_logger("main.chat")

    if not message or not message.strip():
        return "Silakan masukkan pesan atau target."

    cleaned_message = validate_input(message)
    timestamp = format_timestamp()

    response_parts = [
        f"## HexStrike AI Response\n",
        f"**Waktu**: {timestamp}  \n",
        f"**Mode**: {mode.upper()}  \n",
    ]

    if mode == "chat" or mode == "executor":
        if "executor" in agents and agents["executor"]._client is not None:
            try:
                chat_history = []
                for h in history[-10:]:
                    chat_history.append({"role": "user", "content": h[0]})
                    chat_history.append({"role": "assistant", "content": h[1]})

                result = agents["executor"].chat(cleaned_message, chat_history)
                return sanitize_output(result)
            except Exception as exc:
                response_parts.append(f"\n**Error**: {exc}\n")
                return "\n".join(response_parts)
        else:
            response_parts.append("\n**Executor tidak tersedia** (MISTRAL_API_KEY belum diset).\n")
            return "\n".join(response_parts)

    if mode == "recon":
        if "recon" in agents:
            try:
                recon_result = agents["recon"].gather_context(cleaned_message)
                response_parts.append(f"\n### Recon Results\n")
                response_parts.append(f"- **Target**: {recon_result.get('target', 'unknown')}")
                response_parts.append(f"- **Type**: {recon_result.get('target_type', 'unknown')}")
                response_parts.append(f"- **Summary**: {recon_result.get('context_summary', 'N/A')}")

                techs = recon_result.get("technologies", [])
                if techs:
                    response_parts.append(f"- **Technologies**: {', '.join(techs)}")

                ports = recon_result.get("open_ports", [])
                if ports:
                    response_parts.append(f"- **Open Ports**: {', '.join(map(str, ports))}")

                headers = recon_result.get("security_headers", {})
                if headers:
                    response_parts.append(f"- **Security Headers**: {len(headers)} detected")
                    for k, v in list(headers.items())[:5]:
                        response_parts.append(f"  - `{k}`: {v}")

                return "\n".join(response_parts)
            except Exception as exc:
                return f"Recon error: {exc}"
        return "ReconAgent tidak tersedia."

    if mode == "planner":
        if "planner" in agents and agents["planner"].api_key:
            try:
                plan = agents["planner"].plan(cleaned_message)
                response_parts.append(f"\n### Plan Generated\n")

                analysis = plan.get("target_analysis", plan.get("analysis", "N/A"))
                approach = plan.get("approach", "N/A")
                response_parts.append(f"**Analisis**: {analysis}\n")
                response_parts.append(f"**Pendekatan**: {approach}\n")

                phases = plan.get("phases", [])
                steps = plan.get("steps", [])

                if phases:
                    response_parts.append("**Fase-Fase:**")
                    for phase in phases:
                        p_num = phase.get("phase", "?")
                        name = phase.get("name", "Unnamed")
                        tools = phase.get("tools", [])
                        obj = phase.get("objective", "")
                        stealth = phase.get("stealth_level", "medium")
                        response_parts.append(f"\n**Phase {p_num}: {name}** (Stealth: {stealth})")
                        if tools:
                            response_parts.append(f"- Tools: `{', '.join(tools)}`")
                        response_parts.append(f"- Objective: {obj}")

                if steps:
                    response_parts.append("\n**Langkah-langkah:**")
                    for step in steps:
                        s_num = step.get("step", step.get("phase", "?"))
                        action = step.get("action", step.get("name", ""))
                        target = step.get("target", step.get("objective", ""))
                        response_parts.append(f"{s_num}. {action}")
                        if target:
                            response_parts.append(f"   Target: {target}")

                risk = plan.get("risk_assessment", {})
                if risk:
                    response_parts.append(f"\n**Risk Assessment**: {json.dumps(risk, ensure_ascii=False)}")

                return "\n".join(response_parts)
            except Exception as exc:
                return f"Planner error: {exc}"
        return "PlannerAgent tidak tersedia (GEMINI_API_KEY belum diset)."

    mode_auto_full_pipeline(cleaned_message, agents, response_parts, logger)
    return "\n".join(response_parts)


def mode_auto_full_pipeline(message: str, agents: dict, response_parts: list, logger) -> None:
    """Jalankan full pipeline: Recon → Planner → Executor → MCP.

    Args:
        message: Input user.
        agents: Dictionary semua agent.
        response_parts: List response yang akan di-append.
        logger: Logger instance.
    """
    recon_context = None

    if "recon" in agents:
        try:
            response_parts.append("\n---\n### Phase 1: Reconnaissance\n")
            recon_result = agents["recon"].quick_scan(message)
            response_parts.append(f"- **Target**: {recon_result.get('target', 'unknown')}")
            response_parts.append(f"- **Type**: {recon_result.get('target_type', 'unknown')}")

            if recon_result.get("resolved_ip"):
                response_parts.append(f"- **IP**: {recon_result.get('resolved_ip')}")
            if recon_result.get("reverse_dns"):
                response_parts.append(f"- **Reverse DNS**: {recon_result.get('reverse_dns')}")
            if recon_result.get("technologies"):
                response_parts.append(f"- **Tech**: {', '.join(recon_result.get('technologies', []))}")
            if recon_result.get("open_ports"):
                response_parts.append(f"- **Open Ports**: {', '.join(map(str, recon_result.get('open_ports', [])))}")

            full_recon = agents["recon"].gather_context(message)
            recon_context = full_recon.get("context_summary", "")

        except Exception as exc:
            response_parts.append(f"- **Recon Error**: {exc}")

    if "planner" in agents and agents["planner"].api_key:
        try:
            response_parts.append("\n---\n### Phase 2: Planning\n")
            plan = agents["planner"].plan(message, context=recon_context)

            analysis = plan.get("target_analysis", plan.get("analysis", ""))
            approach = plan.get("approach", "")
            if analysis:
                response_parts.append(f"**Analisis**: {truncate_text(analysis, 300)}")
            if approach:
                response_parts.append(f"**Pendekatan**: {truncate_text(approach, 300)}")

            phases = plan.get("phases", [])
            steps = plan.get("steps", [])

            if phases:
                for phase in phases[:5]:
                    p = phase.get("phase", "?")
                    n = phase.get("name", "")
                    t = phase.get("tools", [])
                    response_parts.append(f"- Phase {p}: {n} (`{', '.join(t) if t else 'N/A'}`)")
            if steps:
                for step in steps[:5]:
                    s = step.get("step", "?")
                    a = step.get("action", "")
                    response_parts.append(f"- Step {s}: {truncate_text(a, 100)}")

            if "executor" in agents and agents["executor"].api_key:
                try:
                    response_parts.append("\n---\n### Phase 3: Execution\n")
                    exec_result = agents["executor"].execute(plan, context=recon_context)

                    code = exec_result.get("code", "")
                    explanation = exec_result.get("explanation", "")
                    deps = exec_result.get("dependencies", [])
                    cmd = exec_result.get("execution_command", "")

                    if explanation:
                        response_parts.append(f"**Explanation**: {explanation}")
                    if deps:
                        response_parts.append(f"**Dependencies**: `{', '.join(deps)}`")
                    if cmd:
                        response_parts.append(f"**Run**: `{cmd}`")
                    if code:
                        response_parts.append("\n```\n" + truncate_text(code, 2000) + "\n```")

                except Exception as exc:
                    response_parts.append(f"**Execution Error**: {exc}")

            if "mcp" in agents:
                try:
                    mcp_result = agents["mcp"].validate("PlannerAgent", plan)
                    if not mcp_result.get("valid", True):
                        warnings = mcp_result.get("warnings", [])
                        if warnings:
                            response_parts.append(f"\n**MCP Warnings**: {len(warnings)} warning(s)")
                except Exception:
                    pass

        except Exception as exc:
            response_parts.append(f"\n**Planner Error**: {exc}")
    else:
        response_parts.append("\n**Planner tidak tersedia** — GEMINI_API_KEY belum diset.")
        response_parts.append("Gunakan mode **chat** atau **executor** untuk langsung chat dengan Devstral.")


def create_gradio_interface(agents: dict, port: int = 7860):
    """Buat dan launch Gradio interface.

    Args:
        agents: Dictionary semua instance agent.
        port: Port untuk Gradio server.
    """
    logger = get_logger("main.gradio")

    try:
        import gradio as gr
    except ImportError:
        logger.error("Package 'gradio' belum terinstal. Jalankan: pip install gradio")
        print("ERROR: gradio not installed. Run: pip install gradio")
        sys.exit(1)

    def chat_handler(message, history, mode):
        if not message or not message.strip():
            return history, ""
        response = process_chat(message, history, agents, mode)
        history = history or []
        history.append([message, response])
        return history, ""

    def status_handler():
        status_lines = []
        for name, agent in agents.items():
            try:
                s = agent.get_status()
                model_info = f"{s.get('model', 'N/A')} ({s.get('provider', 'N/A')})"
                status_lines.append(f"**{name}**: {model_info}")
            except Exception:
                status_lines.append(f"**{name}**: ERROR")

        if "mcp" in agents:
            try:
                server_status = agents["mcp"].check_hexstrike_server()
                online = server_status.get("online", False)
                ms = server_status.get("response_time_ms", 0)
                status_lines.append(f"\n**HexStrike Server**: {'ONLINE' if online else 'OFFLINE'} ({ms}ms)")
            except Exception:
                status_lines.append("\n**HexStrike Server**: UNKNOWN")

        return "\n".join(status_lines)

    def clear_handler():
        return [], ""

    with gr.Blocks(
        title="HexStrike AI Dashboard",
        theme=gr.themes.Soft(
            primary_hue="red",
            secondary_hue="neutral",
        ),
    ) as demo:
        gr.Markdown(
            "# HexStrike AI Dashboard\n"
            "Multi-Agent AI System: **Gemini 2.5 Flash** (Planner) + **Devstral 2512** (Executor)\n"
            "150+ integrated security tools via HexStrike Server"
        )

        with gr.Row():
            with gr.Column(scale=3):
                mode_radio = gr.Radio(
                    choices=["auto", "chat", "planner", "executor", "recon"],
                    value="auto",
                    label="Mode",
                    info="auto=full pipeline, chat=direct AI chat, planner/executor/recon=single agent",
                )
                chatbot = gr.Chatbot(
                    label="HexStrike Chat",
                    height=500,
                    type="messages",
                    show_copy_button=True,
                )
                with gr.Row():
                    msg_input = gr.Textbox(
                        label="Input",
                        placeholder="Masukkan target URL, IP, atau perintah...",
                        scale=4,
                        lines=2,
                    )
                    send_btn = gr.Button("Send", variant="primary", scale=1)

                with gr.Row():
                    clear_btn = gr.Button("Clear Chat")
                    status_btn = gr.Button("Check Status")

            with gr.Column(scale=1):
                status_output = gr.Markdown("Click **Check Status** to see agent status.")

        msg_input.submit(
            fn=chat_handler,
            inputs=[msg_input, chatbot, mode_radio],
            outputs=[chatbot, msg_input],
        )
        send_btn.click(
            fn=chat_handler,
            inputs=[msg_input, chatbot, mode_radio],
            outputs=[chatbot, msg_input],
        )
        clear_btn.click(fn=clear_handler, outputs=[chatbot, msg_input])
        status_btn.click(fn=status_handler, outputs=[status_output])

        gr.Examples(
            examples=[
                "Scan target https://example.com for vulnerabilities",
                "Analyze IP 192.168.1.1 for open ports and services",
                "Write a Python script for port scanning",
                "Help me understand SQL injection techniques",
                "Generate a payload for testing XSS",
            ],
            inputs=msg_input,
            label="Quick Commands",
        )

    logger.info(f"Launching Gradio Dashboard di port {port}...")
    demo.launch(
        server_name="0.0.0.0",
        server_port=port,
        share=False,
        show_error=True,
    )


def main():
    """Main entry point HexStrike AI."""
    parser = argparse.ArgumentParser(description="HexStrike AI — Multi-Agent Security System")
    parser.add_argument("--port", type=int, default=7860, help="Port Gradio dashboard (default: 7860)")
    parser.add_argument("--server-port", type=int, default=9999, help="Port HexStrike Flask server (default: 9999)")
    parser.add_argument("--with-server", action="store_true", help="Jalankan HexStrike Flask server bersamaan")
    parser.add_argument("--log-level", type=str, default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    args = parser.parse_args()

    setup_logging(level=args.log_level)
    logger = get_logger("main")

    banner = f"""
{'='*60}
  ██╗  ██╗███████╗██╗  ██╗███████╗████████╗██████╗ ██╗██╗  ██╗███████╗
  ██║  ██║██╔════╝╚██╗██╔╝██╔════╝╚══██╔══╝██╔══██╗██║██║ ██╔╝██╔════╝
  ███████║█████╗   ╚███╔╝ ███████╗   ██║   ██████╔╝██║█████╔╝ █████╗
  ██╔══██║██╔══╝   ██╔██╗ ╚════██║   ██║   ██╔══██╗██║██╔═██╗ ██╔══╝
  ██║  ██║███████╗██╔╝ ██╗███████║   ██║   ██║  ██║██║██║  ██╗███████╗
  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚══════╝
{'='*60}
  HexStrike AI v2.0 — Multi-Agent Security System
  Planner: Gemini 2.5 Flash | Executor: Devstral 2512
  Dashboard: http://0.0.0.0:{args.port}
{'='*60}
"""
    print(banner)

    hexstrike_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hexstrike")
    if hexstrike_dir not in sys.path:
        sys.path.insert(0, hexstrike_dir)
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

    agents = create_agent_system()

    if args.with_server:
        server_thread = threading.Thread(
            target=run_hexstrike_server,
            args=(args.server_port,),
            daemon=True,
        )
        server_thread.start()
        logger.info(f"HexStrike Server berjalan di background (port {args.server_port})")

    create_gradio_interface(agents, port=args.port)


if __name__ == "__main__":
    main()
