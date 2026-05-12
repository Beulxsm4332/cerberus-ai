// HexStrike AI v6.0 — HexStrike Bridge Tools
// Real security tool executions proxied to the HexStrike Python backend
// These replace the fake "analysis only" tools with actual backend calls

import type { ToolDefinition, ToolContext, ToolResult } from '../tools/types';
import { hexstrikeClient } from '../hexstrike/client';

// ===== HELPER: Bridge to HexStrike backend =====
async function bridgeToBackend(
  toolId: string,
  toolPath: string,
  params: Record<string, any>,
  fallbackPrompt?: { system: string; user: string }
): Promise<ToolResult> {
  // Always try the real backend first
  const result = await hexstrikeClient.executeTool(toolPath, params);

  if (result.success) {
    return {
      success: true,
      output: result.output,
      data: result.data,
      tokensUsed: 0,
    };
  }

  // If backend is offline, fall back to AI analysis
  if (hexstrikeClient.connected) {
    // Backend was reachable but tool failed
    return {
      success: false,
      output: '',
      error: result.error,
    };
  }

  // Backend offline — use AI fallback for advisory response
  if (fallbackPrompt) {
    try {
      const apiKey = process.env.MISTRAL_API_KEY;
      if (!apiKey) {
        return {
          success: false,
          output: '',
          error: 'HexStrike backend offline and no MISTRAL_API_KEY for fallback.',
        };
      }

      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages: [
            { role: 'system', content: fallbackPrompt.system },
            { role: 'user', content: fallbackPrompt.user },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiOutput = data.choices?.[0]?.message?.content || 'No response.';
        return {
          success: true,
          output: `[HexStrike Backend Offline — AI Advisory Mode]\n\n${aiOutput}`,
          data: { mode: 'fallback', backendStatus: 'offline' },
        };
      }
    } catch {
      // Fall through
    }
  }

  return {
    success: false,
    output: '',
    error: `HexStrike backend not available at ${hexstrikeClient.backendUrl}. Start it with: cd hexstrike && python3 hexstrike_server.py`,
  };
}

// ===== HEXSTRIKE SECURITY TOOLS (Real Backend Execution) =====

export const hexstrikePortScan: ToolDefinition = {
  id: 'hexstrike_port_scan',
  name: 'Nmap Port Scanner',
  description: 'Run real Nmap port scan against a target via HexStrike backend. Discovers open ports, services, and OS detection.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  dangerous: true,
  requiresConfirmation: true,
  parameters: [
    { name: 'target', type: 'string', description: 'Target IP, hostname, or CIDR range', required: true },
    { name: 'ports', type: 'string', description: 'Port specification (e.g. "80,443" or "1-1000" or "top-100")', required: false, default: 'top-100' },
    { name: 'flags', type: 'string', description: 'Additional Nmap flags (e.g. "-sV -sC -A")', required: false, default: '-sV -sC' },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_port_scan',
      'api/tools/nmap',
      { target: params.target, ports: params.ports, flags: params.flags },
      {
        system: 'You are a network scanning expert. Provide Nmap scanning guidance, methodology, and result interpretation.',
        user: `Target: ${params.target}, Ports: ${params.ports || 'top-100'}, Flags: ${params.flags || '-sV -sC'}\n\nProvide Nmap scan methodology and expected results.`,
      }
    );
  },
};

export const hexstrikeNuclei: ToolDefinition = {
  id: 'hexstrike_nuclei',
  name: 'Nuclei Vuln Scanner',
  description: 'Run Nuclei vulnerability scanner with template-based detection against a target.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  dangerous: true,
  requiresConfirmation: true,
  parameters: [
    { name: 'target', type: 'string', description: 'Target URL', required: true },
    { name: 'templates', type: 'string', description: 'Template path or tag (e.g. "cves", "vulnerabilities", "misconfigurations")', required: false },
    { name: 'severity', type: 'string', description: 'Severity filter: critical, high, medium, low, info', required: false, default: 'critical,high' },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_nuclei',
      'api/tools/nuclei',
      { target: params.target, templates: params.templates, severity: params.severity },
      {
        system: 'You are a vulnerability scanning expert specializing in Nuclei template-based scanning.',
        user: `Target: ${params.target}\nProvide vulnerability scanning methodology and common findings.`,
      }
    );
  },
};

