#!/usr/bin/env python3
"""
HexStrike AI — Main Entry Point & Gradio Chat Dashboard
Multi-Agent System: Gemini 2.5 Flash (Planner) + Devstral 2512 (Executor)
150+ integrated security tools via HexStrike Server + MCP

Usage:
  python main.py                    # Start everything (Server + Gradio)
  python main.py --port 7860        # Custom Gradio port
  python main.py --server-port 9999 # Custom server port
"""

import argparse
import json
import os
import sys
import threading
import time
from datetime import datetime, timezone
from typing import Optional

# ---------------------------------------------------------------------------
# Ensure hexstrike package is importable BEFORE any hexstrike imports
# ---------------------------------------------------------------------------
_HEXSTRIKE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hexstrike")
if _HEXSTRIKE_DIR not in sys.path:
    sys.path.insert(0, _HEXSTRIKE_DIR)
if os.path.dirname(os.path.abspath(__file__)) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from hexstrike.utils.logger import get_logger, setup_logging, format_timestamp
from hexstrike.utils.helpers import validate_input, sanitize_output, truncate_text

# ---------------------------------------------------------------------------
# Global references (set during startup)
# ---------------------------------------------------------------------------
_hexstrike_client = None  # HexStrikeClient from hexstrike_mcp.py
_server_ready = threading.Event()


# ============================================================================
# HexStrike Server startup
# ============================================================================

def start_hexstrike_server(port: int) -> None:
    """Start HexStrike Flask server in a background thread.

    The environment variable HEXSTRIKE_PORT must already be set before
    hexstrike_server is imported so that the server listens on the
    correct port.

    Args:
        port: Port for the Flask server.
    """
    logger = get_logger("main.server")
    logger.info(f"Starting HexStrike Server on port {port} ...")

    try:
        from hexstrike_server import app
        app.config["JSON_SORT_KEYS"] = False
        app.run(
            host="0.0.0.0",
            port=port,
            threaded=True,
            debug=False,
            use_reloader=False,
        )
    except ImportError as exc:
        logger.error(f"Cannot import hexstrike_server: {exc}")
    except Exception as exc:
        logger.error(f"HexStrike Server crashed: {exc}")


# ============================================================================
# HexStrike Client factory
# ============================================================================

def create_hexstrike_client(server_url: str, timeout: int = 300):
    """Create a :class:`HexStrikeClient` from ``hexstrike_mcp.py``.

    The constructor blocks with retries when the server is unreachable.
    We import it *before* the server thread starts so the import side-effects
    (logging, etc.) are handled once.

    Args:
        server_url: Base URL of the HexStrike server (e.g. ``http://127.0.0.1:9999``).
        timeout: Request timeout in seconds.

    Returns:
        HexStrikeClient instance.
    """
    from hexstrike_mcp import HexStrikeClient  # noqa: WPS433
    client = HexStrikeClient(server_url, timeout=timeout)
    return client


# ============================================================================
# Agent system factory
# ============================================================================

