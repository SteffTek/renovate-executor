/**
 * Imports
 */
import { Router } from "express";
import { hook as handleHook } from "../job/hook.js";
import { Payload } from "../types/payload.js";
import { Handler } from "../types/handler.js";
import { JobWorker } from "../job/worker.js";

import { checkApiSecret, checkWebhookSecret } from "./middleware/password.js";
import { checkAPIEnabled, checkWebhookEnabled } from "./middleware/features.js";

export const createRouter = (handler: Handler, worker: JobWorker): Router => {
    /**
     * Create Express Router
     */
    const router = Router({ mergeParams: true });

    /**
     * Create Routes
     */

    /**
     * @swagger
     * /jobs:
     *      get:
     *          summary: Get all jobs
     *          description: Get all jobs currently active, split into cron and webhook jobs.
     *          security:
     *              - apiKeyAuth: []
     *          tags:
     *              - API
     *          responses:
     *              401:
     *                  description: Unauthorized
     *              400:
     *                  description: Bad Request
     *              200:
     *                  description: A list of all jobs
     *                  content:
     *                      application/json:
     *                          schema:
     *                              type: object
     *                              properties:
     *                                  cron:
     *                                      description: A list of all cron jobs
     *                                      type: array
     *                                      items:
     *                                          $ref: '#/components/schemas/Batch'
     *                                  hook:
     *                                      description: A list of all webhook jobs
     *                                      type: array
     *                                      items:
     *                                          $ref: '#/components/schemas/Batch'
     */
    router.get("/jobs", checkAPIEnabled, checkApiSecret, async (req, res) => {
        const jobs = {
            cron: worker.getBatchJobs(),
            hook: worker.getHookJobs(),
        };
        res.json(jobs);
    });

    /**
     * @swagger
     *  /queue:
     *      get:
     *          summary: Get the queue
     *          description: Get the queue of jobs that are currently waiting to be processed. This is split into cron and webhook jobs.
     *          security:
     *              - apiKeyAuth: []
     *          tags:
     *              - API
     *          responses:
     *              401:
     *                  description: Unauthorized
     *              400:
     *                  description: Bad Request
     *              200:
     *                  description: A list of all jobs in the queue
     *                  content:
     *                      application/json:
     *                          schema:
     *                              type: object
     *                              properties:
     *                                  cron:
     *                                      description: A list of all cron jobs in the queue
     *                                      type: array
     *                                      items:
     *                                          $ref: '#/components/schemas/Batch'
     *                                  hook:
     *                                      description: A list of all webhook jobs in the queue
     *                                      type: array
     *                                      items:
     *                                          $ref: '#/components/schemas/Batch'
     */
    router.get("/queue", checkAPIEnabled, checkApiSecret, async (req, res) => {
        const queue = {
            cron: worker.getBatchQueue(),
            hook: worker.getHookQueue(),
        };
        res.json(queue);
    });

    /**
     * @swagger
     *  /hook:
     *      post:
     *          summary: Webhook Endpoint
     *          description: The endpoint that will be used to receive webhooks for renovate. This endpoint is used by GitHub, GitLab, etc.
     *          security:
     *              - gitHubAuth: []
     *          tags:
     *              - Webhook
     *          requestBody:
     *              required: true
     *              content:
     *                  application/json:
     *                      schema:
     *                          $ref: '#/components/schemas/Payload'
     *          responses:
     *              401:
     *                  description: Unauthorized
     *              400:
     *                  description: Bad Request
     *              200:
     *                  description: Job added to the queue
     *                  content:
     *                      application/json:
     *                          schema:
     *                              type: object
     *                              properties:
     *                                  message:
     *                                      description: A message that the job was added to the queue
     *                                      type: string
     */
    router.post("/hook", checkWebhookEnabled, checkWebhookSecret, async (req, res) => {
        // Check if body is json => if not return 400
        if (req.headers["content-type"] !== "application/json") {
            res.status(400).json({ error: "Content-Type must be application/json" });
            console.error("Content-Type must be application/json");
            return;
        }
        // Cast Body to Payload
        const payload = req.body as Payload;
        // Check if we have empty payload
        if (payload == null) {
            res.status(400).json({ error: "Payload is empty" });
            console.error("Payload is empty");
            return;
        }
        try {
            // Give to the worker
            await handleHook({
                headers: req.headers,
                payload: payload,
                handler: handler,
                worker: worker,
            });
            res.status(200).json({ message: "Job added to the queue" });
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
            console.error((error as Error).message);
        }
    });

    return router;
};

/**
 * Export
 */
export default createRouter;
