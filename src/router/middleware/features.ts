/**
 * Imports
 */
import { config as loadEnv } from "dotenv";
import { Request, Response, NextFunction } from "express";

/**
 * Load Environment Variables
 */
loadEnv();

const WEBHOOK_ENABLED = process.env.RE_WEBHOOK_ENABLED === "true";
const API_ENABLED = process.env.RE_API_ENABLED === "true";

/**
 * Check if api is enabled
 */
export const checkAPIEnabled = (req: Request, res: Response, next: NextFunction) => {
    if (!API_ENABLED) {
        res.status(400).json({ error: "API is disabled" });
        console.error("API is disabled");
        return;
    }
    next();
};

/**
 * Check if webhook is enabled
 */
export const checkWebhookEnabled = async (req: Request, res: Response, next: NextFunction) => {
    if (!WEBHOOK_ENABLED) {
        res.status(400).json({ error: "Webhook is disabled" });
        console.error("Webhook is disabled");
        return;
    }
    next();
};