def create_agent_system(hexstrike_client=None):
    """Initialise all HexStrike agents.

    Args:
        hexstrike_client: Optional :class:`HexStrikeClient` passed to
            agents that can call security tools.

    Returns:
        Dictionary of agent instances keyed by name.
    """
    logger = get_logger("main")
    logger.info("Initialising HexStrike Agent System ...")

    agents: dict = {}

    # --- ReconAgent (local, no AI) ---
    try:
        from hexstrike.agents.recon import ReconAgent
        agents["recon"] = ReconAgent()
        logger.info("  ReconAgent    : OK (local)")
    except Exception as exc:
        logger.error(f"  ReconAgent    : FAIL ({exc})")

    # --- PlannerAgent (Gemini 2.5 Flash) ---
    try:
        from hexstrike.agents.planner import PlannerAgent
        agents["planner"] = PlannerAgent()
        status = "OK" if agents["planner"].api_key else "NO API KEY"
        logger.info(f"  PlannerAgent  : {status} (Gemini 2.5 Flash)")
    except Exception as exc:
        logger.error(f"  PlannerAgent  : FAIL ({exc})")

    # --- ExecutorAgent (Devstral 2512) ---
    try:
        from hexstrike.agents.executor import ExecutorAgent
        agents["executor"] = ExecutorAgent()
        status = "OK" if agents["executor"].api_key else "NO API KEY"
        logger.info(f"  ExecutorAgent : {status} (Devstral 2512)")
    except Exception as exc:
        logger.error(f"  ExecutorAgent  : FAIL ({exc})")

    # --- BrowserAgent (Playwright) ---
    try:
        from hexstrike.agents.browser_agent import BrowserAgent
        agents["browser"] = BrowserAgent()
        logger.info("  BrowserAgent  : OK (Playwright)")
    except Exception as exc:
        logger.warning(f"  BrowserAgent  : SKIP ({exc})")

    # --- MCPAgent (validation + HexStrikeClient bridge) ---
    try:
        from hexstrike.agents.mcp_agent import MCPAgent
        agents["mcp"] = MCPAgent(
            hexstrike_server_url=f"http://127.0.0.1:{os.environ.get('HEXSTRIKE_PORT', 9999)}",
            hexstrike_client=hexstrike_client,
        )
        client_status = "with client" if hexstrike_client else "local only"
        logger.info(f"  MCPAgent      : OK ({client_status})")
    except Exception as exc:
        logger.error(f"  MCPAgent      : FAIL ({exc})")

    logger.info(f"Total active agents: {len(agents)}/5")
    return agents


# ============================================================================
# Chat processing
# ============================================================================

def process_chat(message: str, history: list, agents: dict,
                 mode: str = "auto", hexstrike_client=None) -> str:
    """Process a user message and return the response.

    Args:
        message: User input.
        history: Gradio chat history.
        agents: Agent instances.
        mode: Operation mode.
        hexstrike_client: HexStrikeClient for tool calls.

    Returns:
        Formatted response string.
    """
    logger = get_logger("main.chat")

    if not message or not message.strip():
        return "Please enter a message or target."

    cleaned = validate_input(message)
    ts = format_timestamp()

    parts = [
        "## HexStrike AI Response",
        f"**Time**: {ts}  ",
        f"**Mode**: {mode.upper()}  ",
    ]

    # ---- CHAT / EXECUTOR ----
    if mode in ("chat", "executor"):
        return _mode_chat_executor(cleaned, history, agents, parts, logger)

    # ---- RECON ----
    if mode == "recon":
        return _mode_recon(cleaned, agents, parts)

    # ---- PLANNER ----
    if mode == "planner":
        return _mode_planner(cleaned, agents, parts)

    # ---- TOOLS (direct HexStrike tool call) ----
    if mode == "tools":
        return _mode_tools(cleaned, hexstrike_client, parts, logger)

    # ---- SMART SCAN ----
    if mode == "smart_scan":
        return _mode_smart_scan(cleaned, hexstrike_client, parts, logger)

    # ---- BUG BOUNTY ----
    if mode == "bugbounty":
        return _mode_bugbounty(cleaned, hexstrike_client, parts, logger)

    # ---- AUTO (full pipeline) ----
    _mode_auto_full_pipeline(cleaned, history, agents, parts, hexstrike_client, logger)
    return "\n".join(parts)


# ---- Individual mode handlers ----

def _mode_chat_executor(message, history, agents, parts, logger):
    if "executor" in agents and agents["executor"]._client is not None:
        try:
            chat_history = []
            for h in history[-10:]:
                chat_history.append({"role": "user", "content": h[0]})
                chat_history.append({"role": "assistant", "content": h[1]})
            result = agents["executor"].chat(message, chat_history)
            return sanitize_output(result)
        except Exception as exc:
            parts.append(f"\n**Error**: {exc}")
            return "\n".join(parts)
    parts.append("\n**Executor unavailable** (MISTRAL_API_KEY not set).")
    return "\n".join(parts)


