import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { getConfig } from '../config.js';
import { getLogger } from '../logger.js';
import { access } from 'fs/promises';

const execAsync = promisify(exec);
const logger = getLogger();

export class DockerManager {
  private config = getConfig();
  private containerName: string;
  private isRunning = false;
  private dockerPath: string | null = null;

  constructor() {
    this.containerName = this.config.dockerName;
  }

  private async findDocker(): Promise<string | null> {
    if (this.dockerPath) {
      return this.dockerPath;
    }

    const paths = [
      process.env.DOCKER_PATH,
      '/opt/homebrew/bin/docker',
      '/usr/local/bin/docker',
      '/Applications/OrbStack.app/Contents/MacOS/../bin/docker',
      '/Applications/Docker.app/Contents/Resources/bin/docker',
      `${process.env.HOME}/.docker/bin/docker`,
      '/usr/bin/docker',
      'docker',
    ].filter(Boolean) as string[];

    for (const path of paths) {
      try {
        await access(path);
        this.dockerPath = path;
        logger.debug(`Found docker at: ${path}`);
        return path;
      } catch {
        continue;
      }
    }

    try {
      const { stdout } = await execAsync('which docker');
      if (stdout.trim()) {
        this.dockerPath = stdout.trim();
        logger.debug(`Found docker via which: ${this.dockerPath}`);
        return this.dockerPath;
      }
    } catch {
    }

    return null;
  }

  async start(): Promise<{ url: string; token: string }> {
    if (this.isRunning) {
      logger.info('Docker container already running');
      return {
        url: `http://127.0.0.1:${this.config.port}`,
        token: this.config.token || '',
      };
    }

    const dockerPath = await this.findDocker();
    if (!dockerPath) {
      throw new Error('Docker not found. Please install Docker or set DOCKER_PATH environment variable.');
    }

    logger.info(`Starting Pinchtab Docker container: ${this.containerName}`);

    const token = this.config.token || this.generateToken();

    await this.ensureStateDir();

    const exists = await this.containerExists();
    if (exists) {
      logger.info('Removing existing container');
      await this.stop();
    }

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
      dockerPath, 'run', '-d',
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
    const dockerPath = await this.findDocker();
    if (!dockerPath) {
      return;
    }

    if (!this.isRunning) {
      try {
        await execAsync(`${dockerPath} rm -f ${this.containerName} 2>/dev/null || true`);
      } catch {
      }
      return;
    }

    logger.info(`Stopping Pinchtab container: ${this.containerName}`);
    
    try {
      await execAsync(`${dockerPath} stop ${this.containerName} 2>/dev/null || true`);
      await execAsync(`${dockerPath} rm ${this.containerName} 2>/dev/null || true`);
      this.isRunning = false;
      logger.info('Container stopped');
    } catch (error) {
      logger.warn(`Error stopping container: ${error}`);
    }
  }

  private async containerExists(): Promise<boolean> {
    const dockerPath = await this.findDocker();
    if (!dockerPath) {
      return false;
    }
    try {
      const { stdout } = await execAsync(`${dockerPath} ps -a -q -f name=${this.containerName}`);
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

  async restart(): Promise<void> {
    logger.info('Restarting Pinchtab container');
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.start();
  }
}
