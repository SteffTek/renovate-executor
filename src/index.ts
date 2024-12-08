/**
 * Renovate Executor
 * @author SteffTek
 * @description Renovate Executor for TypeScript. Run Renovate in a k8s cluster with autoscaling.
 */

/**
 * Imports
 */
import cron from "node-cron";
import { config as loadEnv } from "dotenv";
import { useLogger } from "./utils/logger.js";
import { GitHubHandler } from "./handler/github/index.js";
import { cron as handleCron } from "./job/cron.js";
import { JobWorker } from "./job/worker.js";
import { DockerRunner } from "./runner/docker.js";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { KubernetesRunner } from "./runner/kubernetes.js";

/**
 * Load Environment Variables
 */
loadEnv();
const BATCH_SIZE = parseInt(process.env.RE_BATCH_SIZE || "10");
const MAX_RETRIES = parseInt(process.env.RE_RETRIES || "3");

/**
 * Overwrite the console.log with the custom logger
 */
useLogger();

/**
 * Create a handler for fetching the repositories
 * Use RE_HANDLER to set the handler
 */
const handler = () => {
    switch (process.env.RE_HANDLER) {
        case "github":
            if (!process.env.RE_GITHUB_TOKEN) {
                throw new Error("GitHub Token not set");
            }
            return new GitHubHandler({
                endpoint: process.env.RE_GITHUB_ENDPOINT || "https://api.github.com",
                token: process.env.RE_GITHUB_TOKEN,
                orgs:
                    process.env.RE_GITHUB_ORGS?.toLocaleLowerCase()
                        .split(",")
                        .filter((x) => x.length > 0) || undefined,
                users:
                    process.env.RE_GITHUB_USER?.toLocaleLowerCase()
                        .split(",")
                        .filter((x) => x.length > 0) || undefined,
                repositories: process.env.RE_REPOSITORIES?.split(",").filter((x) => x.length > 0) || [],
                topics: process.env.RE_TOPICS?.split(",").filter((x) => x.length > 0) || undefined,
            });
        case "gitlab":
            if (!process.env.RE_GITLAB_TOKEN) {
                throw new Error("GitLab Token not set");
            }
            return new GitLabHandler({
                endpoint: process.env.RE_GITLAB_ENDPOINT || "https://gitlab.com",
                token: process.env.RE_GITLAB_TOKEN,
                orgs: process.env.RE_GITLAB_GROUPS?.split(",").filter((x) => x.length > 0) || undefined,
                users: process.env.RE_GITLAB_USERS?.split(",").filter((x) => x.length > 0) || undefined,
                repositories: process.env.RE_REPOSITORIES?.split(",").filter((x) => x.length > 0) || [],
                topics: process.env.RE_TOPICS?.split(",").filter((x) => x.length > 0) || undefined,
            });
        default:
            throw new Error(`Handler ${process.env.RE_HANDLER} not found`);
    }
};

const runner = () => {
    switch (process.env.RE_RUNTIME) {
        case "kubernetes":
            return new KubernetesRunner(
                process.env.RE_RENOVATE_IMAGE ?? "renovate/renovate",
                process.env.RE_RENOVATE_ENV ?? "./renovate.env.json",
            );
        default:
            return new DockerRunner(
                process.env.RE_RENOVATE_IMAGE ?? "renovate/renovate",
                process.env.RE_RENOVATE_ENV ?? "./renovate.env.json",
            );
    }
};

// Init Kubernetes Scheduler
const worker = new JobWorker({
    runner: runner(),
    maxBatchJobs: parseInt(process.env.RE_MAX_PARALLEL_CRON_JOBS || "10"),
    maxHookJobs: parseInt(process.env.RE_MAX_PARALLEL_HOOK_JOBS || "10"),
});

/**
 * Log the configuration
 */
console.info("Configuration:");
console.info(`- Batch Size: ${BATCH_SIZE}`);
console.info(`- Max Retries: ${MAX_RETRIES}`);
console.info(`- Handler: ${process.env.RE_HANDLER}`);
console.info(`- Runtime: ${process.env.RE_RUNTIME}`);

/**
 * Create a Cron Schedule
 * Use RE_CRON_SCHEDULE to set the cron schedule
 * If not set, run every full hour
 */
cron.schedule(process.env.RE_CRON_SCHEDULE || "0 * * * *", async () => {
    for (let r = 0; r < MAX_RETRIES; r++) {
        try {
            await handleCron({
                handler: handler(),
                worker: worker,
                batch_size: BATCH_SIZE,
            });
            break;
        } catch (error: unknown) {
            console.error(error);
            // Check if the last retry => exit process with error code
            if (r === MAX_RETRIES - 1) {
                console.error("Max Retries reached");
                process.exit(1);
            }
        }
    }
});

/**
 * Create a Cron Schedule (Internal)
 * This is used to schedule jobs to the internal kubernetes job queue
 * Runs every 5 seconds
 */
cron.schedule("*/5 * * * * *", async () => {
    try {
        await worker.handle();
    } catch (error) {
        console.error(error);
    }
});

/**
 * Create an Express Server
 */
const app = express();
app.use(helmet());
app.use(
    cors({
        origin: "*",
        methods: ["POST"],
    }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Create Router
 */
import { swagger, swaggerDocs } from "./utils/swagger.js";
import { createRouter } from "./router/index.js";
import { GitLabHandler } from "./handler/gitlab/index.js";
app.use("/docs", swagger, swaggerDocs);
app.use(createRouter(handler(), worker));

/**
 * Start the Express Server
 */
const PORT = parseInt(process.env.RE_API_PORT || "4000");
app.listen(PORT, () => {
    console.success(`Listening on port ${PORT}`);
});