def _mode_recon(message, agents, parts):
    if "recon" in agents:
        try:
            r = agents["recon"].gather_context(message)
            parts.append("\n### Recon Results")
            parts.append(f"- **Target**: {r.get('target', 'unknown')}")
            parts.append(f"- **Type**: {r.get('target_type', 'unknown')}")
            parts.append(f"- **Summary**: {r.get('context_summary', 'N/A')}")
            techs = r.get("technologies", [])
            if techs:
                parts.append(f"- **Technologies**: {', '.join(techs)}")
            ports = r.get("open_ports", [])
            if ports:
                parts.append(f"- **Open Ports**: {', '.join(map(str, ports))}")
            headers = r.get("security_headers", {})
            if headers:
                parts.append(f"- **Security Headers**: {len(headers)} detected")
                for k, v in list(headers.items())[:5]:
                    parts.append(f"  - `{k}`: {v}")
            return "\n".join(parts)
        except Exception as exc:
            return f"Recon error: {exc}"
    return "ReconAgent unavailable."


def _mode_planner(message, agents, parts):
    if "planner" in agents and agents["planner"].api_key:
        try:
            plan = agents["planner"].plan(message)
            parts.append("\n### Plan Generated")
            analysis = plan.get("target_analysis", plan.get("analysis", "N/A"))
            approach = plan.get("approach", "N/A")
            parts.append(f"**Analysis**: {analysis}")
            parts.append(f"**Approach**: {approach}")
            phases = plan.get("phases", [])
            steps = plan.get("steps", [])
            if phases:
                parts.append("**Phases:**")
                for phase in phases:
                    pn = phase.get("phase", "?")
                    name = phase.get("name", "Unnamed")
                    tools = phase.get("tools", [])
                    obj = phase.get("objective", "")
                    stealth = phase.get("stealth_level", "medium")
                    parts.append(f"\n**Phase {pn}: {name}** (Stealth: {stealth})")
                    if tools:
                        parts.append(f"- Tools: `{', '.join(tools)}`")
                    parts.append(f"- Objective: {obj}")
            if steps:
                parts.append("\n**Steps:**")
                for step in steps:
                    sn = step.get("step", step.get("phase", "?"))
                    action = step.get("action", step.get("name", ""))
                    target = step.get("target", step.get("objective", ""))
                    parts.append(f"{sn}. {action}")
                    if target:
                        parts.append(f"   Target: {target}")
            risk = plan.get("risk_assessment", {})
            if risk:
                parts.append(f"\n**Risk Assessment**: {json.dumps(risk, ensure_ascii=False)}")
            return "\n".join(parts)
        except Exception as exc:
            return f"Planner error: {exc}"
    return "PlannerAgent unavailable (GEMINI_API_KEY not set)."


