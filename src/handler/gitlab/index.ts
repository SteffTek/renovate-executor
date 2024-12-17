/**
 * Imports
 */
import { Repository } from "../../types/repository.js";
import { Handler, HandlerConfig } from "../../types/handler.js";
import { GitLabPayload } from "./payload.js";
import { IncomingHttpHeaders } from "http";
import { Gitlab } from "@gitbeaker/rest";
import { Gitlab as GitLabType } from "@gitbeaker/core";

/**
 * @class GitLabHandler
 * @description GitLab Handler for fetching repositories
 */
export class GitLabHandler extends Handler {
    private api: GitLabType;

    /**
     * Constructor
     * @param {HandlerConfig} config The configuration for the handler
     * @constructor
     */
    constructor(config: HandlerConfig) {
        super(config);

        // Create a new GitLab instance for interacting with the GitLab API
        this.api = new Gitlab({
            token: config.token,
            host: config.endpoint ?? "https://gitlab.com",
        });

        // Set allowed events
        this.setAllowedEvents(["push", "merge_request", "issue"]);
    }

    /**
     * fetchRepositories
     * @description Fetch the repositories from GitLab
     * @returns {Array<Repository>} The repositories
     * @throws {Error} If the repositories could not be fetched
     */
    async fetch(): Promise<Array<Repository>> {
        let repositories: Array<Repository> = [];

        const orgs = this.getConfig().orgs ?? [];
        const users = this.getConfig().users ?? [];
        const topics = this.getConfig().topics ?? [];
        const predefined = this.getConfig().repositories ?? [];

        await this.api.Projects.all({
            topic: topics.join(","),
        })
            .then((response) => {
                response.forEach((project) => {
                    repositories.push({
                        id: project.id.toString(),
                        path: project.path_with_namespace,
                        url: project.web_url,
                        branch: project.default_branch,
                        topics: project.topics ?? [],
                    });
                });
            })
            .catch((error) => {
                throw new Error(`Failed to fetch repositories: ${error}`);
            });

        // Filter out all repositories that are not in the organizations or users list
        if (orgs.length > 0 || users.length > 0) {
            repositories = repositories.filter((repo) => {
                return (
                    orgs.includes(repo.path.toLowerCase().split("/")[0]) ||
                    users.includes(repo.path.toLowerCase().split("/")[0])
                );
            });
        }

        // Filter out all repositories that are not in the predefined list
        if (predefined.length > 0) {
            repositories = repositories.filter((repo) => {
                return predefined.includes(repo.path);
            });
        }

        // Filter out duplicates
        repositories = repositories.filter((repo, index, self) => {
            return index === self.findIndex((r) => r.path === repo.path);
        });

        // Sort by id
        repositories.sort((a, b) => {
            return a.id.localeCompare(b.id);
        });

        return repositories;
    }

    /**
     * check
     * @description Checks if a repository is able to be updated
     * @param {IncomingHttpHeaders} headers The headers from the request
     * @param {GitLabPayload} payload The payload from the request
     * @returns {Promise<Repository | null>} True if the repository has updates, false otherwise
     */
    async check(headers: IncomingHttpHeaders, payload: GitLabPayload): Promise<Repository | null> {
        // Check if event is allowed
        if (!this.checkEvent(payload.event_type)) {
            throw new Error(`Event not allowed: ${payload.event_type}. Allowed events: ${this.getAllowedEvents().join(", ")}`);
        }

        // Get Config
        const orgs = this.getConfig().orgs ?? [];
        const users = this.getConfig().users ?? [];
        const topics = this.getConfig().topics ?? [];
        const predefined = this.getConfig().repositories ?? [];

        // Get repo information
        const [owner] = payload.project.path_with_namespace.split("/");

        // Check if repository is org or user
        if (orgs.length > 0 || users.length > 0) {
            if (!orgs.includes(owner.toLocaleLowerCase()) && !users.includes(owner.toLocaleLowerCase())) {
                return null;
            }
        }

        // Check if repository is in predefined list
        if (predefined.length > 0) {
            if (!predefined.includes(payload.project.path_with_namespace)) {
                return null;
            }
        }

        // Fetch repository from api (Topics not set in payload)
        const project = await this.api.Projects.show(payload.project.id).catch(() => {
            return null;
        });
        if (!project) {
            return null;
        }

        const repository: Repository = {
            id: project.id.toString(),
            path: project.path_with_namespace,
            url: project.web_url,
            branch: project.default_branch,
            topics: project.topics ?? [],
        };

        // Check if repository has all topics
        if (topics.length > 0) {
            if (!repository.topics || !topics.every((topic) => repository.topics?.includes(topic))) {
                return null;
            }
        }

        return repository;
    }
}
