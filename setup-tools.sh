#!/bin/bash
# Cerberus AI v3.0 — Tool Setup Script
# Clone semua pentesting/security tool repos yang diintegrasikan sebagai skills

TOOLS_DIR="$(dirname "$0")/tools"
mkdir -p "$TOOLS_DIR"

echo "=========================================="
echo "  Cerberus AI v3.0 — Tool Setup"
echo "  Cloning 9 security tool repositories"
echo "=========================================="
echo ""

REPOS=(
  "H-mmer/pentest-agents|Pentest Agent Suite — 50 agents, 26 commands, 2,605+ payloads"
  "EranGoldman/WebHackersWeapons|Web Weapons Catalog — 250+ tools, 90+ categories"
  "thomasdullien/vulpine|Vulpine VulnDev Pipeline — 8-stage C/C++ fuzzing & exploit"
  "transilienceai/communitytools|Community Security Tools — 26 skills, 100% CTF benchmark"
  "acedef/SynthAPT|SynthAPT Adversary Simulation — 55+ opcodes, playbook-to-shellcode"
  "Req999/darkwebspyder|DarkWeb Spyder — 10 dark web search engines"
  "GitSolved/AgenticART|AgenticART Android Exploit — Training with feedback loop"
  "iceeecreaamm/Rio-|DarkWeb-Spy (Rio) — Dark web OSINT alternative"
  "Lynx463/darkdump|DarkDump OSINT Pro — Enhanced scraping & email extraction"
)

SUCCESS=0
FAILED=0

for entry in "${REPOS[@]}"; do
  IFS='|' read -r repo desc <<< "$entry"
  name=$(echo "$repo" | cut -d'/' -f2)
  target="$TOOLS_DIR/$name"
  
  if [ -d "$target" ] && [ "$(ls -A "$target" 2>/dev/null)" ]; then
    echo "  [SKIP] $name (already exists)"
    ((SUCCESS++))
    continue
  fi
  
  echo -n "  [CLONE] $name... "
  if git clone --depth 1 "https://github.com/${repo}.git" "$target" > /dev/null 2>&1; then
    # Remove .git directory to save space
    rm -rf "$target/.git"
    echo "OK"
    ((SUCCESS++))
  else
    echo "FAILED (repo may be private or deleted)"
    ((FAILED++))
  fi
done

echo ""
echo "=========================================="
echo "  Setup complete!"
echo "  Success: $SUCCESS | Failed: $FAILED"
echo "  Tools installed to: tools/"
echo "=========================================="
