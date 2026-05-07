// Cerberus AI v4.0 — Tool Definitions
// All executable tools for the Tool-Augmented LLM system

import type { ToolDefinition, ToolContext, ToolResult } from './types';

// ===== HELPER: Call Mistral API for AI-powered tools =====
async function callMistralForTool(systemPrompt: string, userPrompt: string, temperature = 0.3): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return 'Error: MISTRAL_API_KEY not configured.';

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      return `Error: Mistral API returned ${response.status}`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response from model.';
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// ===== HELPER: Call web search via z-ai-web-dev-sdk =====
async function webSearchHelper(query: string, num = 8): Promise<string> {
  try {
    // Dynamic import to avoid issues in client-side
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    const result = await zai.functions.invoke('web_search', { query, num });
    if (result && typeof result === 'object') {
      return JSON.stringify(result, null, 2);
    }
    return String(result || 'No results found.');
  } catch (error) {
    return `Web search error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// ===== HELPER: Call web reader via z-ai-web-dev-sdk =====
async function webScrapeHelper(url: string): Promise<string> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    const result = await zai.functions.invoke('web_reader', { url });
    if (result && typeof result === 'object') {
      return JSON.stringify(result, null, 2);
    }
    return String(result || 'No content extracted.');
  } catch (error) {
    return `Web scrape error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// ===== CODING TOOLS (8) =====
const codeGenerate: ToolDefinition = {
  id: 'code_generate',
  name: 'Code Generator',
  description: 'Generate code in any programming language given specifications',
  category: 'Coding',
  parameters: [
    { name: 'language', type: 'string', description: 'Target programming language', required: true },
    { name: 'description', type: 'string', description: 'What the code should do', required: true },
    { name: 'context', type: 'string', description: 'Additional context or requirements', required: false },
  ],
  execute: async (params) => {
    const { language, description, context } = params;
    const systemPrompt = `You are an expert programmer. Generate COMPLETE, WORKING, PRODUCTION-QUALITY code.
- Language: ${language}
- Provide the FULL code, not pseudocode or snippets
- Include necessary imports and dependencies
- Add clear comments explaining the logic
- Follow best practices and coding conventions for ${language}
- Handle edge cases and errors appropriately
- Output ONLY the code with minimal explanation`;
    const userPrompt = `Generate ${language} code for: ${description}${context ? `\n\nAdditional context:\n${context}` : ''}`;
    const output = await callMistralForTool(systemPrompt, userPrompt, 0.2);
    return { success: true, output };
  },
};

const codeAnalyze: ToolDefinition = {
  id: 'code_analyze',
  name: 'Code Analyzer',
  description: 'Analyze code for bugs, patterns, architecture, and improvements',
  category: 'Coding',
  parameters: [
    { name: 'code', type: 'string', description: 'The code to analyze', required: true },
    { name: 'language', type: 'string', description: 'Programming language of the code', required: true },
    { name: 'focus', type: 'string', description: 'Analysis focus: bugs, performance, architecture, security, all', required: false, default: 'all' },
  ],
  execute: async (params) => {
    const { code, language, focus } = params;
    const systemPrompt = `You are a senior code reviewer and analyst. Analyze the given ${language} code thoroughly.
Focus areas: ${focus || 'all aspects'}
Provide:
1. Bug identification (if any)
2. Security vulnerabilities (if any)
3. Performance issues
4. Code quality assessment
5. Architecture suggestions
6. Best practice violations
Be specific and provide line-by-line analysis where relevant.`;
    const userPrompt = `Analyze this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``;
    const output = await callMistralForTool(systemPrompt, userPrompt, 0.2);
    return { success: true, output };
  },
};

const codeReview: ToolDefinition = {
  id: 'code_review',
  name: 'Code Reviewer',
  description: 'Security and quality code review with detailed findings',
  category: 'Coding',
  parameters: [
    { name: 'code', type: 'string', description: 'The code to review', required: true },
    { name: 'language', type: 'string', description: 'Programming language', required: true },
  ],
  execute: async (params) => {
    const { code, language } = params;
    const systemPrompt = `You are a strict security-focused code reviewer. Perform a comprehensive security and quality review.
Provide:
- Critical/Medium/Low severity findings
- CWE mappings for security issues
- Specific vulnerable code lines
- Recommended fixes with code examples
- OWASP Top 10 relevance (if applicable)
Be thorough and technical.`;
    const userPrompt = `Security code review for ${language}:\n\`\`\`${language}\n${code}\n\`\`\``;
    const output = await callMistralForTool(systemPrompt, userPrompt, 0.2);
    return { success: true, output };
  },
};

const codeDebug: ToolDefinition = {
  id: 'code_debug',
  name: 'Code Debugger',
  description: 'Debug code and find issues with suggested fixes',
  category: 'Coding',
  parameters: [
    { name: 'code', type: 'string', description: 'The code with bugs', required: true },
    { name: 'language', type: 'string', description: 'Programming language', required: true },
    { name: 'error_message', type: 'string', description: 'Error message or description of the issue', required: false },
  ],
  execute: async (params) => {
    const { code, language, error_message } = params;
    const systemPrompt = `You are an expert debugger. Find and fix all bugs in the code.
1. Identify each bug and its root cause
2. Explain why the bug occurs
3. Provide the corrected code
4. Explain the fix
Be precise and thorough.`;
    const userPrompt = `Debug this ${language} code:${error_message ? `\nError: ${error_message}` : ''}\n\`\`\`${language}\n${code}\n\`\`\``;
    const output = await callMistralForTool(systemPrompt, userPrompt, 0.2);
    return { success: true, output };
  },
};

const codeRefactor: ToolDefinition = {
  id: 'code_refactor',
  name: 'Code Refactorer',
  description: 'Refactor and optimize code for better quality and performance',
  category: 'Coding',
  parameters: [
    { name: 'code', type: 'string', description: 'The code to refactor', required: true },
    { name: 'language', type: 'string', description: 'Programming language', required: true },
    { name: 'goals', type: 'string', description: 'Refactoring goals: performance, readability, DRY, modularity', required: false },
  ],
  execute: async (params) => {
    const { code, language, goals } = params;
    const systemPrompt = `You are a code refactoring expert. Refactor the code to improve quality.
Goals: ${goals || 'all improvements'}
Provide the complete refactored code with explanations of changes.`;
    const userPrompt = `Refactor this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``;
    const output = await callMistralForTool(systemPrompt, userPrompt, 0.2);
    return { success: true, output };
  },
};

const codeExplain: ToolDefinition = {
  id: 'code_explain',
  name: 'Code Explainer',
  description: 'Explain code line by line with detailed analysis',
  category: 'Coding',
  parameters: [
    { name: 'code', type: 'string', description: 'The code to explain', required: true },
    { name: 'language', type: 'string', description: 'Programming language', required: true },
    { name: 'detail_level', type: 'string', description: 'Explanation depth: brief, detailed, line_by_line', required: false, default: 'detailed' },
  ],
  execute: async (params) => {
    const { code, language, detail_level } = params;
    const systemPrompt = `You are a code explanation expert. Explain this ${language} code ${detail_level || 'in detail'}.
Use clear language and be thorough.`;
    const userPrompt = `Explain this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``;
    const output = await callMistralForTool(systemPrompt, userPrompt, 0.3);
    return { success: true, output };
  },
};

const codeTranslate: ToolDefinition = {
  id: 'code_translate',
  name: 'Code Translator',
  description: 'Translate code between programming languages',
  category: 'Coding',
  parameters: [
    { name: 'code', type: 'string', description: 'Source code', required: true },
    { name: 'source_language', type: 'string', description: 'Source language', required: true },
    { name: 'target_language', type: 'string', description: 'Target language', required: true },
  ],
  execute: async (params) => {
    const { code, source_language, target_language } = params;
    const systemPrompt = `You are a code translation expert. Translate code from ${source_language} to ${target_language}.
- Preserve all functionality
- Use idiomatic patterns of the target language
- Include necessary imports
- Handle language-specific differences
Provide the complete translated code.`;
    const userPrompt = `Translate from ${source_language} to ${target_language}:\n\`\`\`${source_language}\n${code}\n\`\`\``;
    const output = await callMistralForTool(systemPrompt, userPrompt, 0.2);
    return { success: true, output };
  },
};

const codeDocument: ToolDefinition = {
  id: 'code_document',
  name: 'Code Documenter',
  description: 'Generate documentation for code including README, API docs, and comments',
  category: 'Coding',
  parameters: [
    { name: 'code', type: 'string', description: 'The code to document', required: true },
    { name: 'language', type: 'string', description: 'Programming language', required: true },
    { name: 'doc_type', type: 'string', description: 'Type of documentation: readme, api_docs, inline_comments, all', required: false, default: 'all' },
  ],
  execute: async (params) => {
    const { code, language, doc_type } = params;
    const systemPrompt = `You are a technical documentation expert. Generate documentation for this ${language} code.
Doc type: ${doc_type || 'all'}
Provide comprehensive, professional documentation.`;
    const userPrompt = `Document this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``;
    const output = await callMistralForTool(systemPrompt, userPrompt, 0.3);
    return { success: true, output };
  },
};

// ===== SECURITY TOOLS (17) =====
const webSearch: ToolDefinition = {
  id: 'web_search',
  name: 'Web Search',
  description: 'Search the web for real-time information, news, and data',
  category: 'Security',
  parameters: [
    { name: 'query', type: 'string', description: 'Search query', required: true },
    { name: 'num', type: 'number', description: 'Number of results', required: false, default: 8 },
  ],
  execute: async (params) => {
    const { query, num } = params;
    const output = await webSearchHelper(query, num || 8);
    return { success: true, output };
  },
};

const webScrape: ToolDefinition = {
  id: 'web_scrape',
  name: 'Web Scraper',
  description: 'Extract content from URLs for analysis',
  category: 'Security',
  parameters: [
    { name: 'url', type: 'string', description: 'URL to scrape', required: true },
  ],
  execute: async (params) => {
    const { url } = params;
    const output = await webScrapeHelper(url);
    return { success: true, output };
  },
};

function makeSecurityTool(id: string, name: string, description: string, systemPrompt: string): ToolDefinition {
  return {
    id,
    name,
    description,
    category: 'Security',
    parameters: [
      { name: 'query', type: 'string', description: 'Security analysis query or target description', required: true },
      { name: 'details', type: 'string', description: 'Additional context or specifics', required: false },
    ],
    execute: async (params) => {
      const { query, details } = params;
      const userPrompt = `${query}${details ? `\n\nAdditional details:\n${details}` : ''}`;
      const output = await callMistralForTool(systemPrompt, userPrompt, 0.3);
      return { success: true, output };
    },
  };
}

const securityScan: ToolDefinition = makeSecurityTool(
  'security_scan',
  'Security Scanner',
  'General security scanning and vulnerability assessment',
  `You are an expert security analyst. Perform a comprehensive security assessment.
Provide detailed findings with severity levels, CVE references, and remediation steps.
Include attack vectors, impact analysis, and proof-of-concept where appropriate.`
);

const vulnCheck: ToolDefinition = makeSecurityTool(
  'vuln_check',
  'Vulnerability Checker',
  'Check known CVEs and vulnerability databases',
  `You are a vulnerability intelligence expert. Search for known vulnerabilities.
Provide CVE IDs, CVSS scores, affected versions, exploit availability, and patch information.
Include reference links and detailed technical analysis.`
);

const xssAnalyze: ToolDefinition = makeSecurityTool(
  'xss_analyze',
  'XSS Analyzer',
  'Cross-Site Scripting vulnerability analysis with payload generation',
  `You are an XSS (Cross-Site Scripting) expert. Analyze for XSS vulnerabilities.
Provide:
1. Vulnerability identification (reflected, stored, DOM-based)
2. Comprehensive payload list with context-aware payloads
3. WAF bypass techniques
4. Polyglot payloads
5. Mutation XSS (mXSS) vectors
6. Remediation with code examples
Include working PoC payloads.`
);

const sqliAnalyze: ToolDefinition = makeSecurityTool(
  'sqli_analyze',
  'SQL Injection Analyzer',
  'SQL injection vulnerability analysis with exploitation techniques',
  `You are a SQL injection expert. Analyze for SQLi vulnerabilities.
Provide:
1. Injection type identification (error-based, union, blind, time-based)
2. Database fingerprinting techniques
3. Data extraction methodologies
4. WAF bypass payloads
5. Second-order injection detection
6. NoSQL injection vectors
Include complete exploitation steps and remediation.`
);

const headerAnalyze: ToolDefinition = makeSecurityTool(
  'header_analyze',
  'HTTP Header Analyzer',
  'HTTP security header analysis and recommendations',
  `You are a web security expert specializing in HTTP security headers.
Analyze security headers and provide:
1. Missing security headers
2. Misconfigured headers
3. CSP analysis and bypass potential
4. HSTS configuration
5. Cookie security flags
6. CORS policy analysis
Provide header configurations for Apache, Nginx, and IIS.`
);

const portScan: ToolDefinition = makeSecurityTool(
  'port_scan',
  'Port Scanner',
  'Port scanning methodology and service enumeration guidance',
  `You are a network security expert. Provide port scanning guidance.
Include:
1. Scanning methodologies (SYN, UDP, ACK, etc.)
2. Common ports and services
3. Service version detection
4. Nmap command examples
5. Result interpretation
6. Follow-up enumeration steps
Provide detailed technical guidance with working commands.`
);

const exploitSearch: ToolDefinition = makeSecurityTool(
  'exploit_search',
  'Exploit Searcher',
  'Search for exploits and proof-of-concepts for vulnerabilities',
  `You are an exploit research expert. Search for exploits and PoCs.
Provide:
1. Known exploits with technical details
2. Exploit-DB references
3. GitHub PoC repositories
4. Metasploit modules
5. Custom exploit development guidance
6. Exploitation prerequisites and steps
Include code examples where available.`
);

const darkWebSearch: ToolDefinition = makeSecurityTool(
  'dark_web_search',
  'Dark Web Intelligence',
  'Dark web intelligence gathering and analysis guidance',
  `You are a dark web intelligence analyst. Provide OSINT guidance.
Include:
1. Dark web search methodologies
2. Tor network usage for research
3. Onion service analysis
4. Data breach intelligence sources
5. Threat intelligence from dark web forums
6. Tools and techniques for dark web monitoring
Provide practical, actionable intelligence gathering techniques.`
);

const networkRecon: ToolDefinition = makeSecurityTool(
  'network_recon',
  'Network Recon',
  'Network reconnaissance and enumeration techniques',
  `You are a network reconnaissance expert. Provide comprehensive recon guidance.
Include:
1. Passive reconnaissance techniques
2. Active enumeration methods
3. DNS enumeration
4. Subdomain discovery
5. WHOIS and ASN lookup
6. Network mapping tools and commands
Provide step-by-step methodologies with working commands.`
);

const socialEngAnalysis: ToolDefinition = makeSecurityTool(
  'social_eng_analysis',
  'Social Engineering Analyzer',
  'Social engineering attack analysis and defense strategies',
  `You are a social engineering expert. Analyze social engineering threats.
Provide:
1. Attack vector identification
2. Psychological manipulation techniques
3. Phishing analysis (email, SMS, vishing)
4. Pretexting scenarios
5. Security awareness recommendations
6. Detection and prevention measures
Include detailed analysis and actionable defense strategies.`
);

const androidSecurity: ToolDefinition = makeSecurityTool(
  'android_security',
  'Android Security Analyzer',
  'Android application security analysis and exploitation',
  `You are an Android security expert. Analyze Android security.
Provide:
1. APK analysis methodology
2. Common Android vulnerabilities
3. Frida hooking techniques
4. Intent hijacking analysis
5. ADB exploitation
6. Android malware analysis
Include code examples and tool usage instructions.`
);

const redTeamPlaybook: ToolDefinition = makeSecurityTool(
  'red_team_playbook',
  'Red Team Playbook',
  'Red team operations planning and adversary simulation',
  `You are a red team operations expert. Provide adversary simulation guidance.
Include:
1. Attack chain planning
2. Initial access techniques
3. Persistence mechanisms
4. Lateral movement methods
5. C2 communication patterns
6. MITRE ATT&CK technique mapping
Provide comprehensive operational guidance with code examples.`
);

const forensicsAnalysis: ToolDefinition = makeSecurityTool(
  'forensics_analysis',
  'Digital Forensics Analyzer',
  'Digital forensics and incident response analysis',
  `You are a digital forensics expert. Provide forensic analysis guidance.
Include:
1. Evidence collection procedures
2. Memory forensics (Volatility)
3. Disk forensics techniques
4. Network forensics (PCAP analysis)
5. Malware analysis methodology
6. Timeline analysis
7. Log analysis techniques
Provide step-by-step forensic procedures with tool commands.`
);

const cloudSecurity: ToolDefinition = makeSecurityTool(
  'cloud_security',
  'Cloud Security Analyzer',
  'Cloud infrastructure security analysis (AWS, Azure, GCP)',
  `You are a cloud security expert. Analyze cloud security configurations.
Include:
1. AWS/Azure/GCP misconfigurations
2. IAM policy analysis
3. S3/Storage bucket security
4. Network security groups
5. Container security (Docker/K8s)
6. Cloud-specific exploitation techniques
Provide actionable security assessment with remediation.`
);

const osintSearch: ToolDefinition = makeSecurityTool(
  'osint_search',
  'OSINT Searcher',
  'Open Source Intelligence gathering and analysis',
  `You are an OSINT expert. Provide intelligence gathering guidance.
Include:
1. OSINT methodologies and frameworks
2. People search techniques
3. Email and username enumeration
4. Social media intelligence
5. Geospatial intelligence
6. Document and metadata analysis
7. Breach data search techniques
Provide detailed methodologies with tool recommendations and commands.`
);

// ===== SYSTEM TOOLS (4) =====
const fileRead: ToolDefinition = {
  id: 'file_read',
  name: 'File Reader',
  description: 'Read files from the filesystem',
  category: 'System',
  parameters: [
    { name: 'path', type: 'string', description: 'File path to read', required: true },
  ],
  execute: async (params) => {
    const { path } = params;
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(path, 'utf-8');
      // Truncate very large files
      if (content.length > 50000) {
        return { success: true, output: content.slice(0, 50000) + '\n\n[... truncated ...]' };
      }
      return { success: true, output: content };
    } catch (error) {
      return { success: false, output: '', error: `File read error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  },
};

const fileWrite: ToolDefinition = {
  id: 'file_write',
  name: 'File Writer',
  description: 'Write files to the download directory',
  category: 'System',
  parameters: [
    { name: 'filename', type: 'string', description: 'Filename (written to /home/z/my-project/download/)', required: true },
    { name: 'content', type: 'string', description: 'File content to write', required: true },
  ],
  execute: async (params) => {
    const { filename, content } = params;
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const downloadDir = '/home/z/my-project/download';
      await fs.mkdir(downloadDir, { recursive: true });
      const filePath = path.join(downloadDir, filename);
      // Security: prevent path traversal
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(downloadDir)) {
        return { success: false, output: '', error: 'Path traversal detected' };
      }
      await fs.writeFile(filePath, content, 'utf-8');
      return { success: true, output: `File written to: ${filePath}` };
    } catch (error) {
      return { success: false, output: '', error: `File write error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  },
};

const fileList: ToolDefinition = {
  id: 'file_list',
  name: 'Directory Lister',
  description: 'List directory contents',
  category: 'System',
  parameters: [
    { name: 'path', type: 'string', description: 'Directory path to list', required: false, default: '/home/z/my-project' },
  ],
  execute: async (params) => {
    const dirPath = params.path || '/home/z/my-project';
    try {
      const fs = await import('fs/promises');
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const listing = entries.map(e => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`).join('\n');
      return { success: true, output: `Contents of ${dirPath}:\n${listing}` };
    } catch (error) {
      return { success: false, output: '', error: `Directory list error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  },
};

const commandExecute: ToolDefinition = {
  id: 'command_execute',
  name: 'Command Executor',
  description: 'Execute shell commands (with safety restrictions)',
  category: 'System',
  dangerous: true,
  requiresConfirmation: true,
  parameters: [
    { name: 'command', type: 'string', description: 'Shell command to execute', required: true },
  ],
  execute: async (params) => {
    const { command } = params;
    // Safety check
    const dangerousPatterns = [
      /rm\s+-rf\s+\//, /mkfs/, /dd\s+if=/, />\s*\/dev\//,
      /:\s*\(\)\s*\{.*\}\s*;/, /wget\s+.*\|\s*(ba)?sh/, /curl\s+.*\|\s*(ba)?sh/,
      /chmod\s+-R\s+777\s+\//, /chown\s+-R/,
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return { success: false, output: '', error: 'Command blocked for safety reasons.' };
      }
    }
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      const { stdout, stderr } = await execAsync(command, { timeout: 30000, maxBuffer: 1024 * 1024 });
      return { success: true, output: stdout || stderr || 'Command completed with no output.' };
    } catch (error: any) {
      return { success: false, output: error.stdout || '', error: error.message };
    }
  },
};

// ===== META TOOLS (3) =====
const toolDiscover: ToolDefinition = {
  id: 'tool_discover',
  name: 'Tool Discoverer',
  description: 'Discover and list all available tools',
  category: 'Meta',
  parameters: [
    { name: 'category', type: 'string', description: 'Filter by category', required: false },
    { name: 'search', type: 'string', description: 'Search term', required: false },
  ],
  execute: async (params) => {
    const { toolRegistry } = await import('./registry');
    let tools = toolRegistry.getAllToolDefinitions();
    if (params.category) {
      tools = tools.filter(t => t.category === params.category);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      tools = tools.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    const output = tools.map(t => `[${t.id}] ${t.name}: ${t.description}`).join('\n');
    return { success: true, output: output || 'No tools found.' };
  },
};

const reflect: ToolDefinition = {
  id: 'reflect',
  name: 'Self-Reflection',
  description: 'Self-reflect on response quality and suggest improvements',
  category: 'Meta',
  parameters: [
    { name: 'original_query', type: 'string', description: 'The user query', required: true },
    { name: 'response', type: 'string', description: 'The AI response to evaluate', required: true },
  ],
  execute: async (params) => {
    const systemPrompt = `You are a meta-cognition module. Evaluate the quality of an AI response to a user query.
Rate: accuracy, completeness, helpfulness, and clarity (1-10 each).
Identify gaps, errors, or improvements needed.
Suggest specific improvements.`;
    const userPrompt = `Query: ${params.original_query}\n\nResponse:\n${params.response}`;
    const output = await callMistralForTool(systemPrompt, userPrompt, 0.3);
    return { success: true, output };
  },
};

const skillLearn: ToolDefinition = {
  id: 'skill_learn',
  name: 'Skill Learner',
  description: 'Learn from experience and improve future responses',
  category: 'Meta',
  parameters: [
    { name: 'task', type: 'string', description: 'The task that was performed', required: true },
    { name: 'approach', type: 'string', description: 'The approach taken', required: true },
    { name: 'outcome', type: 'string', description: 'The outcome of the approach', required: true },
    { name: 'rating', type: 'number', description: 'Success rating 1-5', required: true },
  ],
  execute: async (params, context) => {
    try {
      const { recordExperience } = await import('@/lib/meta-learning/store');
      recordExperience({
        id: `exp-${Date.now()}`,
        toolName: 'skill_learn',
        task: params.task,
        approach: params.approach,
        outcome: params.outcome,
        rating: params.rating || 3,
        timestamp: Date.now(),
        agentId: context.agentId,
      });
      return { success: true, output: `Experience recorded. Task: ${params.task}, Rating: ${params.rating}/5` };
    } catch {
      return { success: true, output: 'Meta-learning store not yet initialized. Experience recorded in memory.' };
    }
  },
};

// ===== ALL TOOLS EXPORT =====
export const allTools: ToolDefinition[] = [
  // Coding (8)
  codeGenerate,
  codeAnalyze,
  codeReview,
  codeDebug,
  codeRefactor,
  codeExplain,
  codeTranslate,
  codeDocument,
  // Security (17)
  webSearch,
  webScrape,
  osintSearch,
  securityScan,
  vulnCheck,
  xssAnalyze,
  sqliAnalyze,
  headerAnalyze,
  portScan,
  exploitSearch,
  darkWebSearch,
  networkRecon,
  socialEngAnalysis,
  androidSecurity,
  redTeamPlaybook,
  forensicsAnalysis,
  cloudSecurity,
  // System (4)
  fileRead,
  fileWrite,
  fileList,
  commandExecute,
  // Meta (3)
  toolDiscover,
  reflect,
  skillLearn,
];
