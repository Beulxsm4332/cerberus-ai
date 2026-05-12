// Cerberus AI v3.0 Cerberus — Unified Skill Registry System
// Integrates 9 pentesting/security tool repositories as agent skills

export interface Skill {
  id: string;
  name: string;
  emoji: string;
  category: SkillCategory;
  source: string; // GitHub repo name
  sourceUrl: string;
  description: string;
  capabilities: string[];
  tools: string[];
  commands?: string[];
  keywords: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  agentId?: string; // Primary agent that uses this skill
  detailMd?: string; // Path to detailed markdown
}

export type SkillCategory =
  | 'recon'           // Reconnaissance & OSINT
  | 'vuln-testing'    // Vulnerability Testing
  | 'exploitation'    // Exploitation & Attack
  | 'evasion'         // Evasion & Stealth
  | 'social-eng'      // Social Engineering
  | 'web-hacking'     // Web Application Security
  | 'mobile'          // Mobile Security
  | 'infra'           // Infrastructure & Network
  | 'cloud'           // Cloud & Container
  | 'red-team'        // Red Team / Adversary Simulation
  | 'dfir'            // Digital Forensics & IR
  | 'dark-web'        // Dark Web Intelligence
  | 'tool-catalog'    // Tool Reference / Knowledge
  | 'ai-ml';          // AI/ML Security

export const skillCategories: Record<SkillCategory, { label: string; emoji: string; color: string }> = {
  'recon':          { label: 'Recon & OSINT',        emoji: '🔍', color: '#6A0DAD' },
  'vuln-testing':   { label: 'Vulnerability Testing', emoji: '🛡️', color: '#DC143C' },
  'exploitation':   { label: 'Exploitation',          emoji: '💀', color: '#FF4500' },
  'evasion':        { label: 'Evasion & Stealth',     emoji: '👻', color: '#2ECC71' },
  'social-eng':     { label: 'Social Engineering',    emoji: '🎭', color: '#E91E63' },
  'web-hacking':    { label: 'Web Security',          emoji: '🌐', color: '#FF6B35' },
  'mobile':         { label: 'Mobile Security',       emoji: '📱', color: '#00BCD4' },
  'infra':          { label: 'Infrastructure',        emoji: '🏗️', color: '#795548' },
  'cloud':          { label: 'Cloud & Container',     emoji: '☁️', color: '#2196F3' },
  'red-team':       { label: 'Red Team',              emoji: '🔴', color: '#F44336' },
  'dfir':           { label: 'DFIR',                  emoji: '🔬', color: '#9C27B0' },
  'dark-web':       { label: 'Dark Web Intel',        emoji: '🕸️', color: '#37474F' },
  'tool-catalog':   { label: 'Tool Catalog',          emoji: '📚', color: '#607D8B' },
  'ai-ml':          { label: 'AI/ML Security',        emoji: '🤖', color: '#00E676' },
};

