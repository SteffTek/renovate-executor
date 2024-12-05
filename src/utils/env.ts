/**
 * Imports
 */
import fs from "node:fs/promises";
import path from "node:path";

export interface RenovateEnv {
    [key: string]: string;
}

/**
 * Get the Renovate Environment Variables from File
 * @returns {RenovateEnv} The Renovate Environment Variables
 */
export const getRenovateEnv = async (envPath: string): Promise<RenovateEnv> => {
    // Check that it exists and is valid JSON
    try {
        envPath = path.resolve(envPath);
        return JSON.parse(await fs.readFile(envPath, "utf-8"));
    } catch (error: unknown) {
        throw new Error(`Renovate Environment File not found or invalid JSON: ${(error as Error).message}`);
    }
};
