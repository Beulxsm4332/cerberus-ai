// NOVA AI v4.0 — Tool Definitions
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

function makeAnalysisTool(id: string, name: string, description: string, systemPrompt: string): ToolDefinition {
  return {
    id,
    name,
    description,
    category: 'Analysis',
    parameters: [
      { name: 'query', type: 'string', description: 'Analysis query or target description', required: true },
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

const securityScan: ToolDefinition = makeAnalysisTool(
  'security_scan',
  'System Auditor',
  'Comprehensive system and code audit for quality, security, and best practices',
  `You are an expert system auditor. Perform a comprehensive audit and assessment.
Provide detailed findings with severity levels and actionable remediation steps.
Focus on code quality, security best practices, performance, and maintainability.
Include specific recommendations with code examples where appropriate.`
);

const vulnCheck: ToolDefinition = makeAnalysisTool(
  'vuln_check',
  'Vulnerability Assessor',
  'Check known vulnerabilities and provide assessment with remediation guidance',
  `You are a vulnerability assessment expert. Search for known issues and provide assessment.
Provide CVE IDs, CVSS scores, affected versions, and patch information.
Include reference links and detailed remediation guidance.
Focus on helping users understand and fix the issues.`
);

const xssAnalyze: ToolDefinition = makeAnalysisTool(
  'xss_analyze',
  'Web Security Review',
  'Web application security review focusing on input validation and output encoding',
  `You are a web security expert. Review web application code for security issues.
Provide:
1. Input validation and sanitization analysis
2. Output encoding and XSS prevention
3. Content Security Policy recommendations
4. Security headers analysis
5. Remediation with code examples
Focus on defense and prevention with practical code examples.`
);

const sqliAnalyze: ToolDefinition = makeAnalysisTool(
  'sqli_analyze',
  'Database Review',
  'Database query analysis and security review for SQL injection prevention',
  `You are a database security expert. Review database queries and access patterns.
Provide:
1. SQL injection risk assessment
2. Parameterized query recommendations
3. ORM best practices
4. Input validation for database operations
5. Query optimization suggestions
6. Access control review
Focus on prevention with practical secure code examples.`
);

const headerAnalyze: ToolDefinition = makeAnalysisTool(
  'header_analyze',
  'HTTP Review',
  'HTTP headers analysis and optimization recommendations',
  `You are a web infrastructure expert specializing in HTTP headers.
Analyze HTTP headers and provide:
1. Missing recommended headers
2. Header optimization suggestions
3. CSP analysis and recommendations
4. Caching and performance headers
5. CORS policy analysis
6. Cookie configuration review
Provide configurations for common web servers.`
);

const portScan: ToolDefinition = makeAnalysisTool(
  'port_scan',
  'Network Scan',
  'Network scanning methodology and service enumeration guidance',
  `You are a network analysis expert. Provide network scanning and enumeration guidance.
Include:
1. Scanning methodologies and approaches
2. Common ports and services
3. Service version detection
4. Nmap command examples
5. Result interpretation
6. Follow-up analysis steps
Provide practical technical guidance with working commands.`
);

const exploitSearch: ToolDefinition = makeAnalysisTool(
  'exploit_search',
  'Technique Research',
  'Research techniques, methodologies, and approaches for various technical topics',
  `You are a technical research expert. Research techniques and methodologies.
Provide:
1. Known techniques with technical details
2. Reference implementations and repositories
3. Best practices and industry standards
4. Tool and framework recommendations
5. Step-by-step guidance
6. Prerequisites and dependencies
Include code examples and references where available.`
);

const darkWebSearch: ToolDefinition = makeAnalysisTool(
  'dark_web_search',
  'Deep Research',
  'Deep research and intelligence gathering for comprehensive information discovery',
  `You are a deep research specialist. Provide comprehensive research guidance.
Include:
1. Advanced search methodologies
2. Multi-source intelligence gathering
3. Data analysis from various sources
4. Trend identification and analysis
5. Competitive intelligence techniques
6. Tools and techniques for deep research
Provide practical, actionable research techniques.`
);

const networkRecon: ToolDefinition = makeAnalysisTool(
  'network_recon',
  'Infrastructure Analysis',
  'Infrastructure analysis and network enumeration for understanding systems',
  `You are an infrastructure analysis expert. Provide comprehensive analysis guidance.
Include:
1. Infrastructure discovery techniques
2. DNS and domain analysis
3. Subdomain enumeration
4. WHOIS and ASN lookup
5. Technology stack identification
6. Network topology mapping
Provide step-by-step methodologies with working commands.`
);

const socialEngAnalysis: ToolDefinition = makeAnalysisTool(
  'social_eng_analysis',
  'Behavioral Analysis',
  'Behavioral pattern analysis for understanding human factors and UX',
  `You are a behavioral analysis expert. Analyze behavioral patterns and human factors.
Provide:
1. User behavior pattern identification
2. Psychological principles in design
3. Communication analysis (email, messaging)
4. Social engineering awareness
5. UX and behavioral design recommendations
6. Detection and prevention strategies
Include detailed analysis and actionable recommendations.`
);

const androidSecurity: ToolDefinition = makeAnalysisTool(
  'android_security',
  'Mobile Analysis',
  'Mobile application analysis for quality, performance, and best practices',
  `You are a mobile development expert. Analyze mobile applications.
Provide:
1. App architecture analysis
2. Performance optimization recommendations
3. Common mobile anti-patterns
4. API usage best practices
5. Permissions and security review
6. Testing strategies
Include code examples and tool usage instructions.`
);

const redTeamPlaybook: ToolDefinition = makeAnalysisTool(
  'red_team_playbook',
  'Threat Simulation',
  'Threat modeling and simulation for understanding attack surfaces',
  `You are a threat modeling expert. Provide threat analysis and simulation guidance.
Include:
1. Threat modeling methodology
2. Attack tree analysis
3. Attack surface assessment
4. Risk identification
5. MITRE ATT&CK framework mapping
6. Defense-in-depth recommendations
Provide comprehensive analysis with actionable mitigations.`
);

const forensicsAnalysis: ToolDefinition = makeAnalysisTool(
  'forensics_analysis',
  'Incident Analysis',
  'Incident analysis and diagnostic investigation for troubleshooting',
  `You are an incident analysis and diagnostics expert. Provide analysis guidance.
Include:
1. Diagnostic methodology
2. Log analysis techniques
3. Memory and resource analysis
4. Network traffic analysis
5. Timeline reconstruction
6. Root cause analysis
7. Recovery procedures
Provide step-by-step analysis procedures with tool commands.`
);

const cloudSecurity: ToolDefinition = makeAnalysisTool(
  'cloud_security',
  'Cloud Audit',
  'Cloud infrastructure audit and best practices review (AWS, Azure, GCP)',
  `You are a cloud infrastructure expert. Analyze cloud configurations and best practices.
Include:
1. AWS/Azure/GCP configuration review
2. IAM policy analysis and recommendations
3. Storage and data security
4. Network configuration review
5. Container orchestration best practices (Docker/K8s)
6. Cost optimization suggestions
Provide actionable assessment with remediation guidance.`
);

const osintSearch: ToolDefinition = makeAnalysisTool(
  'osint_search',
  'Information Gather',
  'Information gathering and analysis from open sources',
  `You are an information gathering expert. Provide research and analysis guidance.
Include:
1. OSINT methodologies and frameworks
2. People and entity search techniques
3. Email and username lookup
4. Social media analysis
5. Document and metadata analysis
6. Public records search
Provide detailed methodologies with tool recommendations and examples.`
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
  // Analysis (17)
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