// ===== COMPLETE SKILL REGISTRY =====
export const skills: Skill[] = [
  // ==========================================
  // FROM: pentest-agents (H-mmer/pentest-agents)
  // ==========================================
  {
    id: 'hunt-xss',
    name: 'XSS Hunter',
    emoji: '🕷️',
    category: 'web-hacking',
    source: 'H-mmer/pentest-agents',
    sourceUrl: 'https://github.com/H-mmer/pentest-agents',
    description: 'Autonomous XSS vulnerability hunting agent dengan 2,605+ payloads, WAF bypass protocol, dan automated validation.',
    capabilities: ['Reflected XSS detection', 'Stored XSS detection', 'DOM XSS detection', 'WAF bypass', 'Context-aware payloads', 'Polyglot payloads', 'Mutation XSS', 'Automated PoC generation'],
    tools: ['xss-hunter agent', 'payloads.md (2,605 lines)', 'waf-bypass-protocol.md', 'chain-table.md', 'validate command'],
    commands: ['/hunt xss', '/validate xss', '/chain xss'],
    keywords: ['xss', 'cross-site scripting', 'stored xss', 'reflected xss', 'dom xss', 'xss payload'],
    difficulty: 'intermediate',
    agentId: 'phantom-executor',
  },
  {
    id: 'hunt-sqli',
    name: 'SQLi Hunter',
    emoji: '💉',
    category: 'web-hacking',
    source: 'H-mmer/pentest-agents',
    sourceUrl: 'https://github.com/H-mmer/pentest-agents',
    description: 'SQL Injection hunting agent dengan error-based, union-based, blind, dan time-based detection methodology.',
    capabilities: ['Error-based SQLi', 'UNION-based SQLi', 'Blind boolean SQLi', 'Time-based SQLi', 'Second-order SQLi', 'NoSQL injection', 'Database fingerprinting'],
    tools: ['sqli-hunter agent', 'payloads.md', 'techniques.md'],
    commands: ['/hunt sqli', '/validate sqli'],
    keywords: ['sql injection', 'sqli', 'union', 'blind sqli', 'error-based', 'database'],
    difficulty: 'intermediate',
    agentId: 'phantom-executor',
  },
  {
    id: 'hunt-ssrf',
    name: 'SSRF Hunter',
    emoji: '🔮',
    category: 'web-hacking',
    source: 'H-mmer/pentest-agents',
    sourceUrl: 'https://github.com/H-mmer/pentest-agents',
    description: 'Server-Side Request Forgery detection agent dengan internal network scanning dan cloud metadata access.',
    capabilities: ['SSRF detection', 'Internal port scanning', 'Cloud metadata (AWS/GCP/Azure)', 'Protocol smuggling', 'Filter bypass techniques'],
    tools: ['ssrf-hunter agent', 'payloads.md'],
    commands: ['/hunt ssrf', '/validate ssrf'],
    keywords: ['ssrf', 'server-side request forgery', 'internal network', 'cloud metadata', '169.254.169.254'],
    difficulty: 'advanced',
    agentId: 'phantom-executor',
  },
  {
    id: 'hunt-auth',
    name: 'Auth Tester',
    emoji: '🔑',
    category: 'web-hacking',
    source: 'H-mmer/pentest-agents',
    sourceUrl: 'https://github.com/H-mmer/pentest-agents',
    description: 'Authentication & authorization testing agent: IDOR, privilege escalation, JWT, OAuth, session management.',
    capabilities: ['IDOR detection', 'Privilege escalation', 'JWT attacks', 'OAuth abuse', 'Session fixation', 'Password reset flaws', '2FA bypass', 'Race condition in auth'],
    tools: ['auth-tester agent', 'idor-hunter agent', 'oauth-hunter agent'],
    commands: ['/hunt auth', '/hunt idor', '/validate auth'],
    keywords: ['idor', 'authentication', 'authorization', 'jwt', 'oauth', 'session', 'privilege escalation'],
    difficulty: 'advanced',
    agentId: 'phantom-executor',
  },
  {
    id: 'hunt-rce',
    name: 'RCE Hunter',
    emoji: '☠️',
    category: 'exploitation',
    source: 'H-mmer/pentest-agents',
    sourceUrl: 'https://github.com/H-mmer/pentest-agents',
    description: 'Remote Code Execution hunting agent (1,135 lines methodology) dengan CVE catalog, LFI-to-RCE chains, dan deserialization attacks.',
    capabilities: ['Command injection', 'Code injection', 'LFI to RCE chains', 'Deserialization attacks', 'Template injection (SSTI)', 'XXE to RCE', 'CVE matching (NVD)', 'Exploit chaining'],
    tools: ['rce-hunter agent', 'hunt-rce/SKILL.md (1,135 lines)', 'xxe-hunter agent', 'ssti-hunter agent'],
    commands: ['/hunt rce', '/validate rce', '/chain'],
    keywords: ['rce', 'remote code execution', 'command injection', 'deserialization', 'ssti', 'xxe', 'lfi', 'rfi'],
    difficulty: 'expert',
    agentId: 'phantom-executor',
  },
  {
    id: 'autopilot',
    name: 'Autopilot Mode',
    emoji: '🤖',
    category: 'vuln-testing',
    source: 'H-mmer/pentest-agents',
    sourceUrl: 'https://github.com/H-mmer/pentest-agents',
    description: 'Autonomous multi-vulnerability scanner: auto-discovers endpoints, hunts all vuln classes, chains bugs, generates reports.',
    capabilities: ['Full-spectrum autonomous hunting', 'Multi-vulnerability scanning', 'Attack chain building', 'Scope enforcement', 'Automated report generation', 'Platform submission (H1/BC)'],
    tools: ['autopilot command', 'scope_check.py', 'scaffold.py', 'brain.py (persistent tracking)'],
    commands: ['/autopilot', '/report', '/submit', '/dupcheck'],
    keywords: ['autopilot', 'auto scan', 'full scan', 'automated', 'bug bounty', 'hackerone', 'bugcrowd'],
    difficulty: 'advanced',
    agentId: 'onyx-overseer',
  },
  {
    id: 'bounty-platforms',
    name: 'Bounty Platform Integration',
    emoji: '🏆',
    category: 'tool-catalog',
    source: 'H-mmer/pentest-agents',
    sourceUrl: 'https://github.com/H-mmer/pentest-agents',
    description: 'MCP server untuk integrasi bug bounty platforms: HackerOne, Bugcrowd, Intigriti, Immunefi, YesWeHack + 11 stubs.',
    capabilities: ['List programs', 'Get scope/policy', 'Search hacktivity', 'Draft reports', 'Submit reports', 'Sync programs'],
    tools: ['mcp-bounty-server (7 tools)', 'HackerOne API', 'Bugcrowd API', 'Intigriti API'],
    keywords: ['bug bounty', 'hackerone', 'bugcrowd', 'intigriti', 'immunefi', 'program scope'],
    difficulty: 'intermediate',
    agentId: 'oracle-intel',
  },
  {
    id: 'writeup-search',
    name: 'Writeup Semantic Search',
    emoji: '📖',
    category: 'tool-catalog',
    source: 'H-mmer/pentest-agents',
    sourceUrl: 'https://github.com/H-mmer/pentest-agents',
    description: 'MCP server untuk semantic search pada writeup, teknik, dan payload dari 146+ security repos (FAISS + SQLite).',
    capabilities: ['Semantic writeup search', 'Technique search', 'Payload search', 'RAG from 146 repos', 'FAISS vector search'],
    tools: ['mcp-writeup-server (4 tools)', 'FAISS index', 'RAG builder'],
    commands: ['/brain'],
    keywords: ['writeup', 'technique', 'payload search', 'rag', 'semantic search'],
    difficulty: 'intermediate',
    agentId: 'oracle-intel',
  },
  {
    id: 'sast-pipeline',
    name: 'SAST Pipeline',
    emoji: '📊',
    category: 'vuln-testing',
    source: 'H-mmer/pentest-agents',
    sourceUrl: 'https://github.com/H-mmer/pentest-agents',
    description: '8-stage Static Application Security Testing pipeline: file-ranker, entry-mapper, danger-mapper, flow-tracer, gap-analyzer, devils-advocate, hunter, exploit-builder.',
    capabilities: ['File risk ranking', 'Entry point mapping', 'Danger zone mapping', 'Data flow tracing', 'Gap analysis', 'Devils advocate review', 'Automated hunting', 'Exploit building'],
    tools: ['8 SAST agents', 'Automated pipeline'],
    commands: ['/autopilot --sast'],
    keywords: ['sast', 'static analysis', 'code review', 'source code audit', 'security review'],
    difficulty: 'expert',
    agentId: 'phantom-executor',
  },

  // ==========================================
  // FROM: WebHackersWeapons (EranGoldman/WebHackersWeapons)
  // ==========================================
  {
    id: 'weapons-catalog',
    name: 'Web Weapons Catalog',
    emoji: '⚔️',
    category: 'tool-catalog',
    source: 'EranGoldman/WebHackersWeapons',
    sourceUrl: 'https://github.com/EranGoldman/WebHackersWeapons',
    description: 'Katalog 250+ web hacking tools terorganisir: 90+ kategori, reconnaissance, scanning, fuzzing, exploitation, proxy, dan extensions.',
    capabilities: ['Tool recommendation engine', 'Category-based tool search', 'Installation guidance', 'Tool comparison', 'Stack-specific tool suggestions'],
    tools: ['250+ tool YAML definitions', '90+ tag categories', 'Language-based filtering'],
    keywords: ['tool', 'tools', 'recommend tool', 'what tool', 'best tool', 'scanner', 'fuzzer', 'burp', 'nmap', 'nuclei'],
    difficulty: 'beginner',
    agentId: 'onyx-overseer',
  },

  // ==========================================
  // FROM: vulpine (thomasdullien/vulpine)
  // ==========================================
  {
    id: 'vulpine-vulndev',
    name: 'Vulpine VulnDev Pipeline',
    emoji: '🦊',
    category: 'vuln-testing',
    source: 'thomasdullien/vulpine',
    sourceUrl: 'https://github.com/thomasdullien/vulpine',
    description: 'Multi-agent vulnerability development pipeline untuk C/C++: build, fuzz, audit functions, crash analysis, exploit development.',
    capabilities: ['ASan/TSan/UBSan builds', 'Fuzzing per feature', 'Function-level auditing', 'Coverage-guided testing', 'Crash analysis (GDB)', 'Exploit chain development', 'Hot path analysis'],
    tools: ['8-stage pipeline', 'cppfunctrace', 'codenav', 'gcov-coverage', 'rr-debugger', 'fnaudit'],
    commands: ['vulpine build', 'vulpine fuzz', 'vulpine audit', 'vulpine exploit'],
    keywords: ['vulndev', 'vulnerability development', 'fuzzing', 'c++ audit', 'binary analysis', 'crash analysis', 'exploit chain'],
    difficulty: 'expert',
    agentId: 'phantom-executor',
  },

  // ==========================================
  // FROM: communitytools (transilienceai/communitytools)
  // ==========================================
  {
    id: 'skill-injection',
    name: 'Injection Testing Suite',
    emoji: '💉',
    category: 'vuln-testing',
    source: 'transilienceai/communitytools',
    sourceUrl: 'https://github.com/transilienceai/communitytools',
    description: 'Complete injection testing skill: SQL, NoSQL, OS Command, SSTI, XXE, LDAP/XPath injection — 100% CTF benchmark score.',
    capabilities: ['SQL injection (all types)', 'NoSQL injection', 'OS command injection', 'SSTI detection', 'XXE exploitation', 'LDAP injection', 'XPath injection'],
    tools: ['/injection skill', '160+ reference files', 'Payload databases'],
    commands: ['/injection'],
    keywords: ['injection', 'sql', 'nosql', 'command injection', 'ssti', 'xxe', 'ldap', 'xpath'],
    difficulty: 'advanced',
    agentId: 'phantom-executor',
  },
  {
    id: 'skill-client-side',
    name: 'Client-Side Security Suite',
    emoji: '🌐',
    category: 'web-hacking',
    source: 'transilienceai/communitytools',
    sourceUrl: 'https://github.com/transilienceai/communitytools',
    description: 'Client-side vulnerability testing: XSS (Reflected/Stored/DOM), CSRF, Clickjacking, CORS, Prototype Pollution.',
    capabilities: ['XSS (all types)', 'CSRF detection', 'Clickjacking', 'CORS misconfiguration', 'Prototype Pollution', 'PostMessage exploits', 'Open Redirect'],
    tools: ['/client-side skill', 'Reference files'],
    commands: ['/client-side'],
    keywords: ['xss', 'csrf', 'clickjacking', 'cors', 'prototype pollution', 'client-side'],
    difficulty: 'intermediate',
    agentId: 'phantom-executor',
  },
  {
    id: 'skill-server-side',
    name: 'Server-Side Security Suite',
    emoji: '⚙️',
    category: 'web-hacking',
    source: 'transilienceai/communitytools',
    sourceUrl: 'https://github.com/transilienceai/communitytools',
    description: 'Server-side vulnerability testing: SSRF, HTTP Smuggling, Path Traversal, File Upload, Deserialization, Host Header.',
    capabilities: ['SSRF', 'HTTP Request Smuggling', 'Path Traversal', 'Arbitrary File Upload', 'Insecure Deserialization', 'Host Header Injection'],
    tools: ['/server-side skill', 'Reference files'],
    commands: ['/server-side'],
    keywords: ['ssrf', 'http smuggling', 'path traversal', 'file upload', 'deserialization', 'host header'],
    difficulty: 'advanced',
    agentId: 'phantom-executor',
  },
  {
    id: 'skill-auth-sec',
    name: 'Authentication Security Suite',
    emoji: '🔐',
    category: 'web-hacking',
    source: 'transilienceai/communitytools',
    sourceUrl: 'https://github.com/transilienceai/communitytools',
    description: 'Authentication testing: bypass, JWT attacks, OAuth abuse, password attacks, 2FA/CAPTCHA bypass.',
    capabilities: ['Auth bypass', 'JWT attacks (none, alg confusion, forged)', 'OAuth abuse flows', 'Password attacks', '2FA bypass', 'CAPTCHA bypass', 'Session management'],
    tools: ['/authentication skill'],
    commands: ['/authentication'],
    keywords: ['auth', 'jwt', 'oauth', 'password', '2fa', 'captcha', 'session'],
    difficulty: 'advanced',
    agentId: 'phantom-executor',
  },
  {
    id: 'skill-api-security',
    name: 'API Security Suite',
    emoji: '🔌',
    category: 'web-hacking',
    source: 'transilienceai/communitytools',
    sourceUrl: 'https://github.com/transilienceai/communitytools',
    description: 'API security testing: GraphQL, REST API, WebSockets, Web LLM prompt injection.',
    capabilities: ['GraphQL introspection/abuse', 'REST API security', 'WebSocket testing', 'Web LLM prompt injection', 'API rate limit bypass', 'Broken Object Level Authorization'],
    tools: ['/api-security skill'],
    commands: ['/api-security'],
    keywords: ['api', 'graphql', 'rest', 'websocket', 'web llm', 'prompt injection', 'bola'],
    difficulty: 'advanced',
    agentId: 'phantom-executor',
  },
  {
    id: 'skill-recon',
    name: 'Reconnaissance Suite',
    emoji: '🔭',
    category: 'recon',
    source: 'transilienceai/communitytools',
    sourceUrl: 'https://github.com/transilienceai/communitytools',
    description: 'Full reconnaissance: subdomain discovery, port scanning, endpoint enumeration, tech stack identification.',
    capabilities: ['Subdomain enumeration', 'Port scanning', 'Endpoint discovery', 'Tech stack identification (17 domains)', 'WAF detection', 'CMS fingerprinting'],
    tools: ['/reconnaissance skill', '/techstack-identification skill'],
    commands: ['/reconnaissance', '/techstack-identification'],
    keywords: ['recon', 'subdomain', 'port scan', 'endpoint', 'tech stack', 'fingerprint', 'waf detect'],
    difficulty: 'beginner',
    agentId: 'oracle-intel',
  },
  {
    id: 'skill-osint',
    name: 'OSINT Suite',
    emoji: '👁️',
    category: 'recon',
    source: 'transilienceai/communitytools',
    sourceUrl: 'https://github.com/transilienceai/communitytools',
    description: 'Open Source Intelligence: repository enumeration, secret scanning, git history analysis, social media profiling.',
    capabilities: ['GitHub/GitLab enumeration', 'Secret scanning', 'Git history analysis', 'Social media profiling', 'Email harvesting', 'Domain intelligence'],
    tools: ['/osint skill', 'Reference files'],
    commands: ['/osint'],
    keywords: ['osint', 'secret scan', 'git history', 'github', 'social media', 'email harvest'],
    difficulty: 'intermediate',
    agentId: 'oracle-intel',
  },
  {
    id: 'skill-ai-threat',
    name: 'AI Threat Testing Suite',
    emoji: '🧠',
    category: 'ai-ml',
    source: 'transilienceai/communitytools',
    sourceUrl: 'https://github.com/transilienceai/communitytools',
    description: 'AI/LLM security testing: OWASP LLM Top 10, Agentic AI Top 10, prompt injection, model extraction.',
    capabilities: ['OWASP LLM Top 10 testing', 'Agentic AI Top 10 testing', 'Prompt injection', 'Jailbreaking', 'Model extraction', 'Data poisoning', 'Supply chain attacks on ML'],
    tools: ['/ai-threat-testing skill'],
    commands: ['/ai-threat-testing'],
    keywords: ['ai security', 'llm', 'prompt injection', 'jailbreak', 'owasp llm', 'model extraction'],
    difficulty: 'advanced',
    agentId: 'onyx-overseer',
  },
  {
    id: 'skill-cve-poc',
    name: 'CVE PoC Generator',
    emoji: '📋',
    category: 'vuln-testing',
    source: 'transilienceai/communitytools',
    sourceUrl: 'https://github.com/transilienceai/communitytools',
    description: 'CVE research & PoC generation: NVD lookup, vulnerability analysis, exploit development from CVE data.',
    capabilities: ['NVD CVE lookup', 'CVE analysis', 'PoC generation', 'Patch diffing', 'Exploit development from advisory'],
    tools: ['/cve-poc-generator skill', 'nvd-lookup.py'],
    commands: ['/cve-poc-generator'],
    keywords: ['cve', 'poc', 'nvd', 'vulnerability', 'advisory', 'exploit', 'patch'],
    difficulty: 'advanced',
    agentId: 'phantom-executor',
  },
  {
    id: 'skill-blockchain',
    name: 'Blockchain Security Suite',
    emoji: '⛓️',
    category: 'vuln-testing',
    source: 'transilienceai/communitytools',
    sourceUrl: 'https://github.com/transilienceai/communitytools',
    description: 'Smart contract & blockchain security: EVM storage analysis, DeFi exploit, reentrancy, flash loan attacks.',
    capabilities: ['Smart contract auditing', 'EVM storage analysis', 'DeFi exploit detection', 'Reentrancy attacks', 'Flash loan attacks', 'Access control flaws'],
    tools: ['/blockchain-security skill'],
    commands: ['/blockchain-security'],
    keywords: ['blockchain', 'smart contract', 'defi', 'evm', 'solidity', 'reentrancy', 'flash loan'],
    difficulty: 'expert',
    agentId: 'phantom-executor',
  },
  {
    id: 'skill-infra',
    name: 'Infrastructure Security Suite',
    emoji: '🏗️',
    category: 'infra',
    source: 'transilienceai/communitytools',
    sourceUrl: 'https://github.com/transilienceai/communitytools',
    description: 'Infrastructure security: AD, privilege escalation, exploit development, port scanning, DNS, MITM, VLAN hopping.',
    capabilities: ['Active Directory attacks', 'Privilege escalation (Linux/Windows)', 'Port scanning & service enumeration', 'DNS attacks', 'MITM attacks', 'VLAN hopping', 'IPv6 attacks', 'SMB exploitation'],
    tools: ['/infrastructure skill', '/system skill'],
    commands: ['/infrastructure', '/system'],
    keywords: ['active directory', 'privilege escalation', 'port scan', 'dns', 'mitm', 'vlan', 'smb', 'kerberos'],
    difficulty: 'advanced',
    agentId: 'phantom-executor',
  },
  {
    id: 'skill-cloud',
    name: 'Cloud & Container Security Suite',
    emoji: '☁️',
    category: 'cloud',
    source: 'transilienceai/communitytools',
    sourceUrl: 'https://github.com/transilienceai/communitytools',
    description: 'Cloud & container security: AWS, Azure, GCP misconfigurations, Docker escape, Kubernetes exploitation.',
    capabilities: ['AWS security testing', 'Azure security testing', 'GCP security testing', 'Docker escape', 'Kubernetes exploitation', 'Cloud misconfiguration', 'IAM abuse'],
    tools: ['/cloud-containers skill'],
    commands: ['/cloud-containers'],
    keywords: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'cloud', 'container', 'iam'],
    difficulty: 'advanced',
    agentId: 'phantom-executor',
  },
  {
    id: 'skill-social-eng',
    name: 'Social Engineering Suite',
    emoji: '🎭',
    category: 'social-eng',
    source: 'transilienceai/communitytools',
    sourceUrl: 'https://github.com/transilienceai/communitytools',
    description: 'Social engineering: phishing campaigns, pretexting, vishing, smishing, tailgating, security awareness.',
    capabilities: ['Phishing campaign creation', 'Pretexting scenarios', 'Vishing techniques', 'Smishing attacks', 'Tailgating', 'Security awareness assessment'],
    tools: ['/social-engineering skill'],
    commands: ['/social-engineering'],
    keywords: ['phishing', 'pretexting', 'vishing', 'smishing', 'tailgating', 'social engineering'],
    difficulty: 'intermediate',
    agentId: 'harbinger-social',
  },
  {
    id: 'skill-dfir',
    name: 'Digital Forensics & IR Suite',
    emoji: '🔬',
    category: 'dfir',
    source: 'transilienceai/communitytools',
    sourceUrl: 'https://github.com/transilienceai/communitytools',
    description: 'Digital forensics & incident response: memory analysis, disk forensics, network forensics, malware analysis.',
    capabilities: ['Memory forensics', 'Disk forensics', 'Network forensics', 'Malware analysis', 'Timeline analysis', 'Log analysis', 'Incident response'],
    tools: ['/dfir skill'],
    commands: ['/dfir'],
    keywords: ['forensics', 'incident response', 'memory analysis', 'malware analysis', 'disk forensics'],
    difficulty: 'expert',
    agentId: 'wraith-stealth',
  },
  {
    id: 'skill-coordination',
    name: 'Multi-Agent Coordination',
    emoji: '🎯',
    category: 'vuln-testing',
    source: 'transilienceai/communitytools',
    sourceUrl: 'https://github.com/transilienceai/communitytools',
    description: 'Coordinator/Executor/Validator pattern untuk multi-agent security testing dengan blind review system.',
    capabilities: ['Multi-agent orchestration', 'Coordinator pattern', 'Executor pattern (blind testing)', 'Validator pattern (blind review)', 'Attack chain management'],
    tools: ['/coordination skill', 'Coordinator agent', 'Executor agent', 'Validator agent'],
    commands: ['/coordination'],
    keywords: ['coordination', 'multi-agent', 'orchestrator', 'attack chain', 'blind review'],
    difficulty: 'expert',
    agentId: 'onyx-overseer',
  },
  {
    id: 'skill-source-scan',
    name: 'Source Code Scanner',
    emoji: '📝',
    category: 'vuln-testing',
    source: 'transilienceai/communitytools',
    sourceUrl: 'https://github.com/transilienceai/communitytools',
    description: 'SAST source code scanning: OWASP/CWE detection, dependency CVE scanning, code pattern analysis.',
    capabilities: ['OWASP vulnerability detection', 'CWE mapping', 'Dependency CVE scanning', 'Code pattern analysis', 'Security hotspot identification'],
    tools: ['/source-code-scanning skill'],
    commands: ['/source-code-scanning'],
    keywords: ['sast', 'source code', 'cwe', 'owasp', 'dependency', 'code scan'],
    difficulty: 'intermediate',
    agentId: 'phantom-executor',
  },
  {
    id: 'skill-firewall-review',
    name: 'Firewall Review Suite',
    emoji: '🧱',
    category: 'infra',
    source: 'transilienceai/communitytools',
    sourceUrl: 'https://github.com/transilienceai/communitytools',
    description: 'Firewall rule analysis & review: Cisco ASA, Palo Alto, Fortinet, AWS Security Groups, iptables, Azure NSG.',
    capabilities: ['Cisco ASA rule review', 'Palo Alto policy analysis', 'Fortinet rule audit', 'AWS SG analysis', 'iptables review', 'Azure NSG analysis'],
    tools: ['/firewall-review skill', 'Parsers for 6 firewall types'],
    commands: ['/firewall-review'],
    keywords: ['firewall', 'cisco asa', 'palo alto', 'fortinet', 'iptables', 'security group', 'nsg'],
    difficulty: 'intermediate',
    agentId: 'wraith-stealth',
  },
  {
    id: 'skill-hackerone',
    name: 'HackerOne Integration',
    emoji: '🏆',
    category: 'tool-catalog',
    source: 'transilienceai/communitytools',
    sourceUrl: 'https://github.com/transilienceai/communitytools',
    description: 'HackerOne platform integration: scope CSV parsing, parallel testing, PoC validation, report submission.',
    capabilities: ['Scope CSV parsing', 'Parallel testing', 'PoC validation', 'Report drafting', 'Submission workflow'],
    tools: ['/hackerone skill'],
    commands: ['/hackerone'],
    keywords: ['hackerone', 'bug bounty', 'scope', 'report', 'submission'],
    difficulty: 'intermediate',
    agentId: 'oracle-intel',
  },

  // ==========================================
  // FROM: SynthAPT (acedef/SynthAPT)
  // ==========================================
  {
    id: 'synthapt-playbook',
    name: 'SynthAPT Adversary Simulation',
    emoji: '🎯',
    category: 'red-team',
    source: 'acedef/SynthAPT',
    sourceUrl: 'https://github.com/acedef/SynthAPT',
    description: 'Playbook-based adversary simulation: JSON playbooks → position-independent shellcode/PE payloads mimicking real malware.',
    capabilities: ['Playbook generation (55+ opcodes)', 'Shellcode compilation', 'Process injection', 'Credential dumping', 'AD/LDAP manipulation', 'Lateral movement', 'Network operations', 'AI-assisted playbook generation'],
    tools: ['synthapt TUI editor', '55+ opcode operations', 'Claude/Ollama AI integration', 'Playbook compiler'],
    commands: ['synthapt new', 'synthapt compile', 'synthapt export-skill'],
    keywords: ['red team', 'adversary simulation', 'playbook', 'shellcode', 'mitre att&ck', 'payload generation', 'lateral movement'],
    difficulty: 'expert',
    agentId: 'wraith-stealth',
  },

  // ==========================================
  // FROM: darkwebspyder (Req999/darkwebspyder)
  // ==========================================
  {
    id: 'darkweb-spyder',
    name: 'DarkWeb Spyder',
    emoji: '🕷️',
    category: 'dark-web',
    source: 'Req999/darkwebspyder',
    sourceUrl: 'https://github.com/Req999/darkwebspyder',
    description: 'Dark web OSINT crawler: searches 10 dark web engines (Ahmia, Tor66, DarkSearch, etc.) via Tor SOCKS5h proxy.',
    capabilities: ['Multi-engine dark web search', '10 search engines', 'Tor network routing', 'Link extraction', 'NLP keyword extraction', 'Sentiment analysis'],
    tools: ['WebSpy.py', '10 dark web search engines', 'NLTK', 'TextBlob'],
    commands: ['python3 WebSpy.py -q "keyword"'],
    keywords: ['dark web', 'onion', 'tor', 'dark web search', 'ahmia', 'deep web'],
    difficulty: 'intermediate',
    agentId: 'oracle-intel',
  },

  // ==========================================
  // FROM: darkdump (Lynx463/darkdump)
  // ==========================================
  {
    id: 'darkdump-osint',
    name: 'DarkDump OSINT Pro',
    emoji: '🕸️',
    category: 'dark-web',
    source: 'Lynx463/darkdump',
    sourceUrl: 'https://github.com/Lynx463/darkdump',
    description: 'Enhanced dark web OSINT: search + scrape onion sites, extract emails, metadata, documents, images, sentiment analysis.',
    capabilities: ['Dark web search (Ahmia)', 'Full site scraping', 'Email extraction (regex)', 'Metadata extraction', 'Document discovery (30+ types)', 'Image gallery generation', 'Sentiment analysis', 'Keyword extraction (NLTK)'],
    tools: ['darkdump.py (341 lines)', 'headers/agents.py (UA rotation)', '--scrape and --proxy flags'],
    commands: ['python3 darkdump.py -q "keyword" -a 10 --scrape --proxy'],
    keywords: ['dark web', 'onion', 'scrape', 'email extraction', 'dark dump', 'osint'],
    difficulty: 'intermediate',
    agentId: 'oracle-intel',
  },

  // ==========================================
  // FROM: AgenticART (GitSolved/AgenticART)
  // ==========================================
  {
    id: 'agenticart-android',
    name: 'AgenticART Android Exploit',
    emoji: '🤖',
    category: 'mobile',
    source: 'GitSolved/AgenticART',
    sourceUrl: 'https://github.com/GitSolved/AgenticART',
    description: 'Android exploit training & generation: feedback loop (generate→execute→grade→fine-tune), 9-belt progression, APK analysis.',
    capabilities: ['Android exploit generation', 'ADB abuse', 'Intent hijacking', 'Frida hooking', 'APK decompilation (apktool/JADX)', 'Android 14 exploit chain', 'CVE matching for Android', 'LoRA fine-tuning for exploit specialization'],
    tools: ['agent/planner.py (11 phases)', 'dojo/sensei grading', 'dojo/mcp (APK tools)', 'core/exploits/', 'Docker sandbox', 'Benchmarks'],
    commands: ['agenticart plan', 'agenticart exploit', 'agenticart train'],
    keywords: ['android', 'apk', 'mobile', 'adb', 'frida', 'intent hijack', 'android exploit'],
    difficulty: 'expert',
    agentId: 'phantom-executor',
  },

  // ==========================================
  // FROM: Rio- / DarkWeb-Spy (iceeecreaamm/Rio-)
  // ==========================================
  {
    id: 'darkweb-rio',
    name: 'DarkWeb-Spy (Rio)',
    emoji: '👁️',
    category: 'dark-web',
    source: 'iceeecreaamm/Rio-',
    sourceUrl: 'https://github.com/iceeecreaamm/Rio-',
    description: 'Dark web OSINT crawler (alternative to Spyder): multi-engine search, NLP processing, Tor proxy support.',
    capabilities: ['Multi-engine dark web search', 'Tor routing', 'NLP keyword extraction', 'Sentiment analysis'],
    tools: ['WebSpy.py', 'NLTK', 'TextBlob'],
    commands: ['python3 WebSpy.py -q "keyword"'],
    keywords: ['dark web', 'onion', 'tor search', 'rio'],
    difficulty: 'intermediate',
    agentId: 'oracle-intel',
  },
];

