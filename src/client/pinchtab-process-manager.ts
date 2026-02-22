import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { getConfig } from '../config.js';
import { getLogger } from '../logger.js';
import { PinchtabHealthResponse } from '../types/index.js';
import { access } from 'fs/promises';

const execAsync = promisify(exec);
const logger = getLogger();

export class PinchtabProcessManager {
  private config = getConfig();
  private process: ReturnType<typeof spawn> | null = null;
  private isRunning = false;
  private binaryPath: string | null = null;

  constructor() {}

  private async findBinary(): Promise<string | null> {
    if (this.binaryPath) {
      return this.binaryPath;
    }

    const paths = [
      this.config.binaryPath,
      process.env.PINCHTAB_BINARY_PATH,
      `${process.env.HOME}/.pinchtab-mcp-wrapper/bin/pinchtab`,
      `${process.env.USERPROFILE}/.pinchtab-mcp-wrapper/bin/pinchtab`,
      '/usr/local/bin/pinchtab',
      '/usr/bin/pinchtab',
      'pinchtab',
    ].filter(Boolean) as string[];

    for (const path of paths) {
      try {
        await access(path);
        this.binaryPath = path;
        logger.debug(`Found pinchtab binary at: ${path}`);
        return path;
      } catch {
        continue;
      }
    }

    try {
      const { stdout } = await execAsync('which pinchtab');
      if (stdout.trim()) {
        this.binaryPath = stdout.trim();
        logger.debug(`Found pinchtab via which: ${this.binaryPath}`);
        return this.binaryPath;
      }
    } catch {
      // Binary not found in PATH
    }

    return null;
  }

  async start(): Promise<{ url: string; token: string }> {
    if (this.isRunning) {
      logger.info('Pinchtab process already running');
      return {
        url: `http://127.0.0.1:${this.config.port}`,
        token: this.config.token || '',
      };
    }

    const binaryPath = await this.findBinary();
    if (!binaryPath) {
      throw new Error('Pinchtab binary not found. Please install Pinchtab or set PINCHTAB_BINARY_PATH environment variable.');
    }

    logger.info(`Starting Pinchtab binary: ${binaryPath}`);

    const token = this.config.token || this.generateToken();

    await this.ensureStateDir();

    await this.stop();

    const env = {
      ...process.env,
      BRIDGE_PORT: String(this.config.port),
      BRIDGE_TOKEN: token,
      BRIDGE_HEADLESS: 'true',
      BRIDGE_STATE_DIR: this.config.stateDir,
      BRIDGE_PROFILE: `${this.config.stateDir}/chrome-profile`,
    };

    return new Promise((resolve, reject) => {
      this.process = spawn(binaryPath, [], {
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
      });

      let stderr = '';

      this.process.stdout?.on('data', (data) => {
        logger.debug(`Pinchtab stdout: ${data.toString().trim()}`);
      });

      this.process.stderr?.on('data', (data) => {
        stderr += data.toString();
        logger.debug(`Pinchtab stderr: ${data.toString().trim()}`);
      });

      this.process.on('error', (error) => {
        logger.error(`Failed to start pinchtab process: ${error}`);
        reject(error);
      });

      this.process.on('close', (code) => {
        this.isRunning = false;
        this.process = null;
        logger.warn(`Pinchtab process exited with code ${code}`);
        if (code !== 0) {
          logger.error(`Pinchtab stderr: ${stderr}`);
        }
      });

      setTimeout(async () => {
        try {
          await this.waitForHealthy(token);
          this.isRunning = true;
          logger.info('Pinchtab is ready');
          resolve({
            url: `http://127.0.0.1:${this.config.port}`,
            token,
          });
        } catch (error) {
          logger.error('Health check failed, cleaning up');
          await this.stop();
          reject(error);
        }
      }, 1000);
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning && !this.process) {
      return;
    }

    logger.info('Stopping Pinchtab process');

    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }

    try {
      await execAsync(`pkill -f "pinchtab" 2>/dev/null || true`);
    } catch {
      // Process might not exist
    }

    this.isRunning = false;
    logger.info('Process stopped');
  }

  async restart(): Promise<void> {
    logger.info('Restarting Pinchtab process');
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.start();
  }

  private async ensureStateDir(): Promise<void> {
    const fs = await import('fs/promises');
    try {
      await fs.mkdir(this.config.stateDir, { recursive: true });
      logger.debug(`State directory ensured: ${this.config.stateDir}`);
    } catch (error) {
      logger.warn(`Could not create state directory: ${error}`);
    }
  }

  private generateToken(): string {
    return randomUUID().replace(/-/g, '');
  }

  private async waitForHealthy(token: string, maxAttempts = 60): Promise<void> {
    const url = `http://127.0.0.1:${this.config.port}/health`;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(url, { 
          headers,
          signal: AbortSignal.timeout(2000),
        });
        
        if (response.ok) {
          const health = await response.json() as PinchtabHealthResponse;
          if (health.status === 'ok') {
            logger.info('Health check passed');
            return;
          } else {
            logger.debug(`Health check returned status: ${health.status}`);
          }
        }
      } catch {
        // Ignore retry errors
      }

      logger.debug(`Health check attempt ${attempt}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Health check timeout');
  }

  async health(): Promise<{ status: string; error?: string }> {
    const url = `http://127.0.0.1:${this.config.port}/health`;
    const token = this.config.token;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { 
        headers,
        signal: AbortSignal.timeout(2000),
      });
      
      if (response.ok) {
        const health = await response.json() as PinchtabHealthResponse;
        return { status: health.status };
      } else {
        return { status: 'error', error: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { status: 'error', error: error instanceof Error ? error.message : String(error) };
    }
  }

  isProcessRunning(): boolean {
    return this.isRunning;
  }
}