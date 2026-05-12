"""
HexStrike — Logging System
Sistem logging terpusat untuk seluruh agen HexStrike.
"""

import logging
import sys
import os
from datetime import datetime, timezone
from typing import Optional
import functools
import time

_LOG_FORMAT = "%(asctime)s | %(name)-22s | %(levelname)-7s | %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

_loggers_cache: dict[str, logging.Logger] = {}


def setup_logging(level: str = "INFO", log_file: Optional[str] = None) -> None:
    """Setup logging global HexStrike.

    Args:
        level: Level logging (DEBUG, INFO, WARNING, ERROR, CRITICAL).
        log_file: Opsional — path file log. Jika None, log hanya ke stdout.
    """
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    root_logger = logging.getLogger("hexstrike")
    root_logger.setLevel(numeric_level)

    formatter = logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT)

    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setLevel(numeric_level)
    stdout_handler.setFormatter(formatter)
    root_logger.addHandler(stdout_handler)

    if log_file:
        log_dir = os.path.dirname(log_file)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setLevel(numeric_level)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)

    root_logger.propagate = False


def get_logger(name: str) -> logging.Logger:
    """Ambil logger untuk modul tertentu.

    Args:
        name: Nama modul (biasanya __name__).

    Returns:
        Instance logging.Logger yang sudah dikonfigurasi.
    """
    if name in _loggers_cache:
        return _loggers_cache[name]

    full_name = f"hexstrike.{name}" if not name.startswith("hexstrike.") else name
    logger = logging.getLogger(full_name)
    _loggers_cache[name] = logger
    return logger


def log_execution_time(func):
    """Decorator untuk log waktu eksekusi fungsi."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        logger = get_logger(func.__module__)
        func_name = func.__qualname__
        start = time.monotonic()
        try:
            result = func(*args, **kwargs)
            elapsed = time.monotonic() - start
            logger.info("[PERF] %s selesai dalam %.3fs", func_name, elapsed)
            return result
        except Exception as exc:
            elapsed = time.monotonic() - start
            logger.error("[FAIL] %s gagal setelah %.3fs: %s", func_name, elapsed, exc)
            raise
    return wrapper


def format_timestamp(dt: Optional[datetime] = None) -> str:
    """Format datetime ke string ISO 8601.

    Args:
        dt: Objek datetime. Jika None, gunakan waktu UTC sekarang.

    Returns:
        String timestamp ISO 8601.
    """
    if dt is None:
        dt = datetime.now(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
