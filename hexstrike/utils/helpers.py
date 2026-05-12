"""
HexStrike — Helper Functions
Kumpulan fungsi utilitas yang digunakan seluruh sistem HexStrike.
"""

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional


def validate_input(text: str, max_length: int = 50000) -> str:
    """Validasi dan sanitasi input dari user.

    Args:
        text: Input mentah dari user.
        max_length: Panjang maksimum yang diizinkan.

    Returns:
        Input yang sudah disanitasi.

    Raises:
        ValueError: Jika input kosong, bukan string, atau melebihi batas.
    """
    if text is None:
        raise ValueError("Input tidak boleh None.")
    if not isinstance(text, str):
        raise ValueError(f"Input harus berupa string, bukan {type(text).__name__}.")
    cleaned = text.strip()
    if len(cleaned) == 0:
        raise ValueError("Input tidak boleh kosong atau hanya whitespace.")
    if len(cleaned) > max_length:
        raise ValueError(f"Input terlalu panjang: {len(cleaned)} chars (maks {max_length}).")
    return cleaned


def sanitize_output(text: str) -> str:
    """Sanitasi output dari AI.

    Args:
        text: Output mentah dari AI.

    Returns:
        Output yang sudah dibersihkan.
    """
    if not isinstance(text, str):
        return str(text)
    ansi_pattern = re.compile(r"\x1b\[[0-9;]*[a-zA-Z]")
    cleaned = ansi_pattern.sub("", text)
    cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.rstrip() for line in cleaned.split("\n")]
    return "\n".join(lines).strip()


def truncate_text(text: str, max_length: int = 8000, suffix: str = "...") -> str:
    """Potong teks jika melebihi panjang maksimum.

    Args:
        text: Teks yang akan dipotong.
        max_length: Panjang maksimum.
        suffix: Suffix jika teks dipotong.

    Returns:
        Teks yang sudah dipotong atau teks asli.
    """
    if not isinstance(text, str):
        return str(text)[:max_length]
    if len(text) <= max_length:
        return text
    return text[: max_length - len(suffix)] + suffix


def load_json_file(file_path: str | Path) -> dict:
    """Baca file JSON.

    Args:
        file_path: Path ke file JSON.

    Returns:
        Dictionary dari isi file.

    Raises:
        FileNotFoundError: Jika file tidak ada.
        json.JSONDecodeError: Jika file bukan JSON valid.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File tidak ditemukan: {path}")
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, dict):
        raise ValueError(f"File JSON harus berisi object, bukan {type(data).__name__}.")
    return data


def save_json_file(file_path: str | Path, data: dict, indent: int = 2) -> None:
    """Simpan dictionary ke file JSON.

    Args:
        file_path: Path tujuan file JSON.
        data: Dictionary yang akan disimpan.
        indent: Indentasi (default 2).
    """
    path = Path(file_path)
    parent_dir = path.parent
    if parent_dir and not parent_dir.exists():
        parent_dir.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=indent, ensure_ascii=False)


def safe_get(data: dict, key: str, default: Any = None) -> Any:
    """Ambil nilai dari nested dictionary dengan aman.

    Args:
        data: Dictionary sumber.
        key: Key (format: 'a.b.c').
        default: Nilai default.

    Returns:
        Nilai dari key atau default.
    """
    if not isinstance(data, dict):
        return default
    keys = key.split(".")
    current = data
    for k in keys:
        if isinstance(current, dict) and k in current:
            current = current[k]
        else:
            return default
    return current


def count_tokens_estimate(text: str) -> int:
    """Estimasi jumlah token (~4 karakter per token).

    Args:
        text: Teks yang akan dihitung.

    Returns:
        Estimasi jumlah token.
    """
    if not isinstance(text, str):
        return 0
    return max(1, len(text) // 4)
