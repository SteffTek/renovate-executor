import { Batch } from "./batch.js";

/**
 * @class Runner
 * @description Interface for the runner object
 */
export abstract class Runner {
    /**
     * @type string
     * @description Renovate Runner Image
     */
    private renovateImage: string;
    /**
     * @type string
     * @description Renovate Environment Path
     */
    private renovateEnvironment: string;
    /**
     * Constructor
     * @param {string} renovateImage The image to use for the runner
     * @constructor
     */
    constructor(renovateImage: string, renovateEnvironment: string) {
        this.renovateImage = renovateImage;
        this.renovateEnvironment = renovateEnvironment;
    }

    /**
     * getRenovateImage
     * @description Get the image to use for the runner
     * @returns {string} The image to use for the runner
     */
    public getRenovateImage(): string {
        return this.renovateImage;
    }

    /**
     * getRenovateEnvironment
     * @description Get the environment to use for the runner
     * @returns {string} The environment to use for the runner
     */
    public getRenovateEnvironmentPath(): string {
        return this.renovateEnvironment;
    }

    /**
     * checkJob
     * @description Check if the job is running
     * @param {string} id The job id
     * @returns {Promise<boolean>} True if the job is running, false otherwise
     */
    public abstract checkJob(id: string): Promise<boolean>;

    /**
     * runJob
     * @description Run a job
     * @param {Batch} batch The batch to run
     * @returns {Promise<void>} A promise that resolves when the job is done
     */
    public abstract runJob(batch: Batch): Promise<void>;

    /**
     * cleanUp
     * @description Clean up the runner, not needed for all runners
     * @returns {Promise<void>} A promise that resolves when the runner is cleaned up
     */
    public abstract cleanUp(): Promise<void>;
}
