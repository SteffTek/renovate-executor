/**
 * Imports
 */
import NodeCache from "node-cache";
import { Batch } from "../types/batch.js";
import { Runner } from "../types/runner.js";

/**
 * @class K8S Job Queue Worker
 * @description Keeps track of all jobs in the k8s job queue
 */
export class JobWorker {
    /**
     * Scheduled Batch Jobs
     * @type NodeCache
     * @description Cache for the scheduled batch jobs
     */
    private batchCache: NodeCache = new NodeCache();
    /**
     * Queue for Batch Jobs
     * @type Array<Repository>
     * @description Queue for the batch jobs
     */
    private batchQueue: { [key: string]: Batch } = {};

    /**
     * Scheduled Hook Jobs
     * @type NodeCache
     * @description Cache for the scheduled hook jobs
     */
    private hookCache: NodeCache = new NodeCache();
    /**
     * Queue for Hook Jobs
     * @type Array<Repository>
     * @description Queue for the hook jobs
     */
    private hookQueue: { [key: string]: Batch } = {};

    private runner: Runner;
    private maxBatchJobs: number = 10;
    private maxHookJobs: number = 10;

    /**
     * Constructor
     */
    constructor({
        runner,
        maxBatchJobs = 10,
        maxHookJobs = 10,
    }: {
        runner: Runner;
        maxBatchJobs?: number;
        maxHookJobs?: number;
    }) {
        this.runner = runner;
        this.maxBatchJobs = maxBatchJobs;
        this.maxHookJobs = maxHookJobs;

        // Initialize the cache
        this.batchCache = new NodeCache();
        this.hookCache = new NodeCache();
    }

    /**
     * Add a Batch Job to the Queue
     * @param {Batch} batch The batch job to add
     */
    public addBatchJob(batch: Batch) {
        // check if a job with the same id is already in the queue
        if (this.batchQueue[batch.id] || this.batchCache.get(batch.id)) {
            console.warn(`Batch Job ${batch.id} already in the Queue`);
            return;
        }
        this.batchQueue[batch.id] = batch;
        console.log(`Added Batch Job ${batch.id} to the Queue`);
    }

    /**
     * Add a Hook Job to the Queue
     * @param {Batch} batch The hook job to add
     */
    public addHookJob(batch: Batch) {
        // check if a job with the same id is already in the queue
        if (this.hookQueue[batch.id] || this.hookCache.get(batch.id)) {
            console.warn(`Hook Job ${batch.id} already in the Queue`);
            return;
        }
        this.hookQueue[batch.id] = batch;
        console.log(`Added Hook Job ${batch.id} to the Queue`);
    }

    /**
     * Get the Batch Jobs
     * @returns {Array<Batch>} The batch cache
     */
    public getBatchJobs(): Array<Batch> {
        // Map the cache to an object
        return this.batchCache.keys().map((key) => this.batchCache.get(key) as Batch);
    }

    /**
     * Get the Hook Jobs
     * @returns {Array<Batch>} The hook cache
     */
    public getHookJobs(): Array<Batch> {
        // Map the cache to an object
        return this.hookCache.keys().map((key) => this.hookCache.get(key) as Batch);
    }

    /**
     * Get Batch Queue
     * @returns {Array<Batch>} The batch queue
     */
    public getBatchQueue(): Array<Batch> {
        // Map the queue to an object
        return Object.values(this.batchQueue);
    }

    /**
     * Get Hook Queue
     * @returns {Array<Batch>} The hook queue
     */
    public getHookQueue(): Array<Batch> {
        // Map the queue to an object
        return Object.values(this.hookQueue);
    }

    /**
     * Handle Function that processes the job queue
     * This runs in a loop
     */
    public async handle() {
        // Handle Batch Jobs
        await this.handleCache(this.batchCache, this.batchQueue, this.maxBatchJobs);
        await this.handleCache(this.hookCache, this.hookQueue, this.maxHookJobs);

        // Clean Up Runner
        await this.runner.cleanUp();
    }

    private async handleCache(cache: NodeCache, queue: { [key: string]: Batch }, maxJobs: number) {
        // Check if any jobs that are in the cache are done
        await this.checkCache(cache);

        // Check how many jobs are currently running
        const cacheSlots = await this.getCacheSlots(cache);

        // Start new jobs if there are slots available
        for (let i = 0; i <= maxJobs - cacheSlots; i++) {
            const batch = this.getNextJob(queue);
            if (batch) {
                await this.startJob(cache, batch);
            }
        }
    }

    private async startJob(cache: NodeCache, batch: Batch) {
        // Check if the job is already running in the cache
        if (cache.get(batch.id)) {
            console.warn(`Job ${batch.id} already running`);
            return;
        }

        // Start the job
        try {
            await this.runner.runJob(batch);
            cache.set(batch.id, batch);
            console.info(`Started job ${batch.id}`);
        } catch (e) {
            console.error(`Failed to start job ${batch.id}`);
            console.error(e);
            return;
        }
    }

    private getNextJob(queue: { [key: string]: Batch }) {
        const keys = Object.keys(queue);
        if (keys.length === 0) {
            return null;
        }
        const key = keys[0];
        const batch = queue[key];
        delete queue[key];
        return batch;
    }

    private async getCacheSlots(cache: NodeCache) {
        return cache.keys().length;
    }

    private async checkCache(cache: NodeCache) {
        const keys = cache.keys();
        for (const key of keys) {
            const batch = cache.get(key) as Batch;
            const isRunning = await this.checkJob(batch);
            if (!isRunning) {
                await this.removeJob(cache, batch);
            }
        }
    }

    private async checkJob(batch: Batch): Promise<boolean> {
        return await this.runner.checkJob(batch);
    }

    private async removeJob(cache: NodeCache, batch: Batch) {
        cache.del(batch.id);
        console.log(`Removed job ${batch.id}`);
    }
}
