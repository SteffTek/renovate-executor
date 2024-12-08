/**
 * Import Swagger
 */
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUI from "swagger-ui-express";

/**
 * Swagger Definition
 */
const swaggerDefinition = {
    openapi: "3.0.0",
    info: {
        title: "Renovate Executor API",
        version: "1.0.0",
        description: "API Documentation for the autoscaling Renovate Executor",
        license: {
            name: "MIT",
            url: "https://opensource.org/licenses/MIT",
        },
        contact: {
            name: "SteffTek",
            url: "https://github.com/stefftek/renovate-executor",
        },
    },
    servers: [
        {
            url: "http://localhost:4000",
            description: "Development Server",
        },
    ],
    tags: [
        {
            name: "API",
            description: "Default API Endpoints",
        },
        {
            name: "Webhook",
            description: "Webhook Endpoint",
        },
    ],
    // Security Definitions
    components: {
        securitySchemes: {
            apiKeyAuth: {
                type: "apiKey",
                in: "header",
                name: "X-API-Secret",
            },
            gitHubAuth: {
                type: "apiKey",
                in: "header",
                name: "X-Hub-Signature-256",
            },
            gitLabAuth: {
                type: "apiKey",
                in: "header",
                name: "X-Gitlab-Token",
            },
        },
    },
};

/**
 * Options for Swagger
 */
const options = {
    swaggerDefinition,
    apis: ["./src/router/*.ts", "./src/types/*.ts"],
};

/**
 * Initialize Swagger
 */
const swaggerSpec = swaggerJSDoc(options);

/**
 * Export Swagger
 */
export const swagger = swaggerUI.serve;
export const swaggerDocs = swaggerUI.setup(swaggerSpec);