export const hexstrikeGobuster: ToolDefinition = {
  id: 'hexstrike_gobuster',
  name: 'Gobuster Dir Brute',
  description: 'Directory and DNS brute-forcing with Gobuster to discover hidden paths and subdomains.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  dangerous: true,
  requiresConfirmation: true,
  parameters: [
    { name: 'target', type: 'string', description: 'Target URL (for dir mode) or domain (for dns mode)', required: true },
    { name: 'wordlist', type: 'string', description: 'Path to wordlist', required: false, default: '/usr/share/wordlists/dirb/common.txt' },
    { name: 'extensions', type: 'string', description: 'File extensions to search (e.g. "php,html,js")', required: false },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_gobuster',
      'api/tools/gobuster',
      { target: params.target, wordlist: params.wordlist, extensions: params.extensions },
      {
        system: 'You are a directory brute-forcing expert.',
        user: `Target: ${params.target}\nProvide directory enumeration methodology.`,
      }
    );
  },
};

export const hexstrikeSubfinder: ToolDefinition = {
  id: 'hexstrike_subfinder',
  name: 'Subfinder Subdomain Enum',
  description: 'Passive subdomain enumeration using multiple OSINT sources via Subfinder.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  parameters: [
    { name: 'target', type: 'string', description: 'Target domain', required: true },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_subfinder',
      'api/tools/subfinder',
      { target: params.target },
      {
        system: 'You are a subdomain enumeration expert.',
        user: `Target: ${params.target}\nProvide subdomain enumeration methodology and tools.`,
      }
    );
  },
};

export const hexstrikeNikto: ToolDefinition = {
  id: 'hexstrike_nikto',
  name: 'Nikto Web Scanner',
  description: 'Web server scanner for dangerous files, outdated software, and misconfigurations.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  dangerous: true,
  requiresConfirmation: true,
  parameters: [
    { name: 'target', type: 'string', description: 'Target URL', required: true },
    { name: 'options', type: 'string', description: 'Additional Nikto options', required: false },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_nikto',
      'api/tools/nikto',
      { target: params.target, options: params.options },
      {
        system: 'You are a web server security testing expert.',
        user: `Target: ${params.target}\nProvide web server security testing methodology.`,
      }
    );
  },
};

export const hexstrikeSqlmap: ToolDefinition = {
  id: 'hexstrike_sqlmap',
  name: 'SQLMap Injection',
  description: 'Automated SQL injection testing and database exploitation with SQLMap.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  dangerous: true,
  requiresConfirmation: true,
  parameters: [
    { name: 'target', type: 'string', description: 'Target URL with injectable parameter', required: true },
    { name: 'options', type: 'string', description: 'Additional SQLMap options', required: false },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_sqlmap',
      'api/tools/sqlmap',
      { target: params.target, options: params.options },
      {
        system: 'You are a SQL injection testing expert. Provide methodology and remediation.',
        user: `Target: ${params.target}\nProvide SQL injection testing methodology.`,
      }
    );
  },
};

export const hexstrikeHydra: ToolDefinition = {
  id: 'hexstrike_hydra',
  name: 'Hydra Brute Force',
  description: 'Online password brute-forcing tool supporting many protocols (SSH, FTP, HTTP, etc.).',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  dangerous: true,
  requiresConfirmation: true,
  parameters: [
    { name: 'target', type: 'string', description: 'Target host', required: true },
    { name: 'service', type: 'string', description: 'Service to brute (ssh, ftp, http-post, etc.)', required: true },
    { name: 'username', type: 'string', description: 'Username or username list', required: false },
    { name: 'wordlist', type: 'string', description: 'Path to password wordlist', required: false },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_hydra',
      'api/tools/hydra',
      { target: params.target, service: params.service, username: params.username, wordlist: params.wordlist },
      {
        system: 'You are a password security expert. Provide brute-force methodology and defense strategies.',
        user: `Target: ${params.target}, Service: ${params.service}\nProvide authentication testing methodology.`,
      }
    );
  },
};

