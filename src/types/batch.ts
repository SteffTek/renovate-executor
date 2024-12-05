/**
 * Imports
 */
import { Repository } from "./repository.js";
import crypto from "node:crypto";

/**
 * @type Batch
 * @description A batch of repositories
 */
export type Batch = {
    /**
     * Batch ID
     * @description The ID of the batch, based on a hash of the repositories list
     */
    id: string;
    /**
     * Repositories
     * @description The repositories in the batch
     */
    repositories: Array<Repository>;
};

/**
 * A function that creates a batch id based on a repositories list
 * @param {Array<Repository>} repositories The repositories list
 * @returns {string} The batch id
 */
export function createBatchId(repositories: Array<Repository>): string {
    const hash = crypto.createHash("sha1");
    hash.update(repositories.map((repo) => repo.path).join(","));
    return hash.digest("hex");
}
