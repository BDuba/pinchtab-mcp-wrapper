import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { getConfig } from '../config.js';
import { getLogger } from '../logger.js';

const execAsync = promisify(exec);
const logger = getLogger();

export class DockerManager {
  private config = getConfig();
  private containerName: string;
  private isRunning = false;

  constructor() {
    this.containerName = this.config.dockerName;
  }

  async start(): Promise<{ url: string; token: string }> {
    if (this.isRunning) {
      logger.info('Docker container already running');
      return {
        url: `http://127.0.0.1:${this.config.port}`,
        token: this.config.token || '',
      };
    }

    logger.info(`Starting Pinchtab Docker container: ${this.containerName}`);

    // Generate token if not provided
    const token = this.config.token || this.generateToken();

    // Ensure state directory exists
    await this.ensureStateDir();

    // Check if container already exists
    const exists = await this.containerExists();
    if (exists) {
      logger.info('Removing existing container');
      await this.stop();
    }

    // Build docker run command
    const portMapping = this.config.publish
      ? `${this.config.port}:${this.config.port}`
      : `127.0.0.1:${this.config.port}:${this.config.port}`;

    const envArgs = [
      '-e', `BRIDGE_PORT=${this.config.port}`,
      '-e', `BRIDGE_TOKEN=${token}`,
      '-e', `BRIDGE_HEADLESS=true`,
      '-e', `BRIDGE_STATE_DIR=/data`,
      '-e', `BRIDGE_PROFILE=/data/chrome-profile`,
    ];

    const cmd = [
      'docker', 'run', '-d',
      '--name', this.containerName,
      '-p', portMapping,
      ...envArgs,
      '--security-opt', 'seccomp=unconfined',
      '-v', `${this.config.stateDir}:/data`,
      this.config.dockerImage,
    ];

    logger.debug(`Running: ${cmd.join(' ')}`);

    return new Promise((resolve, reject) => {
      const process = spawn(cmd[0], cmd.slice(1), {
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', async (code) => {
        if (code !== 0) {
          logger.error(`Docker run failed: ${stderr}`);
          reject(new Error(`Failed to start container: ${stderr}`));
          return;
        }

        logger.info('Container started, waiting for health check');
        
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
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      // Still try to remove container even if not tracked as running
      try {
        await execAsync(`docker rm -f ${this.containerName} 2>/dev/null || true`);
      } catch {
        // Ignore errors
      }
      return;
    }

    logger.info(`Stopping Pinchtab container: ${this.containerName}`);
    
    try {
      await execAsync(`docker stop ${this.containerName} 2>/dev/null || true`);
      await execAsync(`docker rm ${this.containerName} 2>/dev/null || true`);
      this.isRunning = false;
      logger.info('Container stopped');
    } catch (error) {
      logger.warn(`Error stopping container: ${error}`);
    }
  }

  private async containerExists(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`docker ps -a -q -f name=${this.containerName}`);
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
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
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
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
          logger.info('Health check passed');
          return;
        }
      } catch {
        // Ignore errors, retry
      }

      logger.debug(`Health check attempt ${attempt}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Health check timeout');
  }
}