export const hexstrikeWpscan: ToolDefinition = {
  id: 'hexstrike_wpscan',
  name: 'WPScan WordPress',
  description: 'WordPress vulnerability scanner for enumerating themes, plugins, and users.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  dangerous: true,
  requiresConfirmation: true,
  parameters: [
    { name: 'target', type: 'string', description: 'Target WordPress URL', required: true },
    { name: 'options', type: 'string', description: 'Additional WPScan options', required: false },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_wpscan',
      'api/tools/wpscan',
      { target: params.target, options: params.options },
      {
        system: 'You are a WordPress security expert.',
        user: `Target: ${params.target}\nProvide WordPress security assessment methodology.`,
      }
    );
  },
};

export const hexstrikeFfuf: ToolDefinition = {
  id: 'hexstrike_ffuf',
  name: 'FFUF Web Fuzzer',
  description: 'Fast web fuzzer for discovering hidden endpoints, directories, and parameters.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  dangerous: true,
  requiresConfirmation: true,
  parameters: [
    { name: 'target', type: 'string', description: 'Target URL with FUZZ keyword', required: true },
    { name: 'wordlist', type: 'string', description: 'Path to wordlist', required: false },
    { name: 'extensions', type: 'string', description: 'File extensions', required: false },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_ffuf',
      'api/tools/ffuf',
      { target: params.target, wordlist: params.wordlist, extensions: params.extensions },
      {
        system: 'You are a web fuzzing expert.',
        user: `Target: ${params.target}\nProvide fuzzing methodology.`,
      }
    );
  },
};

export const hexstrikeAmass: ToolDefinition = {
  id: 'hexstrike_amass',
  name: 'Amass Recon',
  description: 'Deep subdomain enumeration and attack surface mapping with Amass.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  parameters: [
    { name: 'target', type: 'string', description: 'Target domain', required: true },
    { name: 'passive', type: 'boolean', description: 'Use passive mode only', required: false, default: true },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_amass',
      'api/tools/amass',
      { target: params.target, passive: params.passive },
      {
        system: 'You are a reconnaissance and attack surface mapping expert.',
        user: `Target: ${params.target}\nProvide reconnaissance methodology.`,
      }
    );
  },
};

export const hexstrikeHttpx: ToolDefinition = {
  id: 'hexstrike_httpx',
  name: 'HTTPX Probe',
  description: 'HTTP toolkit for probing and analyzing web services and endpoints.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  parameters: [
    { name: 'target', type: 'string', description: 'Target URL or list of URLs', required: true },
    { name: 'options', type: 'string', description: 'Additional HTTPX options', required: false },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_httpx',
      'api/tools/httpx',
      { target: params.target, options: params.options },
      {
        system: 'You are an HTTP analysis expert.',
        user: `Target: ${params.target}\nProvide HTTP probing methodology.`,
      }
    );
  },
};

// ===== HEXSTRIKE INTELLIGENCE TOOLS =====

export const hexstrikeSmartScan: ToolDefinition = {
  id: 'hexstrike_smart_scan',
  name: 'AI Smart Scan',
  description: 'AI-powered intelligent scan that automatically selects the best tools and strategies for a target.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  dangerous: true,
  requiresConfirmation: true,
  parameters: [
    { name: 'target', type: 'string', description: 'Target URL, IP, or domain', required: true },
    { name: 'intensity', type: 'string', description: 'Scan intensity: light, normal, deep', required: false, default: 'normal', enum: ['light', 'normal', 'deep'] },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_smart_scan',
      'api/intelligence/smart-scan',
      { target: params.target, intensity: params.intensity },
      {
        system: 'You are an AI-powered security analysis expert. Provide comprehensive scanning strategy.',
        user: `Target: ${params.target}, Intensity: ${params.intensity || 'normal'}\nProvide comprehensive security assessment plan.`,
      }
    );
  },
};