def _mode_tools(message, hexstrike_client, parts, logger):
    """Parse ``tool_name: {json_params}`` and execute via HexStrike server."""
    if hexstrike_client is None:
        parts.append("\n**Error**: HexStrike server client not initialised.")
        return "\n".join(parts)

    try:
        tool_name, params_str = message.split(":", 1)
        tool_name = tool_name.strip()
        params_str = params_str.strip()
    except ValueError:
        parts.append(
            "\n**Usage**: `tool_name: {\"param\": \"value\"}`  \n"
            "**Example**: `nmap: {\"target\": \"example.com\", \"scan_type\": \"-sV\"}`  \n\n"
            "**Available tools**: nmap, nuclei, gobuster, dirb, nikto, sqlmap, ffuf, "
            "subfinder, amass, httpx, katana, wpscan, hydra, john, hashcat, "
            "rustscan, trivy, checkov, and 130+ more via the server."
        )
        return "\n".join(parts)

    # Parse JSON params
    try:
        params = json.loads(params_str) if params_str else {}
    except json.JSONDecodeError as exc:
        parts.append(f"\n**JSON parse error**: {exc}")
        return "\n".join(parts)

    parts.append(f"\n### Tool Execution: `{tool_name}`")
    parts.append(f"- **Parameters**: `{json.dumps(params, ensure_ascii=False)}`")

    try:
        endpoint = f"api/tools/{tool_name}"
        result = hexstrike_client.safe_post(endpoint, params)

        if result.get("success"):
            parts.append("- **Status**: SUCCESS")
        else:
            parts.append(f"- **Status**: FAILED — {result.get('error', 'unknown error')}")

        stdout = result.get("stdout", "")
        if stdout:
            parts.append(f"\n```\n{truncate_text(stdout, 4000)}\n```")

        stderr = result.get("stderr", "")
        if stderr and stderr != stdout:
            parts.append(f"\n**Stderr**:\n```\n{truncate_text(stderr, 2000)}\n```")

        exec_time = result.get("execution_time", 0)
        if exec_time:
            parts.append(f"- **Execution time**: {exec_time:.2f}s")

    except Exception as exc:
        parts.append(f"- **Error**: {exc}")

    return "\n".join(parts)


def _mode_smart_scan(message, hexstrike_client, parts, logger):
    """AI-powered intelligent scan via ``/api/intelligence/smart-scan``."""
    if hexstrike_client is None:
        parts.append("\n**Error**: HexStrike server client not initialised.")
        return "\n".join(parts)

    target = message.strip()
    parts.append(f"\n### Smart Scan: `{target}`")
    parts.append("_Running AI-driven tool selection & parallel execution ..._")

    try:
        result = hexstrike_client.safe_post("api/intelligence/smart-scan", {
            "target": target,
            "objective": "comprehensive",
            "max_tools": 5,
        })

        if result.get("success"):
            sr = result.get("scan_results", {})
            profile = sr.get("target_profile", {})
            summary = sr.get("execution_summary", {})

            parts.append(f"- **Target Type**: {profile.get('target_type', 'unknown')}")
            parts.append(f"- **Risk Level**: {profile.get('risk_level', 'unknown')}")

            tools_executed = sr.get("tools_executed", [])
            for t in tools_executed:
                status = t.get("status", "unknown")
                tool_name = t.get("tool", "?")
                vulns = t.get("vulnerabilities_found", 0)
                parts.append(f"\n**{tool_name}**: {status.upper()}"
                             + (f" ({vulns} vulns)" if vulns else ""))

                out = t.get("stdout", "")
                if out:
                    parts.append(f"```\n{truncate_text(out, 2000)}\n```")

            if summary:
                total = summary.get("total_tools", 0)
                ok = summary.get("successful_tools", 0)
                parts.append(
                    f"\n### Summary: {ok}/{total} tools succeeded, "
                    f"{sr.get('total_vulnerabilities', 0)} vulnerability indicators found"
                )

            combined = sr.get("combined_output", "")
            if combined:
                parts.append(f"\n<details><summary>Full Combined Output</summary>\n\n```\n{truncate_text(combined, 8000)}\n```\n</details>")
        else:
            parts.append(f"\n**Smart Scan Failed**: {result.get('error', 'unknown')}")

    except Exception as exc:
        parts.append(f"\n**Error**: {exc}")

    return "\n".join(parts)


