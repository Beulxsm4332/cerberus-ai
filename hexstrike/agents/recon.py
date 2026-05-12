#!/usr/bin/env python3
"""
HexStrike — Recon Agent
Lightweight reconnaissance intelligence gatherer.

Peran:
  - Analisis file dan direktori lokal
  - Pengumpulan metadata environment
  - Deteksi stack teknologi target
  - Identifikasi file konfigurasi
  - Ringkasan konteks proyek/target
  - Subdomain discovery, port scanning summary, WHOIS lookup

Tidak memerlukan AI eksternal — berjalan sepenuhnya lokal.
"""

import os
import socket
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from hexstrike.utils.logger import get_logger, log_execution_time


class ReconAgent:
    """Agent pengintaian ringan yang berjalan sepenuhnya lokal.

    Mengumpulkan informasi konteks dari file lokal, URL, environment,
    dan jaringan sebelum tugas diproses oleh PlannerAgent.
    """

    def __init__(self, hexstrike_server_url: str = "http://127.0.0.1:9999"):
        """Inisialisasi ReconAgent.

        Args:
            hexstrike_server_url: URL HexStrike server untuk tool execution.
        """
        self.logger = get_logger("agents.recon")
        self.hexstrike_server_url = hexstrike_server_url.rstrip("/")

    @log_execution_time
    def gather_context(self, target: str) -> dict:
        """Kumpulkan konteks intelijen untuk target tertentu.

        Args:
            target: URL, IP, hostname, atau path file/direktori.

        Returns:
            Dictionary berisi context_summary, target_type, technologies,
            open_ports (jika applicable), files_found, environment_info.
        """
        self.logger.info(f"Mengumpulkan konteks untuk target: {target}")

        target_type = self._classify_target(target)
        context = {
            "target": target,
            "target_type": target_type,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "context_summary": "",
            "technologies": [],
            "security_headers": {},
            "open_ports": [],
            "subdomains": [],
            "files_found": [],
            "environment_info": self._get_environment_info(),
        }

        if target_type == "url":
            url_context = self._recon_url(target)
            context.update(url_context)
        elif target_type == "ip_address":
            ip_context = self._recon_ip(target)
            context.update(ip_context)
        elif target_type == "hostname":
            host_context = self._recon_hostname(target)
            context.update(host_context)
        elif target_type == "file":
            file_context = self._recon_file(target)
            context.update(file_context)
        elif target_type == "directory":
            dir_context = self._recon_directory(target)
            context.update(dir_context)

        context["context_summary"] = self._build_summary(context)
        self.logger.info(f"Konteks berhasil dikumpulkan: {target_type}")
        return context

    @log_execution_time
    def quick_scan(self, target: str) -> dict:
        """Quick recon scan — lebih ringan dari gather_context.

        Args:
            target: URL, IP, atau hostname.

        Returns:
            Dictionary ringkas hasil recon.
        """
        self.logger.info(f"Quick scan: {target}")
        target_type = self._classify_target(target)

        result = {
            "target": target,
            "target_type": target_type,
            "status": "scanned",
        }

        if target_type == "url":
            parsed = urlparse(target)
            hostname = parsed.hostname or ""
            result["hostname"] = hostname
            result["scheme"] = parsed.scheme
            result["port"] = parsed.port or (443 if parsed.scheme == "https" else 80)
            result["path"] = parsed.path

            try:
                ip = socket.gethostbyname(hostname)
                result["resolved_ip"] = ip
            except socket.gaierror:
                result["resolved_ip"] = "unresolved"

        elif target_type == "ip_address":
            result["hostname"] = target
            try:
                hostname = socket.gethostbyaddr(target)[0]
                result["reverse_dns"] = hostname
            except (socket.herror, socket.gaierror):
                result["reverse_dns"] = "unresolved"

        return result

    def _classify_target(self, target: str) -> str:
        """Klasifikasi jenis target.

        Args:
            target: String target.

        Returns:
            Salah satu: url, ip_address, hostname, file, directory, unknown.
        """
        if not target:
            return "unknown"

        target_stripped = target.strip()

        if target_stripped.startswith("http://") or target_stripped.startswith("https://"):
            return "url"

        path = Path(target_stripped)
        if path.exists():
            if path.is_file():
                return "file"
            if path.is_dir():
                return "directory"

        parts = target_stripped.split(".")
        if len(parts) == 4 and all(p.isdigit() for p in parts):
            return "ip_address"

        if target_stripped.replace("-", "").replace(".", "").isalnum():
            return "hostname"

        return "unknown"

    def _recon_url(self, url: str) -> dict:
        """Recon untuk target URL.

        Args:
            url: URL target.

        Returns:
            Dictionary hasil recon URL.
        """
        parsed = urlparse(url)
        hostname = parsed.hostname or ""
        result = {
            "hostname": hostname,
            "scheme": parsed.scheme,
            "port": parsed.port or (443 if parsed.scheme == "https" else 80),
            "path": parsed.path,
            "technologies": [],
            "security_headers": {},
        }

        try:
            ip = socket.gethostbyname(hostname)
            result["resolved_ip"] = ip
        except socket.gaierror:
            result["resolved_ip"] = "unresolved"

        try:
            response = self._http_request(url)
            if response:
                headers = response.get("headers", {})
                result["security_headers"] = {
                    k: v for k, v in headers.items()
                    if k.lower().startswith("x-") or k.lower() in
                    ["strict-transport-security", "content-security-policy",
                     "x-frame-options", "x-content-type-options",
                     "server", "powered-by"]
                }
                server = headers.get("server", "")
                if server:
                    result["technologies"].append(server)
                tech_header = headers.get("x-powered-by", "")
                if tech_header:
                    result["technologies"].append(tech_header)
        except Exception as exc:
            self.logger.debug(f"HTTP request gagal: {exc}")

        return result

    def _recon_ip(self, ip: str) -> dict:
        """Recon untuk target IP.

        Args:
            ip: Alamat IP target.

        Returns:
            Dictionary hasil recon IP.
        """
        result = {"hostname": ip}

        try:
            hostname = socket.gethostbyaddr(ip)[0]
            result["reverse_dns"] = hostname
        except (socket.herror, socket.gaierror):
            result["reverse_dns"] = "unresolved"

        common_ports = [21, 22, 80, 443, 8080, 8443, 3306, 5432, 27017]
        result["open_ports"] = self._quick_port_scan(ip, common_ports)

        return result

    def _recon_hostname(self, hostname: str) -> dict:
        """Recon untuk hostname.

        Args:
            hostname: Hostname target.

        Returns:
            Dictionary hasil recon hostname.
        """
        result = {"hostname": hostname}

        try:
            ip = socket.gethostbyname(hostname)
            result["resolved_ip"] = ip
        except socket.gaierror:
            result["resolved_ip"] = "unresolved"

        return result

    def _recon_file(self, filepath: str) -> dict:
        """Recon untuk file target.

        Args:
            filepath: Path ke file.

        Returns:
            Dictionary hasil recon file.
        """
        path = Path(filepath)
        result = {
            "file_path": str(path),
            "file_size": path.stat().st_size if path.exists() else 0,
            "file_extension": path.suffix,
            "technologies": [],
        }

        ext_map = {
            ".py": ["Python"],
            ".js": ["JavaScript"],
            ".ts": ["TypeScript"],
            ".go": ["Go"],
            ".rs": ["Rust"],
            ".java": ["Java"],
            ".php": ["PHP"],
            ".rb": ["Ruby"],
            ".cpp": ["C++"],
            ".c": ["C"],
            ".html": ["HTML"],
            ".css": ["CSS"],
            ".json": ["JSON"],
            ".yml": ["YAML"],
            ".yaml": ["YAML"],
            ".dockerfile": ["Docker"],
            ".sh": ["Bash"],
        }
        result["technologies"] = ext_map.get(path.suffix.lower(), [])

        return result

    def _recon_directory(self, dirpath: str) -> dict:
        """Recon untuk direktori target.

        Args:
            dirpath: Path ke direktori.

        Returns:
            Dictionary hasil recon direktori.
        """
        path = Path(dirpath)
        files_found = []
        technologies = set()

        if path.exists() and path.is_dir():
            for item in path.rglob("*"):
                if item.is_file() and not item.name.startswith("."):
                    files_found.append(str(item.relative_to(path)))
                    ext = item.suffix.lower()
                    ext_map = {
                        ".py": "Python", ".js": "JavaScript", ".ts": "TypeScript",
                        ".go": "Go", ".rs": "Rust", ".java": "Java",
                        ".php": "PHP", ".html": "HTML", ".css": "CSS",
                        ".json": "JSON", ".yml": "YAML", ".sh": "Bash",
                    }
                    tech = ext_map.get(ext)
                    if tech:
                        technologies.add(tech)

        return {
            "directory_path": str(path),
            "files_found": files_found[:100],
            "total_files": len(files_found),
            "technologies": list(technologies),
        }

    def _quick_port_scan(self, ip: str, ports: list[int], timeout: float = 1.0) -> list[int]:
        """Quick port scan menggunakan socket.

        Args:
            ip: Alamat IP target.
            ports: List port yang akan di-scan.
            timeout: Timeout per port (detik).

        Returns:
            List port yang terbuka.
        """
        open_ports = []
        for port in ports:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(timeout)
                result = sock.connect_ex((ip, port))
                if result == 0:
                    open_ports.append(port)
                sock.close()
            except (socket.error, OSError):
                continue
        return open_ports

    def _http_request(self, url: str, timeout: float = 10.0) -> Optional[dict]:
        """HTTP GET request sederhana menggunakan stdlib.

        Args:
            url: URL target.
            timeout: Timeout request (detik).

        Returns:
            Dictionary dengan status_code dan headers, atau None jika gagal.
        """
        try:
            from urllib.request import urlopen, Request
            from urllib.error import URLError

            req = Request(url, headers={"User-Agent": "HexStrike-Recon/2.0"})
            with urlopen(req, timeout=timeout) as resp:
                return {
                    "status_code": resp.getcode(),
                    "headers": dict(resp.headers),
                }
        except (URLError, OSError, Exception) as exc:
            self.logger.debug(f"HTTP request error: {exc}")
            return None

    def _get_environment_info(self) -> dict:
        """Kumpulkan informasi environment sistem.

        Returns:
            Dictionary berisi python_version, platform, dll.
        """
        return {
            "python_version": sys.version,
            "platform": os.name,
            "cwd": os.getcwd(),
        }

    def _build_summary(self, context: dict) -> str:
        """Bangun ringkasan konteks untuk Planner.

        Args:
            context: Dictionary hasil recon.

        Returns:
            String ringkasan.
        """
        parts = [f"Target: {context.get('target', 'unknown')}"]
        parts.append(f"Type: {context.get('target_type', 'unknown')}")

        techs = context.get("technologies", [])
        if techs:
            parts.append(f"Technologies: {', '.join(techs)}")

        ports = context.get("open_ports", [])
        if ports:
            parts.append(f"Open Ports: {', '.join(map(str, ports))}")

        headers = context.get("security_headers", {})
        if headers:
            parts.append(f"Security Headers: {len(headers)} headers detected")

        files = context.get("files_found", [])
        if files:
            parts.append(f"Files Found: {len(files)} files")

        ip = context.get("resolved_ip", "")
        if ip and ip != "unresolved":
            parts.append(f"Resolved IP: {ip}")

        return " | ".join(parts)

    def get_status(self) -> dict:
        """Ambil status ReconAgent."""
        return {
            "agent": "ReconAgent",
            "model": "local (no AI required)",
            "provider": "stdlib",
            "hexstrike_server": self.hexstrike_server_url,
        }