export const hexstrikeReconWorkflow: ToolDefinition = {
  id: 'hexstrike_recon_workflow',
  name: 'Bug Bounty Recon',
  description: 'Full bug bounty reconnaissance workflow: subdomain enum, port scan, web probe, dir fuzz, screenshot.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  dangerous: true,
  requiresConfirmation: true,
  parameters: [
    { name: 'target', type: 'string', description: 'Target domain for bug bounty recon', required: true },
    { name: 'depth', type: 'string', description: 'Recon depth: quick, standard, deep', required: false, default: 'standard', enum: ['quick', 'standard', 'deep'] },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_recon_workflow',
      'api/bugbounty/reconnaissance-workflow',
      { target: params.target, depth: params.depth },
      {
        system: 'You are a bug bounty reconnaissance expert. Provide full recon methodology.',
        user: `Target: ${params.target}\nProvide comprehensive bug bounty recon workflow.`,
      }
    );
  },
};

export const hexstrikeAttackChain: ToolDefinition = {
  id: 'hexstrike_attack_chain',
  name: 'AI Attack Chain',
  description: 'AI-generated attack chain based on target analysis, technology detection, and vulnerability assessment.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  dangerous: true,
  requiresConfirmation: true,
  parameters: [
    { name: 'target', type: 'string', description: 'Target URL or IP', required: true },
    { name: 'approach', type: 'string', description: 'Attack approach: stealth, aggressive, balanced', required: false, default: 'balanced' },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_attack_chain',
      'api/intelligence/create-attack-chain',
      { target: params.target, approach: params.approach },
      {
        system: 'You are an attack chain planning expert using MITRE ATT&CK framework.',
        user: `Target: ${params.target}\nProvide attack chain analysis with MITRE ATT&CK mapping.`,
      }
    );
  },
};

export const hexstrikeTechDetect: ToolDefinition = {
  id: 'hexstrike_tech_detect',
  name: 'Technology Detection',
  description: 'Detect technologies, frameworks, CMS, and software versions used by a target.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  parameters: [
    { name: 'target', type: 'string', description: 'Target URL', required: true },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_tech_detect',
      'api/intelligence/technology-detection',
      { target: params.target },
      {
        system: 'You are a technology detection expert for web applications.',
        user: `Target: ${params.target}\nProvide technology detection methodology.`,
      }
    );
  },
};

export const hexstrikePayloadGen: ToolDefinition = {
  id: 'hexstrike_payload_gen',
  name: 'Payload Generator',
  description: 'AI-powered payload generation for various vulnerability types (XSS, SQLi, SSRF, etc.).',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  dangerous: true,
  requiresConfirmation: true,
  parameters: [
    { name: 'type', type: 'string', description: 'Payload type: xss, sqli, ssrf, rce, lfi, rfi, xxe', required: true },
    { name: 'target', type: 'string', description: 'Target context for payload customization', required: false },
    { name: 'parameters', type: 'object', description: 'Additional payload parameters', required: false },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_payload_gen',
      'api/payloads/generate',
      { type: params.type, target: params.target, parameters: params.parameters },
      {
        system: 'You are a payload generation expert for authorized security testing.',
        user: `Type: ${params.type}, Target: ${params.target || 'generic'}\nProvide payload examples and testing methodology.`,
      }
    );
  },
};

// ===== HEXSTRIKE CLOUD TOOLS =====

export const hexstrikeProwler: ToolDefinition = {
  id: 'hexstrike_prowler',
  name: 'AWS Prowler',
  description: 'AWS security assessment with Prowler for compliance and best practice checks.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  parameters: [
    { name: 'service', type: 'string', description: 'AWS service to check (e.g. s3, ec2, iam)', required: false },
    { name: 'check', type: 'string', description: 'Specific check ID', required: false },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_prowler',
      'api/tools/prowler',
      { service: params.service, check: params.check },
      {
        system: 'You are an AWS security expert specializing in Prowler assessments.',
        user: `Service: ${params.service || 'all'}\nProvide AWS security assessment guidance.`,
      }
    );
  },
};

