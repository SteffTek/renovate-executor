/**
 * Imports
 */
import { Repository } from "./repository.js";
import crypto from "node:crypto";

/**
 * @swagger
 *  components:
 *      schemas:
 *          BatchType:
 *              type: string
 *              enum:
 *                  - cron
 *                  - hook
 */
export enum BatchType {
    Cron = "cron",
    Hook = "hook",
}

/**
 * @swagger
 *  components:
 *      schemas:
 *          Batch:
 *              type: object
 *              properties:
 *                  id:
 *                      type: string
 *                      description: The ID of the batch, based on a hash of the repositories list
 *                      example: "123456"
 *                  repositories:
 *                      type: array
 *                      items:
 *                          $ref: '#/components/schemas/Repository'
 *                      description: The repositories in the batch
 *                      example: []
 *                  type:
 *                      $ref: '#/components/schemas/BatchType'
 *                      description: The type of the batch
 *                      example: "cron"
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
    /**
     * Batch Type
     * @description The type of the batch
     */
    type: BatchType;
};

/**
 * A function that creates a batch id based on a repositories list
 * @param {Array<Repository>} repositories The repositories list
 * @returns {string} The batch id
 */
export function createBatchId(repositories: Array<Repository>): string {
    const hash = crypto.createHash("sha1");
    hash.update(repositories.map((repo) => repo.id).join(","));
    return hash.digest("hex");
}
