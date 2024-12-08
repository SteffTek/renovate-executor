/**
 * Imports
 */
import { config as loadEnv } from "dotenv";
import { Request, Response, NextFunction } from "express";
import { Webhooks } from "@octokit/webhooks";

/**
 * Load Environment Variables
 */
loadEnv();

const WEBHOOK_SECRET = process.env.RE_WEBHOOK_SECRET || "";
const API_SECRET = process.env.RE_API_SECRET;

const webhooks = new Webhooks({
    secret: WEBHOOK_SECRET || "NO_SECRET",
});

/**
 * Check if api secret is valid
 */
export const checkApiSecret = (req: Request, res: Response, next: NextFunction) => {
    if (API_SECRET === "") {
        next();
        return;
    }

    if (req.headers["x-api-secret"] !== API_SECRET) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    next();
};

/**
 * Check if webhook secret is valid
 */
export const checkWebhookSecret = async (req: Request, res: Response, next: NextFunction) => {
    // Check if webhook secret is set
    if (WEBHOOK_SECRET === "") {
        next();
        return;
    }

    // Get Headers from request
    const headers = req.headers;
    // Get X-Hub-Signature-256 (GITHUB) header
    const gh_signature = headers["x-hub-signature-256"];
    // Get X-Gitlab-Token (GITLAB) header
    const gl_token = headers["x-gitlab-token"];

    let valid = true;

    // If GITHUB
    if (gh_signature) {
        if (!(await checkGitHubSignature(gh_signature.toString(), JSON.stringify(req.body)))) {
            valid = false;
        }
    }

    // If GITLAB
    if (gl_token) {
        if (!checkGitLabToken(gl_token.toString())) {
            valid = false;
        }
    }

    // If neither
    if (!valid) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    next();
};

/**
 * Function to check if X-Hub-Signature-256 (GITHUB) header is valid
 */
const checkGitHubSignature = async (signature: string, body: string): Promise<boolean> => {
    if (WEBHOOK_SECRET === "") {
        return true;
    }
    if (!(await webhooks.verify(body, signature))) {
        return false;
    }
    return true;
};

/**
 * Function to check if X-Gitlab-Token (GITLAB) header is valid
 */
const checkGitLabToken = (token: string): boolean => {
    if (WEBHOOK_SECRET === "") {
        return true;
    }
    if (token !== WEBHOOK_SECRET) {
        return false;
    }
    return true;
};