export const hexstrikeTrivy: ToolDefinition = {
  id: 'hexstrike_trivy',
  name: 'Trivy Scanner',
  description: 'Comprehensive vulnerability scanner for containers, filesystems, and Git repositories.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  parameters: [
    { name: 'target', type: 'string', description: 'Target: image name, filesystem path, or git repo', required: true },
    { name: 'scan_type', type: 'string', description: 'Scan type: image, filesystem, repo', required: false, default: 'image' },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_trivy',
      'api/tools/trivy',
      { target: params.target, scan_type: params.scan_type },
      {
        system: 'You are a container security expert specializing in Trivy scans.',
        user: `Target: ${params.target}, Type: ${params.scan_type}\nProvide container vulnerability scanning guidance.`,
      }
    );
  },
};

export const hexstrikeKubeHunter: ToolDefinition = {
  id: 'hexstrike_kube_hunter',
  name: 'KubeHunter K8s',
  description: 'Kubernetes security scanner for discovering vulnerabilities in K8s clusters.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  parameters: [
    { name: 'target', type: 'string', description: 'K8s cluster endpoint (optional, defaults to local)', required: false },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_kube_hunter',
      'api/tools/kube-hunter',
      { target: params.target },
      {
        system: 'You are a Kubernetes security expert.',
        user: `Target: ${params.target || 'local cluster'}\nProvide K8s security assessment guidance.`,
      }
    );
  },
};

// ===== HEXSTRIKE CTF TOOLS =====

export const hexstrikeCtfSolver: ToolDefinition = {
  id: 'hexstrike_ctf_solver',
  name: 'CTF Auto-Solver',
  description: 'AI-powered CTF challenge solver supporting web, crypto, pwn, reverse, and forensics categories.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  parameters: [
    { name: 'challenge_description', type: 'string', description: 'Description of the CTF challenge', required: true },
    { name: 'category', type: 'string', description: 'Challenge category: web, crypto, pwn, reverse, forensics, misc', required: false },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_ctf_solver',
      'api/ctf/auto-solve-challenge',
      { challenge_description: params.challenge_description, category: params.category },
      {
        system: 'You are a CTF challenge solving expert.',
        user: `Category: ${params.category || 'unknown'}\nChallenge: ${params.challenge_description}\nProvide solving approach and techniques.`,
      }
    );
  },
};

export const hexstrikeCryptoSolver: ToolDefinition = {
  id: 'hexstrike_crypto_solver',
  name: 'Crypto Solver',
  description: 'Cryptographic challenge solver for common CTF cipher types.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  parameters: [
    { name: 'challenge', type: 'string', description: 'The cryptographic challenge (ciphertext, encoded text, etc.)', required: true },
    { name: 'cipher_type', type: 'string', description: 'Cipher type: caesar, vigenere, base64, rsa, aes, xor, etc.', required: false },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_crypto_solver',
      'api/ctf/cryptography-solver',
      { challenge: params.challenge, cipher_type: params.cipher_type },
      {
        system: 'You are a cryptography expert specializing in CTF challenges.',
        user: `Cipher: ${params.cipher_type || 'unknown'}\nChallenge: ${params.challenge}\nProvide decryption approach.`,
      }
    );
  },
};

// ===== HEXSTRIKE VULN INTEL TOOLS =====

export const hexstrikeCveMonitor: ToolDefinition = {
  id: 'hexstrike_cve_monitor',
  name: 'CVE Monitor',
  description: 'Monitor and search CVEs for products, get latest vulnerability advisories.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  parameters: [
    { name: 'product', type: 'string', description: 'Product name to search CVEs for', required: false },
    { name: 'severity', type: 'string', description: 'Severity filter: critical, high, medium, low', required: false },
    { name: 'limit', type: 'number', description: 'Max results', required: false, default: 10 },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_cve_monitor',
      'api/vuln-intel/cve-monitor',
      { product: params.product, severity: params.severity, limit: params.limit },
      {
        system: 'You are a CVE intelligence expert.',
        user: `Product: ${params.product || 'latest'}, Severity: ${params.severity || 'all'}\nProvide CVE analysis guidance.`,
      }
    );
  },
};

