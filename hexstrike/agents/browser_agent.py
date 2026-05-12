#!/usr/bin/env python3
"""
HexStrike — Browser Agent
Browser automation for web reconnaissance and interaction.

Peran:
  - Screenshot halaman web
  - Navigasi dan interaksi halaman
  - Ekstraksi konten dari halaman
  - Automated form filling
  - JavaScript-rendered content extraction
  - Headless browser execution

Menggunakan Playwright (headless) sebagai browser engine.
"""

import os
import base64
from datetime import datetime, timezone
from typing import Optional

from hexstrike.utils.logger import get_logger, log_execution_time


class BrowserAgent:
    """Agent otomasi browser menggunakan Playwright (headless).

    Menjalankan tugas browser seperti screenshot, navigasi, dan ekstraksi
    konten web untuk mendukung operasi HexStrike.
    """

    def __init__(self, headless: bool = True, screenshot_dir: str = "/tmp/hexstrike_screenshots"):
        """Inisialisasi BrowserAgent.

        Args:
            headless: Jalankan browser dalam mode headless (default: True).
            screenshot_dir: Direktori penyimpanan screenshot.
        """
        self.logger = get_logger("agents.browser")
        self.headless = headless
        self.screenshot_dir = screenshot_dir
        self._playwright = None
        self._browser = None

        os.makedirs(screenshot_dir, exist_ok=True)

    def _ensure_playwright(self):
        """Inisialisasi Playwright secara lazy."""
        if self._playwright is not None:
            return

        try:
            from playwright.sync_api import sync_playwright

            self._playwright = sync_playwright()
            self._browser = self._playwright.start().chromium.launch(headless=self.headless)
            self.logger.info("Playwright browser diinisialisasi (headless=%s)", self.headless)

        except ImportError:
            raise ImportError(
                "Package 'playwright' belum terinstal. "
                "Jalankan: pip install playwright && playwright install chromium"
            )

    def close(self):
        """Tutup browser dan cleanup resource."""
        if self._browser:
            try:
                self._browser.close()
            except Exception:
                pass
        if self._playwright:
            try:
                self._playwright.stop()
            except Exception:
                pass
        self._browser = None
        self._playwright = None
        self.logger.info("Browser ditutup.")

    @log_execution_time
    def screenshot(self, url: str, full_page: bool = True, filename: Optional[str] = None) -> dict:
        """Ambil screenshot halaman web.

        Args:
            url: URL halaman target.
            full_page: Screenshot full page atau viewport saja (default: True).
            filename: Nama file screenshot (default: auto-generate).

        Returns:
            Dictionary berisi filepath, url, timestamp, size_bytes.
        """
        self._ensure_playwright()

        if not filename:
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            safe_url = url.replace("://", "_").replace("/", "_").replace(":", "_")[:50]
            filename = f"screenshot_{safe_url}_{timestamp}.png"

        filepath = os.path.join(self.screenshot_dir, filename)

        try:
            self.logger.info(f"Screenshot: {url}")
            page = self._browser.new_page(
                viewport={"width": 1920, "height": 1080},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                           "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            )
            page.goto(url, timeout=30000, wait_until="domcontentloaded")

            page.screenshot(path=filepath, full_page=full_page)
            page.close()

            file_size = os.path.getsize(filepath) if os.path.exists(filepath) else 0

            self.logger.info(f"Screenshot disimpan: {filepath} ({file_size} bytes)")
            return {
                "success": True,
                "filepath": filepath,
                "url": url,
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "size_bytes": file_size,
            }

        except Exception as exc:
            self.logger.error(f"Gagal screenshot {url}: {exc}")
            return {
                "success": False,
                "error": str(exc),
                "url": url,
            }

    @log_execution_time
    def extract_content(self, url: str, wait_for: Optional[str] = None) -> dict:
        """Ekstraksi konten dari halaman web.

        Args:
            url: URL halaman target.
            wait_for: CSS selector untuk menunggu elemen muncul (opsional).

        Returns:
            Dictionary berisi title, text_content, links, forms, metadata.
        """
        self._ensure_playwright()

        try:
            self.logger.info(f"Extract content: {url}")
            page = self._browser.new_page(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                           "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            )

            if wait_for:
                page.goto(url, timeout=30000, wait_until="domcontentloaded")
                page.wait_for_selector(wait_for, timeout=10000)
            else:
                page.goto(url, timeout=30000, wait_until="domcontentloaded")

            title = page.title()

            text_content = page.evaluate("""
                () => {
                    const body = document.body;
                    if (!body) return '';
                    const scripts = body.querySelectorAll('script, style, noscript');
                    scripts.forEach(el => el.remove());
                    return body.innerText.trim().substring(0, 50000);
                }
            """)

            links = page.evaluate("""
                () => {
                    return Array.from(document.querySelectorAll('a[href]')).map(a => ({
                        text: a.innerText.trim().substring(0, 100),
                        href: a.href
                    })).filter(l => l.href.startsWith('http'));
                }
            """)

            forms = page.evaluate("""
                () => {
                    return Array.from(document.querySelectorAll('form')).map((form, i) => ({
                        index: i,
                        action: form.action || '',
                        method: (form.method || 'GET').toUpperCase(),
                        inputs: Array.from(form.querySelectorAll('input, select, textarea')).map(inp => ({
                            name: inp.name || '',
                            type: inp.type || 'text',
                            id: inp.id || ''
                        })).filter(i => i.name)
                    }));
                }
            """)

            metadata = page.evaluate("""
                () => {
                    const meta = {};
                    document.querySelectorAll('meta[name], meta[property]').forEach(el => {
                        const name = el.getAttribute('name') || el.getAttribute('property') || '';
                        const content = el.getAttribute('content') || '';
                        if (name && content) meta[name] = content.substring(0, 200);
                    });
                    return meta;
                }
            """)

            page.close()

            self.logger.info(f"Content extracted: {title} ({len(text_content)} chars)")
            return {
                "success": True,
                "url": url,
                "title": title,
                "text_content": text_content,
                "links_count": len(links),
                "links": links[:100],
                "forms_count": len(forms),
                "forms": forms[:20],
                "metadata": metadata,
            }

        except Exception as exc:
            self.logger.error(f"Gagal extract content {url}: {exc}")
            return {
                "success": False,
                "error": str(exc),
                "url": url,
            }

    @log_execution_time
    def check_alive(self, url: str, timeout: int = 15) -> dict:
        """Cek apakah URL accessible dan return status code.

        Args:
            url: URL target.
            timeout: Timeout dalam detik.

        Returns:
            Dictionary berisi alive, status_code, title.
        """
        self._ensure_playwright()

        try:
            self.logger.info(f"Check alive: {url}")
            page = self._browser.new_page()
            response = page.goto(url, timeout=timeout * 1000, wait_until="commit")

            status_code = response.status if response else 0
            title = page.title()
            page.close()

            is_alive = 200 <= status_code < 400

            self.logger.info(f"{url} -> {status_code} ({'ALIVE' if is_alive else 'DOWN'})")
            return {
                "alive": is_alive,
                "status_code": status_code,
                "title": title,
                "url": url,
            }

        except Exception as exc:
            self.logger.error(f"Check alive gagal: {exc}")
            return {
                "alive": False,
                "status_code": 0,
                "error": str(exc),
                "url": url,
            }

    def get_status(self) -> dict:
        """Ambil status BrowserAgent."""
        return {
            "agent": "BrowserAgent",
            "model": "Playwright (Chromium)",
            "provider": "local",
            "headless": self.headless,
            "browser_open": self._browser is not None,
            "screenshot_dir": self.screenshot_dir,
        }
