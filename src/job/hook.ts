/**
 * Imports
 */
import { JobWorker } from "./worker.js";
import { Batch, BatchType, createBatchId } from "../types/batch.js";
import { Handler } from "../types/handler.js";
import { Payload } from "../types/payload.js";
import { IncomingHttpHeaders } from "http";

/**
 * @file hook.ts
 * @description Webhook Job Handler for Renovate Executor
 */
export const hook = async ({
    headers = null,
    payload = null,
    handler = null,
    worker = null,
}: {
    headers: IncomingHttpHeaders | null;
    payload: Payload | null;
    handler: Handler | null;
    worker: JobWorker | null;
}) => {
    // Check if the handler is set
    if (handler === null) {
        throw new Error("Handler not set");
    }
    if (worker === null) {
        throw new Error("Job-Worker not set");
    }
    if (payload === null) {
        throw new Error("Payload not set");
    }
    if (headers === null) {
        throw new Error("Headers not set");
    }

    // Get Repository from Handler
    const repository = await handler.check(headers, payload);
    if (repository === null) {
        return;
    }

    // Create a new batch and schedule it
    const batch: Batch = {
        id: createBatchId([repository]),
        repositories: [repository],
        type: BatchType.Hook,
    };
    worker.addHookJob(batch);
};