// ===== SKILL SEARCH & FILTER =====
export function searchSkills(query: string, category?: SkillCategory): Skill[] {
  const lower = query.toLowerCase();
  return skills.filter(skill => {
    const matchesQuery = !query ||
      skill.name.toLowerCase().includes(lower) ||
      skill.description.toLowerCase().includes(lower) ||
      skill.keywords.some(k => k.includes(lower)) ||
      skill.capabilities.some(c => c.toLowerCase().includes(lower));
    const matchesCategory = !category || skill.category === category;
    return matchesQuery && matchesCategory;
  });
}

// Get skills by category
export function getSkillsByCategory(category: SkillCategory): Skill[] {
  return skills.filter(s => s.category === category);
}

// Get skills by agent
export function getSkillsByAgent(agentId: string): Skill[] {
  return skills.filter(s => s.agentId === agentId);
}

// Get skill by ID
export function getSkillById(id: string): Skill | undefined {
  return skills.find(s => s.id === id);
}

// Get skill categories with counts
export function getSkillCategoryStats(): { category: SkillCategory; count: number }[] {
  const counts: Record<string, number> = {};
  for (const skill of skills) {
    counts[skill.category] = (counts[skill.category] || 0) + 1;
  }
  return Object.entries(counts).map(([category, count]) => ({
    category: category as SkillCategory,
    count,
  })).sort((a, b) => b.count - a.count);
}

