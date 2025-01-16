/**
 * Imports
 */
import { JobWorker } from "./worker.js";
import { Batch, BatchType, createBatchId } from "../types/batch.js";
import { Handler } from "../types/handler.js";
import { Payload } from "../types/payload.js";
import { IncomingHttpHeaders } from "http";
import { Repository } from "../types/repository.js";

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
    const data = await handler.check(headers, payload);
    if (data.repo === null) {
        return;
    }

    // Start Auto-Merge
    if (handler.isMergeRequest(data.event) && handler.getConfig().auto_merge) {
        await mr(data.repo, handler).catch((error) => {
            console.error(`Error while approving merge requests: ${error}`);
        });
    }

    // Create a new batch and schedule it
    const batch: Batch = {
        id: createBatchId([data.repo]),
        repositories: [data.repo],
        type: BatchType.Hook,
    };
    worker.addHookJob(batch);
};

export const mr = async (repository: Repository, handler: Handler) => {
    // Check if the handler is set
    if (handler === null) {
        throw new Error("Handler not set");
    }

    // Check if the repository is set
    if (repository === null) {
        throw new Error("Repository not set");
    }

    // Start Auto-Merge
    const mrs = await handler.getMergeRequests(repository);

    // Approve Merge Requests
    await Promise.all(
        mrs.map(async (mr) => {
            await handler.approveMergeRequest(mr).catch((error) => {
                console.error(`Error while approving merge request ${mr.projectId}/${mr.id}: ${error}`);
            });
        }),
    );
};
