#!/usr/bin/env python3
"""
HexStrike — MCP Agent
Model Context Protocol validation and inter-agent communication enforcement.

Peran:
  - Validasi format output antar agent
  - Validasi schema data komunikasi
  - Deteksi inkonsistensi antar agent
  - Enforcement data contract
  - Error boundary antar agent
  - MCP server health monitoring

Berjalan sepenuhnya lokal tanpa AI eksternal.
"""

import json
from datetime import datetime, timezone
from typing import Any, Optional

from hexstrike.utils.logger import get_logger, log_execution_time


class MCPAgent:
    """Agent validasi MCP yang menjamin konsistensi komunikasi antar agent.

    Memvalidasi schema, format output, dan data contract antar agent
    dalam pipeline HexStrike.
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

    def __init__(self, hexstrike_server_url: str = "http://127.0.0.1:9999"):
        """Inisialisasi MCPAgent.

        Args:
            hexstrike_server_url: URL HexStrike server untuk health monitoring.
        """
        self.logger = get_logger("agents.mcp")
        self.hexstrike_server_url = hexstrike_server_url.rstrip("/")
        self._validation_log: list[dict] = []

    @log_execution_time
    def validate(self, agent_name: str, output: Any) -> dict:
        """Validasi output dari agent berdasarkan schema.

        Args:
            agent_name: Nama agent yang menghasilkan output.
            output: Output yang akan divalidasi.

        Returns:
            Dictionary berisi valid (bool), errors (list), warnings (list).
        """
        self.logger.info(f"Validasi output dari {agent_name}...")

        result = {
            "valid": False,
            "agent": agent_name,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "errors": [],
            "warnings": [],
        }

        if not isinstance(output, dict):
            result["errors"].append(
                f"Output dari {agent_name} harus berupa dict, bukan {type(output).__name__}"
            )
            self._log_validation(result)
            return result

        if len(output) == 0:
            result["errors"].append("Output kosong — tidak ada data untuk divalidasi.")
            self._log_validation(result)
            return result

        schema = self._get_schema(agent_name)
        if schema is None:
            result["warnings"].append(
                f"Tidak ada schema untuk agent '{agent_name}'. Validasi dilewati."
            )
            result["valid"] = True
            self._log_validation(result)
            return result

        required = schema["required_keys"]
        optional = schema["optional_keys"]
        all_valid_keys = set(required + optional)

        missing_keys = [key for key in required if key not in output]
        for key in missing_keys:
            result["errors"].append(f"Required key '{key}' tidak ditemukan.")

        unknown_keys = [key for key in output if key not in all_valid_keys]
        for key in unknown_keys:
            result["warnings"].append(
                f"Key '{key}' tidak dikenali dalam schema {agent_name}."
            )

        for key in required:
            value = output.get(key)
            if value is None or (isinstance(value, str) and len(value.strip()) == 0):
                result["errors"].append(f"Required key '{key}' bernilai kosong.")

        if agent_name == "PlannerAgent":
            self._validate_planner_specific(output, result)

        elif agent_name == "ExecutorAgent":
            self._validate_executor_specific(output, result)

        result["valid"] = len(result["errors"]) == 0
        self._log_validation(result)

        status = "VALID" if result["valid"] else "INVALID"
        self.logger.info(f"Validasi {agent_name}: {status} ({len(result['errors'])} errors)")
        return result

    @log_execution_time
    def validate_communication_chain(self, chain: list[dict]) -> dict:
        """Validasi seluruh chain komunikasi antar agent.

        Args:
            chain: List of dictionaries, masing-masing berisi agent_name dan output.

        Returns:
            Dictionary berisi overall_valid, total_errors, per_agent_results.
        """
        self.logger.info(f"Validasi chain komunikasi: {len(chain)} agent...")

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
        self.logger.info(f"Chain validation: {status} ({total_errors} errors, {total_warnings} warnings)")
        return result

    def check_hexstrike_server(self) -> dict:
        """Cek kesehatan HexStrike server.

        Returns:
            Dictionary berisi online (bool), response_time_ms, server_info.
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
        """Ambil log validasi terakhir.

        Args:
            limit: Jumlah entry maksimum (default: 50).

        Returns:
            List of validation log entries.
        """
        return self._validation_log[-limit:]

    def _get_schema(self, agent_name: str) -> Optional[dict]:
        """Ambil schema untuk agent tertentu.

        Args:
            agent_name: Nama agent.

        Returns:
            Schema dictionary atau None jika tidak ditemukan.
        """
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
        """Validasi spesifik untuk PlannerAgent output.

        Args:
            output: Output dari PlannerAgent.
            result: Dictionary validasi (dimutasi in-place).
        """
        phases = output.get("phases", [])
        steps = output.get("steps", [])

        if not phases and not steps:
            result["errors"].append("Plan harus memiliki 'phases' atau 'steps'.")

        for phase in phases:
            if not isinstance(phase, dict):
                result["errors"].append("Setiap phase harus berupa dict.")
                continue

            if "name" not in phase and "objective" not in phase:
                result["warnings"].append(
                    f"Phase {phase.get('phase', '?')} tidak memiliki 'name' atau 'objective'."
                )

    def _validate_executor_specific(self, output: dict, result: dict):
        """Validasi spesifik untuk ExecutorAgent output.

        Args:
            output: Output dari ExecutorAgent.
            result: Dictionary validasi (dimutasi in-place).
        """
        code = output.get("code", "")
        if not isinstance(code, str) or len(code.strip()) == 0:
            result["errors"].append("Executor output 'code' tidak boleh kosong.")

    def _log_validation(self, result: dict):
        """Simpan hasil validasi ke log.

        Args:
            result: Dictionary hasil validasi.
        """
        self._validation_log.append({
            "agent": result.get("agent", "unknown"),
            "valid": result.get("valid", False),
            "errors_count": len(result.get("errors", [])),
            "warnings_count": len(result.get("warnings", [])),
            "timestamp": result.get("timestamp", ""),
        })

        if len(self._validation_log) > 1000:
            self._validation_log = self._validation_log[-500:]

    def get_status(self) -> dict:
        """Ambil status MCPAgent."""
        server_status = self.check_hexstrike_server()
        return {
            "agent": "MCPAgent",
            "model": "local (schema validator)",
            "provider": "stdlib",
            "hexstrike_server_online": server_status.get("online", False),
            "validation_log_size": len(self._validation_log),
        }
