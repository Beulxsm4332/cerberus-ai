#!/usr/bin/env python3
"""
HexStrike — MCP Agent
Model Context Protocol validation and inter-agent communication enforcement.
Enhanced with real HexStrikeClient integration for 150+ security tool access.

Roles:
  - Validate output format between agents
  - Validate schema data communication
  - Detect inconsistencies between agents
  - Enforce data contracts
  - Error boundary between agents
  - MCP server health monitoring
  - **Call HexStrike security tools via HexStrikeClient**
  - **Smart Scan / Bug Bounty / Target Analysis via server API**

Runs fully locally (no external AI required).
"""

import json
from datetime import datetime, timezone
from typing import Any, Optional

from hexstrike.utils.logger import get_logger, log_execution_time


class MCPAgent:
    """MCP validation agent with real HexStrike tool-call capabilities.

    Validates schema, format output, and data contracts between agents
    in the HexStrike pipeline.  When a :class:`HexStrikeClient` is
    provided the agent can also invoke any of the 150+ security tools
    hosted on the HexStrike Flask server.
    """

    SCHEMA_PLANNER_OUTPUT = {
        "required_keys": ["target_analysis", "approach"],
        "optional_keys": ["phases", "steps", "fallback_chain", "risk_assessment",
                          "resource_requirements", "notes"],
    }

    SCHEMA_EXECUTOR_OUTPUT = {
        "required_keys": ["code"],
        "optional_keys": ["language", "explanation", "files_affected",
                          "dependencies", "execution_command"],
    }

    SCHEMA_RECON_OUTPUT = {
        "required_keys": ["target", "target_type"],
        "optional_keys": ["context_summary", "technologies", "security_headers",
                          "open_ports", "subdomains", "files_found", "environment_info"],
    }

    def __init__(
        self,
        hexstrike_server_url: str = "http://127.0.0.1:9999",
        hexstrike_client=None,
    ):
        """Initialise MCPAgent.

        Args:
            hexstrike_server_url: URL of the HexStrike server for
                health monitoring (used as fallback when no client).
            hexstrike_client: An optional :class:`HexStrikeClient` instance
                (from ``hexstrike_mcp.HexStrikeClient``).  When provided
                the agent gains real tool-calling capabilities.
        """
        self.logger = get_logger("agents.mcp")
        self.hexstrike_server_url = hexstrike_server_url.rstrip("/")
        self._hexstrike_client = hexstrike_client
        self._validation_log: list[dict] = []

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def hexstrike_client(self):
        """Return the HexStrikeClient or ``None``."""
        return self._hexstrike_client

    @property
    def has_client(self) -> bool:
        """Whether a real HexStrikeClient is wired up."""
        return self._hexstrike_client is not None

    # ------------------------------------------------------------------
    # Real tool-call methods (delegate to HexStrikeClient)
    # ------------------------------------------------------------------

    @log_execution_time
    def call_tool(self, tool_name: str, **params) -> dict:
        """Call a HexStrike security tool via the server API.

        POSTs to ``/api/tools/{tool_name}`` and returns the raw result
        dictionary from the server.

        Args:
            tool_name: Name of the tool (e.g. ``"nmap"``, ``"nuclei"``).
            **params: Keyword arguments forwarded as JSON body.

        Returns:
            Server response dictionary with at least ``success`` key.
        """
        if self._hexstrike_client is None:
            return {
                "success": False,
                "error": "HexStrikeClient not connected — server may be offline.",
            }

        self.logger.info(f"Calling tool '{tool_name}' with params: {params}")
        endpoint = f"api/tools/{tool_name}"
        result = self._hexstrike_client.safe_post(endpoint, params)
        return result

    @log_execution_time
    def smart_scan(self, target: str, objective: str = "comprehensive",
                   max_tools: int = 5) -> dict:
        """Run an AI-powered intelligent scan on *target*.

        POSTs to ``/api/intelligence/smart-scan``.

        Args:
            target: URL or IP to scan.
            objective: Scan objective (``"comprehensive"``, ``"quick"``, ``"stealth"``).
            max_tools: Maximum number of tools to execute in parallel.

        Returns:
            Server response containing ``scan_results``.
        """
        if self._hexstrike_client is None:
            return {"success": False, "error": "HexStrikeClient not connected."}

        self.logger.info(f"Smart scan on '{target}' (objective={objective}, max_tools={max_tools})")
        return self._hexstrike_client.safe_post("api/intelligence/smart-scan", {
            "target": target,
            "objective": objective,
            "max_tools": max_tools,
        })

    @log_execution_time
    def bugbounty_assessment(self, domain: str,
                             priority_vulns: Optional[list] = None,
                             include_osint: bool = True,
                             include_business_logic: bool = True) -> dict:
        """Run a comprehensive bug bounty assessment.

        POSTs to ``/api/bugbounty/comprehensive-assessment``.

        Args:
            domain: Target domain.
            priority_vulns: List of vuln types to prioritise.
            include_osint: Whether to include OSINT workflow.
            include_business_logic: Whether to include business-logic workflow.

        Returns:
            Server response containing ``assessment``.
        """
        if self._hexstrike_client is None:
            return {"success": False, "error": "HexStrikeClient not connected."}

        if priority_vulns is None:
            priority_vulns = ["rce", "sqli", "xss", "idor", "ssrf"]

        self.logger.info(f"Bug bounty assessment for '{domain}'")
        return self._hexstrike_client.safe_post(
            "api/bugbounty/comprehensive-assessment",
            {
                "domain": domain,
                "priority_vulns": priority_vulns,
                "include_osint": include_osint,
                "include_business_logic": include_business_logic,
            },
        )

    @log_execution_time
    def analyze_target(self, target: str, scope: str = "web") -> dict:
        """Analyse a target using the intelligent decision engine.

        POSTs to ``/api/intelligence/analyze-target``.

        Args:
            target: URL or IP.
            scope: Scope hint (``"web"``, ``"network"``, ``"api"``).

        Returns:
            Server response with ``target_profile``.
        """
        if self._hexstrike_client is None:
            return {"success": False, "error": "HexStrikeClient not connected."}

        self.logger.info(f"Analyzing target '{target}' (scope={scope})")
        return self._hexstrike_client.safe_post("api/intelligence/analyze-target", {
            "target": target,
            "scope": scope,
        })

    @log_execution_time
    def select_tools(self, target: str, objective: str = "comprehensive") -> dict:
        """Select optimal tools for a target via the AI decision engine.

        POSTs to ``/api/intelligence/select-tools``.

        Args:
            target: URL or IP.
            objective: ``"comprehensive"``, ``"quick"``, ``"stealth"``.

        Returns:
            Server response with ``selected_tools`` list.
        """
        if self._hexstrike_client is None:
            return {"success": False, "error": "HexStrikeClient not connected."}

        self.logger.info(f"Selecting tools for '{target}' (objective={objective})")
        return self._hexstrike_client.safe_post("api/intelligence/select-tools", {
            "target": target,
            "objective": objective,
        })

    @log_execution_time
    def health_check(self) -> dict:
        """Check HexStrike server health via the client (or fallback).

        Returns:
            Dictionary with ``online``, ``response_time_ms``, ``server_info``.
        """
        # Prefer the wired-up client
        if self._hexstrike_client is not None:
            try:
                result = self._hexstrike_client.check_health()
                result["online"] = True
                return result
            except Exception:
                pass

        # Fallback: manual HTTP check (original behaviour)
        return self.check_hexstrike_server()

    # ------------------------------------------------------------------
    # Validation methods (original, preserved)
    # ------------------------------------------------------------------

    @log_execution_time
    def validate(self, agent_name: str, output: Any) -> dict:
        """Validate agent output against its schema.

        Args:
            agent_name: Name of the producing agent.
            output: Output data to validate.

        Returns:
            ``{"valid": bool, "errors": [...], "warnings": [...]}``.
        """
        self.logger.info(f"Validating output from {agent_name} ...")

        result = {
            "valid": False,
            "agent": agent_name,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "errors": [],
            "warnings": [],
        }

        if not isinstance(output, dict):
            result["errors"].append(
                f"Output from {agent_name} must be a dict, got {type(output).__name__}"
            )
            self._log_validation(result)
            return result

        if len(output) == 0:
            result["errors"].append("Output is empty — nothing to validate.")
            self._log_validation(result)
            return result

        schema = self._get_schema(agent_name)
        if schema is None:
            result["warnings"].append(
                f"No schema for agent '{agent_name}'. Validation skipped."
            )
            result["valid"] = True
            self._log_validation(result)
            return result

        required = schema["required_keys"]
        optional = schema["optional_keys"]
        all_valid_keys = set(required + optional)

        missing = [k for k in required if k not in output]
        for key in missing:
            result["errors"].append(f"Required key '{key}' not found.")

        unknown = [k for k in output if k not in all_valid_keys]
        for key in unknown:
            result["warnings"].append(
                f"Key '{key}' not recognised in schema {agent_name}."
            )

        for key in required:
            value = output.get(key)
            if value is None or (isinstance(value, str) and len(value.strip()) == 0):
                result["errors"].append(f"Required key '{key}' is empty.")

        if agent_name == "PlannerAgent":
            self._validate_planner_specific(output, result)
        elif agent_name == "ExecutorAgent":
            self._validate_executor_specific(output, result)

        result["valid"] = len(result["errors"]) == 0
        self._log_validation(result)

        status = "VALID" if result["valid"] else "INVALID"
        self.logger.info(f"Validation {agent_name}: {status} ({len(result['errors'])} errors)")
        return result

    @log_execution_time
    def validate_communication_chain(self, chain: list[dict]) -> dict:
        """Validate the entire inter-agent communication chain.

        Args:
            chain: List of ``{"agent_name": ..., "output": ...}`` dicts.

        Returns:
            ``{"overall_valid": bool, "total_errors": int, "per_agent": [...]}``.
        """
        self.logger.info(f"Validating communication chain: {len(chain)} agents ...")

        per_agent = []
        total_errors = 0
        total_warnings = 0

        for step in chain:
            agent_name = step.get("agent_name", "unknown")
            output = step.get("output", {})
            validation = self.validate(agent_name, output)
            per_agent.append(validation)
            total_errors += len(validation["errors"])
            total_warnings += len(validation["warnings"])

        overall_valid = total_errors == 0

        result = {
            "overall_valid": overall_valid,
            "total_steps": len(chain),
            "total_errors": total_errors,
            "total_warnings": total_warnings,
            "per_agent": per_agent,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

        status = "VALID" if overall_valid else "INVALID"
        self.logger.info(
            f"Chain validation: {status} ({total_errors} errors, {total_warnings} warnings)"
        )
        return result

    def check_hexstrike_server(self) -> dict:
        """Check HexStrike server health (direct HTTP, no client needed).

        Returns:
            ``{"online": bool, "response_time_ms": float, "server_info": dict}``.
        """
        import time

        self.logger.info(f"Health check HexStrike server: {self.hexstrike_server_url}")

        result = {
            "url": self.hexstrike_server_url,
            "online": False,
            "response_time_ms": 0,
            "server_info": {},
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

        try:
            start = time.monotonic()
            import urllib.request
            import urllib.error

            req = urllib.request.Request(
                f"{self.hexstrike_server_url}/health",
                headers={"User-Agent": "HexStrike-MCP/2.0"},
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                elapsed = (time.monotonic() - start) * 1000

                result["online"] = True
                result["response_time_ms"] = round(elapsed, 2)
                result["server_info"] = data
                self.logger.info(f"Server ONLINE ({elapsed:.0f}ms)")
        except Exception as exc:
            self.logger.warning(f"Server OFFLINE: {exc}")
            result["error"] = str(exc)

        return result

    def get_validation_log(self, limit: int = 50) -> list[dict]:
        """Return the most recent validation log entries."""
        return self._validation_log[-limit:]

    def get_status(self) -> dict:
        """Return a status dictionary for the agent."""
        server_status = self.check_hexstrike_server()
        return {
            "agent": "MCPAgent",
            "model": "local (schema validator + tool bridge)" if self.has_client else "local (schema validator)",
            "provider": "stdlib" + (" + HexStrikeClient" if self.has_client else ""),
            "hexstrike_server_online": server_status.get("online", False),
            "hexstrike_client_connected": self.has_client,
            "validation_log_size": len(self._validation_log),
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _get_schema(self, agent_name: str) -> Optional[dict]:
        schemas = {
            "PlannerAgent": self.SCHEMA_PLANNER_OUTPUT,
            "planner": self.SCHEMA_PLANNER_OUTPUT,
            "ExecutorAgent": self.SCHEMA_EXECUTOR_OUTPUT,
            "executor": self.SCHEMA_EXECUTOR_OUTPUT,
            "ReconAgent": self.SCHEMA_RECON_OUTPUT,
            "recon": self.SCHEMA_RECON_OUTPUT,
        }
        return schemas.get(agent_name)

    def _validate_planner_specific(self, output: dict, result: dict):
        phases = output.get("phases", [])
        steps = output.get("steps", [])
        if not phases and not steps:
            result["errors"].append("Plan must have 'phases' or 'steps'.")
        for phase in phases:
            if not isinstance(phase, dict):
                result["errors"].append("Each phase must be a dict.")
                continue
            if "name" not in phase and "objective" not in phase:
                result["warnings"].append(
                    f"Phase {phase.get('phase', '?')} missing 'name' or 'objective'."
                )

    def _validate_executor_specific(self, output: dict, result: dict):
        code = output.get("code", "")
        if not isinstance(code, str) or len(code.strip()) == 0:
            result["errors"].append("Executor output 'code' must not be empty.")

    def _log_validation(self, result: dict):
        self._validation_log.append({
            "agent": result.get("agent", "unknown"),
            "valid": result.get("valid", False),
            "errors_count": len(result.get("errors", [])),
            "warnings_count": len(result.get("warnings", [])),
            "timestamp": result.get("timestamp", ""),
        })
        if len(self._validation_log) > 1000:
            self._validation_log = self._validation_log[-500:]
