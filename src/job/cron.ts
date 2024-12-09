/**
 * Imports
 */
import { JobWorker } from "./worker.js";
import { Batch, BatchType, createBatchId } from "../types/batch.js";
import { Handler } from "../types/handler.js";

/**
 * @file cron.ts
 * @description Cron Job Handler for Renovate Executor
 */
export const cron = async ({
    handler = null,
    worker = null,
    batch_size = 10,
}: {
    handler: Handler | null;
    worker: JobWorker | null;
    batch_size?: number;
}) => {
    // Check if the handler is set
    if (handler === null) {
        throw new Error("Handler not set");
    }
    if (worker === null) {
        throw new Error("Job-Worker not set");
    }

    /**
     * Fetch and Batch the Repositories
     */
    console.log("Starting Auto Renovate Cycle");
    const repositories = await handler.fetch();
    if (repositories.length === 0) {
        console.warn("No repositories found");
        return;
    }
    console.success(`Fetched ${repositories.length} repositories`);
    const batches: Array<Batch> = [];
    for (let i = 0; i < repositories.length; i += batch_size) {
        const repos = repositories.slice(i, i + batch_size);
        batches.push({
            id: createBatchId(repos),
            repositories: repos,
            type: BatchType.Cron
        });
    }
    console.log(`Created ${batches.length} batches with ${batch_size} repositories each`);

    /**
     * Dispatch the Batches to the kubernetes job queue
     */
    for (const batch of batches) {
        worker.addBatchJob(batch);
    }
};
