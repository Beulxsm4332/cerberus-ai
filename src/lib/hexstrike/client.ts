// HexStrike AI v6.0 — HexStrike Backend Client
// Direct HTTP bridge to the HexStrike Python pentesting framework (port 8888)

const HEXSTRIKE_BACKEND_URL = process.env.HEXSTRIKE_BACKEND_URL || 'http://127.0.0.1:8888';

export interface HexStrikeHealth {
  status: string;
  version: string;
  uptime: number;
  available_tools: string[];
  total_tools: number;
}

export interface HexStrikeToolResult {
  success: boolean;
  output: string;
  error?: string;
  duration?: number;
  tool: string;
  data?: any;
}

class HexStrikeClient {
  private baseUrl: string;
  private _connected: boolean = false;
  private _lastHealth: HexStrikeHealth | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || HEXSTRIKE_BACKEND_URL;
  }

  get connected(): boolean {
    return this._connected;
  }

  get lastHealth(): HexStrikeHealth | null {
    return this._lastHealth;
  }

  get backendUrl(): string {
    return this.baseUrl;
  }

  /** Check if the HexStrike Python backend is alive */
  async checkHealth(): Promise<HexStrikeHealth> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        this._connected = false;
        return {
          status: 'error',
          version: 'unknown',
          uptime: 0,
          available_tools: [],
          total_tools: 0,
        };
      }

      const data = await response.json();
      this._connected = true;
      this._lastHealth = data;
      return data as HexStrikeHealth;
    } catch {
      this._connected = false;
      return {
        status: 'offline',
        version: 'unknown',
        uptime: 0,
        available_tools: [],
        total_tools: 0,
      };
    }
  }

  /** Get all available tools from the backend */
  async discoverTools(): Promise<string[]> {
    const health = await this.checkHealth();
    return health.available_tools || [];
  }

  /** Execute a HexStrike security tool via the Python backend */
  async executeTool(
    toolPath: string,
    params: Record<string, any> = {},
    options?: { timeout?: number }
  ): Promise<HexStrikeToolResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutMs = options?.timeout || 120000;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${this.baseUrl}/${toolPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return {
          success: false,
          output: '',
          error: `Backend returned ${response.status}: ${errorText}`,
          duration,
          tool: toolPath,
        };
      }

      const data = await response.json();
      return {
        success: data.success !== false,
        output: data.output || data.result || JSON.stringify(data, null, 2),
        error: data.error,
        duration,
        tool: toolPath,
        data,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Connection failed',
        duration: Date.now() - startTime,
        tool: toolPath,
      };
    }
  }

  /** Convenience: Run a specific security tool */
  async runNmap(params: { target: string; ports?: string; flags?: string }) {
    return this.executeTool('api/tools/nmap', params);
  }

  async runNuclei(params: { target: string; templates?: string; severity?: string }) {
    return this.executeTool('api/tools/nuclei', params);
  }

  async runGobuster(params: { target: string; wordlist?: string; extensions?: string }) {
    return this.executeTool('api/tools/gobuster', params);
  }

  async runSubfinder(params: { target: string }) {
    return this.executeTool('api/tools/subfinder', params);
  }

  async runNikto(params: { target: string; options?: string }) {
    return this.executeTool('api/tools/nikto', params);
  }

  async runSqlmap(params: { target: string; options?: string }) {
    return this.executeTool('api/tools/sqlmap', params, { timeout: 180000 });
  }

  async runHydra(params: { target: string; username?: string; wordlist?: string; service?: string }) {
    return this.executeTool('api/tools/hydra', params, { timeout: 300000 });
  }

  async runWpscan(params: { target: string; options?: string }) {
    return this.executeTool('api/tools/wpscan', params);
  }

  async runFfuf(params: { target: string; wordlist?: string; extensions?: string }) {
    return this.executeTool('api/tools/ffuf', params);
  }

  async runAmass(params: { target: string; passive?: boolean }) {
    return this.executeTool('api/tools/amass', params);
  }

  async runHttpx(params: { target: string; options?: string }) {
    return this.executeTool('api/tools/httpx', params);
  }

  /** Cloud security tools */
  async runProwler(params: { service?: string; check?: string }) {
    return this.executeTool('api/tools/prowler', params, { timeout: 300000 });
  }

  async runTrivy(params: { target: string; scan_type?: string }) {
    return this.executeTool('api/tools/trivy', params, { timeout: 180000 });
  }

  async runKubeHunter(params: { target?: string }) {
    return this.executeTool('api/tools/kube-hunter', params, { timeout: 180000 });
  }

  async runCheckov(params: { target: string }) {
    return this.executeTool('api/tools/checkov', params);
  }

  /** Intelligence / AI-powered endpoints */
  async analyzeTarget(params: { target: string; scope?: string }) {
    return this.executeTool('api/intelligence/analyze-target', params);
  }

  async smartScan(params: { target: string; intensity?: string }) {
    return this.executeTool('api/intelligence/smart-scan', params, { timeout: 300000 });
  }

  async selectTools(params: { target: string; objective?: string }) {
    return this.executeTool('api/intelligence/select-tools', params);
  }

  async createAttackChain(params: { target: string; approach?: string }) {
    return this.executeTool('api/intelligence/create-attack-chain', params);
  }

  async technologyDetection(params: { target: string }) {
    return this.executeTool('api/intelligence/technology-detection', params);
  }

  /** Bug bounty workflows */
  async reconWorkflow(params: { target: string; depth?: string }) {
    return this.executeTool('api/bugbounty/reconnaissance-workflow', params, { timeout: 600000 });
  }

  async vulnHuntingWorkflow(params: { target: string }) {
    return this.executeTool('api/bugbounty/vulnerability-hunting-workflow', params, { timeout: 600000 });
  }

  async comprehensiveAssessment(params: { target: string }) {
    return this.executeTool('api/bugbounty/comprehensive-assessment', params, { timeout: 600000 });
  }

  /** Payload generation */
  async generatePayload(params: { type: string; target?: string; parameters?: Record<string, any> }) {
    return this.executeTool('api/payloads/generate', params);
  }

  /** CTF tools */
  async ctfAutoSolve(params: { challenge_description: string; category?: string }) {
    return this.executeTool('api/ctf/auto-solve-challenge', params);
  }

  async ctfCryptoSolver(params: { challenge: string; cipher_type?: string }) {
    return this.executeTool('api/ctf/cryptography-solver', params);
  }

  /** Vuln intelligence */
  async cveMonitor(params: { product?: string; severity?: string; limit?: number }) {
    return this.executeTool('api/vuln-intel/cve-monitor', params);
  }

  async exploitGenerate(params: { cve?: string; target?: string; type?: string }) {
    return this.executeTool('api/vuln-intel/exploit-generate', params);
  }

  /** File operations on the backend */
  async createFile(params: { path: string; content: string }) {
    return this.executeTool('api/files/create', params);
  }

  async modifyFile(params: { path: string; content: string; operation?: string }) {
    return this.executeTool('api/files/modify', params);
  }

  async listFiles(params: { path?: string }) {
    return this.executeTool('api/files/list', params);
  }

  async deleteFile(params: { path: string }) {
    return this.executeTool('api/files/delete', params);
  }

  /** Visual / reporting */
  async vulnerabilityCard(params: { target: string; findings: any[] }) {
    return this.executeTool('api/visual/vulnerability-card', params);
  }

  async summaryReport(params: { target: string; scan_results?: any }) {
    return this.executeTool('api/visual/summary-report', params);
  }

  /** Execute async process */
  async executeAsync(params: { command: string; timeout?: number }) {
    return this.executeTool('api/process/execute-async', params, { timeout: 300000 });
  }

  /** Generic call to any backend endpoint */
  async call(path: string, params: Record<string, any> = {}, options?: { timeout?: number }) {
    return this.executeTool(path, params, options);
  }
}

// Singleton
export const hexstrikeClient = new HexStrikeClient();
export default hexstrikeClient;