export const hexstrikeExploitGen: ToolDefinition = {
  id: 'hexstrike_exploit_gen',
  name: 'Exploit Generator',
  description: 'AI-powered exploit code generation for known vulnerabilities with safety guardrails.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  dangerous: true,
  requiresConfirmation: true,
  parameters: [
    { name: 'cve', type: 'string', description: 'CVE identifier', required: false },
    { name: 'target', type: 'string', description: 'Target description', required: false },
    { name: 'type', type: 'string', description: 'Exploit type: web, network, local, dos', required: false },
  ],
  execute: async (params) => {
    return bridgeToBackend(
      'hexstrike_exploit_gen',
      'api/vuln-intel/exploit-generate',
      { cve: params.cve, target: params.target, type: params.type },
      {
        system: 'You are a vulnerability research expert. Provide exploit analysis for educational purposes.',
        user: `CVE: ${params.cve || 'unknown'}, Target: ${params.target}, Type: ${params.type}\nProvide vulnerability analysis and mitigation.`,
      }
    );
  },
};

// ===== HEXSTRIKE STATUS TOOL =====

export const hexstrikeStatus: ToolDefinition = {
  id: 'hexstrike_status',
  name: 'Backend Status',
  description: 'Check HexStrike Python backend status, available tools, and connection health.',
  category: 'HexStrike',
  source: 'hexstrike-backend',
  parameters: [
    { name: 'detail', type: 'string', description: 'Info level: basic, full', required: false, default: 'basic' },
  ],
  execute: async () => {
    const health = await hexstrikeClient.checkHealth();
    const tools = await hexstrikeClient.discoverTools();

    let output = `=== HexStrike Backend Status ===\n`;
    output += `Status: ${health.status === 'ok' ? '🟢 ONLINE' : health.status === 'offline' ? '🔴 OFFLINE' : '🟡 ' + health.status.toUpperCase()}\n`;
    output += `URL: ${hexstrikeClient.backendUrl}\n`;
    output += `Version: ${health.version}\n`;
    output += `Uptime: ${Math.floor(health.uptime / 60)} minutes\n`;
    output += `Total Tools: ${health.total_tools}\n`;

    if (health.detail === 'full' || tools.length > 0) {
      output += `\n=== Available Tools ===\n`;
      output += tools.slice(0, 50).join(', ');
      if (tools.length > 50) {
        output += `\n... and ${tools.length - 50} more`;
      }
    }

    return {
      success: health.status === 'ok',
      output,
      data: health,
    };
  },
};

// ===== ALL HEXSTRIKE BRIDGE TOOLS =====
export const hexstrikeBridgeTools: ToolDefinition[] = [
  // Recon / Scanning
  hexstrikePortScan,
  hexstrikeNuclei,
  hexstrikeGobuster,
  hexstrikeSubfinder,
  hexstrikeNikto,
  hexstrikeFfuf,
  hexstrikeAmass,
  hexstrikeHttpx,
  // Exploitation
  hexstrikeSqlmap,
  hexstrikeHydra,
  hexstrikeWpscan,
  // Intelligence / AI
  hexstrikeSmartScan,
  hexstrikeReconWorkflow,
  hexstrikeAttackChain,
  hexstrikeTechDetect,
  hexstrikePayloadGen,
  // Cloud
  hexstrikeProwler,
  hexstrikeTrivy,
  hexstrikeKubeHunter,
  // CTF
  hexstrikeCtfSolver,
  hexstrikeCryptoSolver,
  // Vuln Intel
  hexstrikeCveMonitor,
  hexstrikeExploitGen,
  // Status
  hexstrikeStatus,
];