def _mode_bugbounty(message, hexstrike_client, parts, logger):
    """Comprehensive bug bounty assessment via ``/api/bugbounty/comprehensive-assessment``."""
    if hexstrike_client is None:
        parts.append("\n**Error**: HexStrike server client not initialised.")
        return "\n".join(parts)

    domain = message.strip()
    parts.append(f"\n### Bug Bounty Assessment: `{domain}`")
    parts.append("_Generating comprehensive assessment workflows ..._")

    try:
        result = hexstrike_client.safe_post("api/bugbounty/comprehensive-assessment", {
            "domain": domain,
            "include_osint": True,
            "include_business_logic": True,
        })

        if result.get("success"):
            assessment = result.get("assessment", {})
            summary = assessment.get("summary", {})

            parts.append(f"- **Workflows**: {summary.get('workflow_count', '?')}")
            parts.append(f"- **Total Tools**: {summary.get('total_tools', '?')}")
            parts.append(f"- **Estimated Time**: {summary.get('total_estimated_time', '?')}s")
            parts.append(f"- **Priority Score**: {summary.get('priority_score', '?')}")

            for workflow_name, workflow_data in assessment.items():
                if not isinstance(workflow_data, dict):
                    continue
                if workflow_name == "summary":
                    continue
                tools_count = workflow_data.get("tools_count", 0)
                est_time = workflow_data.get("estimated_time", 0)
                parts.append(
                    f"\n#### {workflow_name.replace('_', ' ').title()}"
                    f" ({tools_count} tools, ~{est_time}s)"
                )
                steps = workflow_data.get("steps", workflow_data.get("workflow", []))
                for idx, step in enumerate(steps[:10], 1):
                    if isinstance(step, dict):
                        name = step.get("name", step.get("tool", str(step)))
                        desc = step.get("description", step.get("objective", ""))
                        parts.append(f"  {idx}. **{name}** — {truncate_text(desc, 120)}")
                    elif isinstance(step, str):
                        parts.append(f"  {idx}. {truncate_text(step, 150)}")
        else:
            parts.append(f"\n**Assessment Failed**: {result.get('error', 'unknown')}")

    except Exception as exc:
        parts.append(f"\n**Error**: {exc}")

    return "\n".join(parts)


def _mode_auto_full_pipeline(message, history, agents, parts,
                              hexstrike_client, logger):
    """Full pipeline: Recon -> Planner -> Executor -> MCP."""
    recon_context = None

    # Phase 1: Recon
    if "recon" in agents:
        try:
            parts.append("\n---\n### Phase 1: Reconnaissance")
            r = agents["recon"].quick_scan(message)
            parts.append(f"- **Target**: {r.get('target', 'unknown')}")
            parts.append(f"- **Type**: {r.get('target_type', 'unknown')}")
            if r.get("resolved_ip"):
                parts.append(f"- **IP**: {r['resolved_ip']}")
            if r.get("reverse_dns"):
                parts.append(f"- **Reverse DNS**: {r['reverse_dns']}")
            if r.get("technologies"):
                parts.append(f"- **Tech**: {', '.join(r['technologies'])}")
            if r.get("open_ports"):
                parts.append(f"- **Open Ports**: {', '.join(map(str, r['open_ports']))}")
            full_recon = agents["recon"].gather_context(message)
            recon_context = full_recon.get("context_summary", "")
        except Exception as exc:
            parts.append(f"- **Recon Error**: {exc}")

    # Phase 2: Planning + Execution
    if "planner" in agents and agents["planner"].api_key:
        try:
            parts.append("\n---\n### Phase 2: Planning")
            plan = agents["planner"].plan(message, context=recon_context)
            analysis = plan.get("target_analysis", plan.get("analysis", ""))
            approach = plan.get("approach", "")
            if analysis:
                parts.append(f"**Analysis**: {truncate_text(analysis, 300)}")
            if approach:
                parts.append(f"**Approach**: {truncate_text(approach, 300)}")

            phases = plan.get("phases", [])
            steps = plan.get("steps", [])
            if phases:
                for phase in phases[:5]:
                    p = phase.get("phase", "?")
                    n = phase.get("name", "")
                    t = phase.get("tools", [])
                    parts.append(f"- Phase {p}: {n} (`{', '.join(t) if t else 'N/A'}`)")
            if steps:
                for step in steps[:5]:
                    s = step.get("step", "?")
                    a = step.get("action", "")
                    parts.append(f"- Step {s}: {truncate_text(a, 100)}")

            # Phase 3: Execution
            if "executor" in agents and agents["executor"].api_key:
                try:
                    parts.append("\n---\n### Phase 3: Execution")
                    exec_result = agents["executor"].execute(plan, context=recon_context)
                    code = exec_result.get("code", "")
                    explanation = exec_result.get("explanation", "")
                    deps = exec_result.get("dependencies", [])
                    cmd = exec_result.get("execution_command", "")
                    if explanation:
                        parts.append(f"**Explanation**: {explanation}")
                    if deps:
                        parts.append(f"**Dependencies**: `{', '.join(deps)}`")
                    if cmd:
                        parts.append(f"**Run**: `{cmd}`")
                    if code:
                        parts.append(f"\n```\n{truncate_text(code, 2000)}\n```")
                except Exception as exc:
                    parts.append(f"**Execution Error**: {exc}")

            # Phase 4: MCP Validation
            if "mcp" in agents:
                try:
                    mcp_result = agents["mcp"].validate("PlannerAgent", plan)
                    if not mcp_result.get("valid", True):
                        warnings = mcp_result.get("warnings", [])
                        if warnings:
                            parts.append(f"\n**MCP Warnings**: {len(warnings)} warning(s)")
                except Exception:
                    pass

        except Exception as exc:
            parts.append(f"\n**Planner Error**: {exc}")
    else:
        parts.append("\n**Planner unavailable** — GEMINI_API_KEY not set.")
        parts.append("Use **chat** or **executor** mode for direct Devstral access.")


