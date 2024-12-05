/**
 * Imports
 */
import Docker, { MountSettings } from "dockerode";
import { Runner } from "../types/runner.js";
import { Batch } from "../types/batch.js";
import path from "node:path";
import { getRenovateEnv, RenovateEnv } from "../utils/env.js";

/**
 * @class DockerRunner
 * @description Docker Runner for Renovate Executor. Schedules and runs docker containers, checks the status
 */
export class DockerRunner extends Runner {
    /**
     * Docker Client
     * @type Docker
     * @description Docker Client for the runner
     * @see https://www.npmjs.com/package/dockerode
     */
    private docker: Docker;

    /**
     * Constructor
     */
    constructor(renovateImage: string, renovateEnvironment: string) {
        super(renovateImage, renovateEnvironment);
        this.docker = new Docker();
    }

    /**
     * Create Repositories List and add it to Env Vars
     * @param {Batch} batch The batch to run
     * @returns {RenovateEnv}
     */
    public async createRepositoriesEnv(batch: Batch): Promise<RenovateEnv> {
        const env = await getRenovateEnv(this.getRenovateEnvironmentPath());
        return {
            ...env,
            RENOVATE_REPOSITORIES: JSON.stringify(batch.repositories.map((repo) => repo.path)),
        };
    }

    /**
     * Create Mount Path for Config File
     * @returns {string}
     */
    public createMountPath(env: RenovateEnv): MountSettings | undefined {
        // Check if renovate config is set
        if (env.RENOVATE_CONFIG_FILE == null) {
            return undefined;
        }
        try {
            // Get Full Path to the Config File
            const configPath = path.resolve(env.RENOVATE_CONFIG_FILE);
            // Create Docker Mount Path (/usr/src/app/${renovate.config.file.name})
            return {
                Target: `/usr/src/app/${path.basename(configPath)}`,
                Source: configPath,
                Type: "bind",
                ReadOnly: true,
            };
        } catch (error) {
            console.error(`Error reading Renovate Config File: ${error}`);
            return undefined;
        }
    }

    public async checkJob(id: string): Promise<boolean> {
        // Use Docker API to check if a container with the name exists
        const container = this.docker.getContainer(id);
        return new Promise((resolve) => {
            container.inspect((err) => {
                if (err) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }

    public async runJob(batch: Batch): Promise<void> {
        // Pull the image
        await new Promise<void>((resolve, reject) => {
            this.docker.pull(this.getRenovateImage(), (err: Error, stream: NodeJS.ReadableStream) => {
                if (err) {
                    reject(err);
                } else {
                    this.docker.modem.followProgress(stream, (error: Error | null) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                }
            });
        });

        // Use Docker API to run a container
        const envs = await this.createRepositoriesEnv(batch);
        const mount = this.createMountPath(envs);
        const container = await this.docker.createContainer({
            Image: this.getRenovateImage(),
            name: batch.id,
            HostConfig: {
                AutoRemove: true,
                Mounts: mount ? [mount] : undefined,
            },
            Env: Object.keys(envs).map((env) => `${env}=${envs[env]}`),
        });
        await container.start();
    }
}