// Build skill context for agent system prompts
export function buildSkillContextForAgent(agentId: string): string {
  const agentSkills = getSkillsByAgent(agentId);
  if (agentSkills.length === 0) return '';

  let context = `\n\n## SKILL DAN TOOL YANG TERSEDIA\n\n`;
  context += `Sebagai agent Cerberus AI, Anda memiliki akses ke skill dan tools berikut:\n\n`;

  for (const skill of agentSkills) {
    context += `### ${skill.emoji} ${skill.name}\n`;
    context += `- **Sumber**: ${skill.source}\n`;
    context += `- **Deskripsi**: ${skill.description}\n`;
    context += `- **Kemampuan**: ${skill.capabilities.join(', ')}\n`;
    if (skill.commands && skill.commands.length > 0) {
      context += `- **Perintah**: ${skill.commands.join(', ')}\n`;
    }
    context += `\n`;
  }

  context += `Gunakan pengetahuan tentang tools ini untuk memberikan jawaban yang lebih akurat dan actionable.\n`;
  context += `Jika pengguna meminta tool recommendation, rujuk ke catalog yang sesuai.\n`;
  return context;
}

// Get quick stats
export function getSkillStats() {
  return {
    totalSkills: skills.length,
    totalCategories: new Set(skills.map(s => s.category)).size,
    totalSources: new Set(skills.map(s => s.source)).size,
    totalTools: skills.reduce((acc, s) => acc + s.tools.length, 0),
    categoryBreakdown: getSkillCategoryStats(),
  };
}