# ============================================================================
# Server status helpers
# ============================================================================

def _fetch_server_status(hexstrike_client) -> dict:
    """Get HexStrike server health info (non-blocking)."""
    try:
        if hexstrike_client is None:
            return {"online": False}
        return hexstrike_client.check_health()
    except Exception:
        return {"online": False}


def _format_status(agents, hexstrike_client) -> str:
    """Build a Markdown status panel for the Gradio sidebar."""
    lines = []

    # Agent statuses
    for name, agent in agents.items():
        try:
            s = agent.get_status()
            model = f"{s.get('model', 'N/A')} ({s.get('provider', 'N/A')})"
            lines.append(f"**{name}**: {model}")
        except Exception:
            lines.append(f"**{name}**: ERROR")

    # HexStrike Server
    if hexstrike_client is not None:
        health = _fetch_server_status(hexstrike_client)
        online = health.get("online", False)
        if online:
            total = health.get("total_tools_count", "?")
            available = health.get("total_tools_available", "?")
            uptime = health.get("uptime", 0)
            mins = int(uptime // 60)
            secs = int(uptime % 60)
            lines.append(
                f"\n**HexStrike Server**: ONLINE "
                f"({available}/{total} tools, up {mins}m {secs}s)"
            )
        else:
            lines.append("\n**HexStrike Server**: OFFLINE")
    else:
        lines.append("\n**HexStrike Server**: NOT CONNECTED")

    return "\n".join(lines)


def _format_tools_list(hexstrike_client) -> str:
    """Build a Markdown list of available tools by category."""
    if hexstrike_client is None:
        return "HexStrike server not connected."

    health = _fetch_server_status(hexstrike_client)
    if not health.get("online", False):
        return "HexStrike server is offline."

    category_stats = health.get("category_stats", {})
    tools_status = health.get("tools_status", {})

    if not category_stats:
        return "No tool information available."

    lines = ["### Available Tools by Category\n"]
    for cat, stats in category_stats.items():
        total = stats.get("total", 0)
        avail = stats.get("available", 0)
        icon = ":white_check_mark:" if avail == total else (":warning:" if avail > 0 else ":x:")
        lines.append(f"**{cat.replace('_', ' ').title()}**: {avail}/{total} installed {icon}")

    lines.append(f"\n**Total**: {health.get('total_tools_available', 0)} / "
                 f"{health.get('total_tools_count', 0)} tools installed")

    # List available tools
    available_tools = [t for t, s in tools_status.items() if s]
    if available_tools:
        lines.append("\n<details><summary>Installed Tools</summary>\n")
        for t in sorted(available_tools):
            lines.append(f"- `{t}`")
        lines.append("</details>")

    missing_tools = [t for t, s in tools_status.items() if not s]
    if missing_tools:
        lines.append("\n<details><summary>Missing Tools</summary>\n")
        for t in sorted(missing_tools):
            lines.append(f"- `{t}`")
        lines.append("</details>")

    return "\n".join(lines)


# ============================================================================
# Gradio Dashboard
# ============================================================================

def create_gradio_interface(agents: dict, hexstrike_client, port: int = 7860):
    """Build and launch the Gradio dashboard.

    Args:
        agents: Agent instances.
        hexstrike_client: HexStrikeClient for tool calls.
        port: Gradio server port.
    """
    logger = get_logger("main.gradio")

    try:
        import gradio as gr
    except ImportError:
        logger.error("'gradio' not installed. Run: pip install gradio")
        print("ERROR: gradio not installed. Run: pip install gradio")
        sys.exit(1)

    # ---- Callbacks ----

    def chat_handler(message, history, mode):
        if not message or not message.strip():
            return history, ""
        response = process_chat(message, history, agents, mode, hexstrike_client)
        history = history or []
        history.append([message, response])
        return history, ""

    def status_handler():
        return _format_status(agents, hexstrike_client)

    def tools_handler():
        return _format_tools_list(hexstrike_client)

    def clear_handler():
        return [], ""

    def refresh_server_handler():
        return status_handler(), tools_handler()

    # ---- Build UI ----

    with gr.Blocks(
        title="HexStrike AI Dashboard",
        theme=gr.themes.Soft(
            primary_hue="red",
            secondary_hue="neutral",
        ),
    ) as demo:
        gr.Markdown(
            "# HexStrike AI Dashboard\n"
            "Multi-Agent AI System: **Gemini 2.5 Flash** (Planner) + "
            "**Devstral 2512** (Executor)  \n"
            "150+ integrated security tools via HexStrike Server + MCP"
        )

        with gr.Row():
            with gr.Column(scale=3):
                mode_radio = gr.Radio(
                    choices=[
                        "auto", "chat", "planner", "executor", "recon",
                        "tools", "smart_scan", "bugbounty",
                    ],
                    value="auto",
                    label="Mode",
                    info=(
                        "auto=full pipeline | chat=AI chat | planner/executor/recon=single agent "
                        "| tools=call security tools | smart_scan=AI scan | bugbounty=assessment"
                    ),
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
                        placeholder=(
                            "Enter target URL, IP, or command...\n"
                            "  tools mode:    nmap: {\"target\": \"example.com\"}\n"
                            "  smart_scan:    example.com\n"
                            "  bugbounty:     example.com"
                        ),
                        scale=4,
                        lines=2,
                    )
                    send_btn = gr.Button("Send", variant="primary", scale=1)

                with gr.Row():
                    clear_btn = gr.Button("Clear Chat")
                    status_btn = gr.Button("Check Status")

            with gr.Column(scale=1):
                status_output = gr.Markdown(
                    "Click **Check Status** to see agent status."
                )
                tools_output = gr.Markdown(
                    "Click **List Tools** to see available security tools."
                )
                refresh_btn = gr.Button("Refresh Server Info")

        # ---- Event wiring ----

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
        refresh_btn.click(
            fn=refresh_server_handler,
            outputs=[status_output, tools_output],
        )

        # Show tools list on load
        demo.load(fn=tools_handler, outputs=[tools_output])

        gr.Examples(
            examples=[
                "Scan target https://example.com for vulnerabilities",
                "Analyze IP 192.168.1.1 for open ports and services",
                "Write a Python script for port scanning",
                "Help me understand SQL injection techniques",
                "Generate a payload for testing XSS",
                'nmap: {"target": "example.com", "scan_type": "-sV"}',
                'nuclei: {"target": "https://example.com", "severity": "critical,high"}',
                'gobuster: {"url": "https://example.com", "mode": "dir"}',
            ],
            inputs=msg_input,
            label="Quick Commands",
        )

    logger.info(f"Launching Gradio Dashboard on port {port} ...")
    demo.launch(
        server_name="0.0.0.0",
        server_port=port,
        share=False,
        show_error=True,
    )


# ============================================================================
# Main entry point
# ============================================================================

def main():
    """Main entry point for HexStrike AI."""
    parser = argparse.ArgumentParser(
        description="HexStrike AI — Multi-Agent Security System"
    )
    parser.add_argument(
        "--port", type=int, default=7860,
        help="Gradio dashboard port (default: 7860)",
    )
    parser.add_argument(
        "--server-port", type=int, default=9999,
        help="HexStrike Flask server port (default: 9999)",
    )
    parser.add_argument(
        "--log-level", type=str, default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
    )
    args = parser.parse_args()

    # ---- Set HEXSTRIKE_PORT before any hexstrike_server import ----
    os.environ["HEXSTRIKE_PORT"] = str(args.server_port)

    setup_logging(level=args.log_level)
    logger = get_logger("main")

    banner = f"""
{'='*60}
  ██╗  ██╗███████╗██╗  ██╗███████╗████████╗██████╗ ██╗██╗  ██╗███████╗
  ██║  ██║██╔════╝╚██╗██╔╝██╔════╝╚══██╔══╝██╔══██╗██║██║ ██╔╝██╔════╝
  ███████║█████╗   ╚███╔╝ ███████╗   ██║   ██████╔╝██║█████╔╝ █████╗
  ██║  ██║██╔══╝   ██╔██╗ ╚════██║   ██║   ██╔══██╗██║██╔═██╗ ██╔══╝
  ██║  ██║███████╗██╔╝ ██╗███████║   ██║   ██║  ██║██║██║  ██╗███████╗
  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚══════╝
{'='*60}
  HexStrike AI v2.0 — Multi-Agent Security System
  Planner: Gemini 2.5 Flash | Executor: Devstral 2512
  Server:  http://0.0.0.0:{args.server_port} (auto-start)
  Dashboard: http://0.0.0.0:{args.port}
{'='*60}
"""
    print(banner)

    # ---- Start HexStrike server in background thread ----
    server_thread = threading.Thread(
        target=start_hexstrike_server,
        args=(args.server_port,),
        daemon=True,
    )
    server_thread.start()
    logger.info(f"HexStrike Server starting in background (port {args.server_port})")

    # ---- Wait briefly for server to bind, then create client ----
    server_url = f"http://127.0.0.1:{args.server_port}"
    logger.info("Waiting for HexStrike Server to become ready ...")
    client = None
    for attempt in range(1, 16):
        try:
            client = create_hexstrike_client(server_url, timeout=300)
            logger.info("HexStrike Client connected successfully.")
            break
        except Exception:
            logger.debug(f"Client connection attempt {attempt}/15 failed, retrying ...")
            time.sleep(1)

    if client is None:
        logger.warning(
            "HexStrike Client could not connect after 15 attempts. "
            "Tool modes will be unavailable until the server is reachable."
        )

    global _hexstrike_client
    _hexstrike_client = client

    # ---- Initialise agent system (pass client to MCPAgent) ----
    agents = create_agent_system(hexstrike_client=client)

    # ---- Launch Gradio dashboard ----
    create_gradio_interface(agents, client, port=args.port)


if __name__ == "__main__":
    main()
