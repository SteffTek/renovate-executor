import { Payload } from "./payload.js";
import { Repository, MergeRequest } from "./repository.js";
import { IncomingHttpHeaders } from "http";

/**
 * @type HandlerConfig
 * @description Configuration for the handler
 */
export type HandlerConfig = {
    /**
     * API Endpoint
     * @description The API endpoint for the handler
     * @example "https://api.github.com"
     */
    endpoint: string;
    /**
     * API Token
     * @description The API token for the handler
     * @example "my-api-token"
     */
    token: string;
    /**
     * Approve Token
     * @description The token to approve the merge requests
     * @example "my-approve-token"
     */
    approve_token: string | null;
    /**
     * Auto Merge
     * @description If the merge requests should be auto merged
     * @example true
     */
    auto_merge: boolean;
    /**
     * Organization
     * @description The organization to fetch the repositories from. If not set, all repositories will be fetched.
     * @example "stefftek"
     * @default undefined
     */
    orgs?: Array<string> | undefined;
    /**
     * User
     * @description The user to fetch the repositories from. If not set, all repositories will be fetched.
     * @example "stefftek"
     * @default undefined
     */
    users?: Array<string> | undefined;
    /**
     * Topics
     * @description The topics to fetch. If not set, all repositories will be fetched.
     * @example ["renovate"]
     */
    topics?: Array<string> | undefined;
    /**
     * Repositories
     * @description The repositories to fetch. If not set, all repositories will be fetched.
     * @example ["stefftek/renovate-executor"]
     * @default []
     */
    repositories: Array<string>;
};

/**
 * @class Handler
 * @description Interface for the handler object
 */
export abstract class Handler {
    /**
     * @type HandlerConfig
     * @description Configuration for the handler
     */
    private config: HandlerConfig;
    /**
     * @type Array<string>
     * @description The event types for webhooks that are allowed
     */
    private allowedEvents: Array<string> = [];
    /**
     * Constructor
     * @param {HandlerConfig} config The configuration for the handler
     * @constructor
     */
    constructor(config: HandlerConfig) {
        this.config = config;
    }
    /**
     * getConfig
     * @description Get the configuration for the handler
     * @returns {HandlerConfig} The configuration for the handler
     */
    getConfig(): HandlerConfig {
        return this.config;
    }
    /**
     * checkEvent
     * @description Check if the event is allowed
     * @param {string} event The event type
     * @returns {boolean} If the event is allowed
     */
    checkEvent(event: string): boolean {
        return this.allowedEvents.includes(event);
    }
    /**
     * setAllowedEvents
     * @description Set the allowed events for the handler
     * @param {Array<string>} events The allowed events
     * @returns {void}
     */
    setAllowedEvents(events: Array<string>): void {
        this.allowedEvents = events;
    }

    /**
     * getAllowedEvents
     * @description Get the allowed events for the handler
     * @returns {Array<string>} The allowed events
     */
    getAllowedEvents(): Array<string> {
        return this.allowedEvents;
    }

    /**
     * is merge request
     * @description Check if the payload is a merge request
     * @param {string} event The event type
     */
    abstract isMergeRequest(event: string): boolean;

    /**
     * fetch
     * @description Fetch the repositories from the source
     * @returns {Promise<Array<Repository>>} The repositories that should be checked for updates
     * @throws {Error} If the fetch fails
     */
    abstract fetch(): Promise<Array<Repository>>;

    /**
     * check
     * @description Checks if a repository is able to be updated
     * @param {IncomingHttpHeaders} header The headers from the request
     * @param {Payload} payload The payload from the request
     * @returns {Promise<{ repo: Repository | null; event: string }>} True if the repository has updates, false otherwise
     */
    abstract check(header: IncomingHttpHeaders, payload: Payload): Promise<{ repo: Repository | null; event: string }>;

    /**
     * get renovate merge requests
     * @description Get the merge requests for the repository
     * @param {Repository} repository The repository to get the merge requests for
     * @returns {Promise<Array<MergeRequest>>} The merge requests for the repository
     */
    abstract getMergeRequests(repository: Repository): Promise<Array<MergeRequest>>;

    /**
     * approve merge request
     * @description Approve the merge request
     * @param {MergeRequest} mergeRequest The merge request to approve
     * @returns {Promise<void>}
     */
    abstract approveMergeRequest(mergeRequest: MergeRequest): Promise<void>;
}
