/**
 * Imports
 */
import { Repository } from "../../types/repository.js";
import { Handler, HandlerConfig } from "../../types/handler.js";
import { Octokit } from "@octokit/rest";
import { GitHubPayload } from "./payload.js";
import { IncomingHttpHeaders } from "http";

/**
 * @class GitHubHandler
 * @description GitHub Handler for fetching repositories
 */
export class GitHubHandler extends Handler {
    private api: Octokit;

    /**
     * Constructor
     * @param {HandlerConfig} config The configuration for the handler
     * @constructor
     */
    constructor(config: HandlerConfig) {
        super(config);

        // Create a new GitHub instance for interacting with the GitHub API
        this.api = new Octokit({
            auth: config.token,
            baseUrl: config.endpoint ?? "https://api.github.com",
        });

        // Set allowed events
        this.setAllowedEvents(["push", "pull_request", "issues"]);
    }

    /**
     * fetchRepositories
     * @description Fetch the repositories from GitHub
     * @returns {Array<Repository>} The repositories
     * @throws {Error} If the repositories could not be fetched
     */
    async fetch(): Promise<Array<Repository>> {
        let repositories: Array<Repository> = [];
        const organizations = this.getConfig().orgs;
        const users = this.getConfig().users;
        const topics = this.getConfig().topics;
        const predefined = this.getConfig().repositories;

        // Pagination Configuration
        const pagination = {
            page: 0,
            last_response: 0,
        };

        // Fetch for authenticated user
        do {
            await this.api.repos
                .listForAuthenticatedUser({
                    page: pagination.page,
                })
                .then((response) => {
                    response.data.forEach((repo) => {
                        repositories.push({
                            id: repo.id.toString(),
                            path: repo.full_name,
                            url: repo.html_url,
                            branch: repo.default_branch,
                            topics: repo.topics,
                        });
                    });
                    // Update Pagination
                    pagination.page++;
                    pagination.last_response = response.data.length;
                })
                .catch((error) => {
                    throw new Error(`Could not fetch repositories: ${error.message}`);
                });
        } while (pagination.last_response > 0);

        // Filter out all repositories that are not in the organizations or users list
        if (organizations) {
            repositories = repositories.filter((repo) => {
                return organizations.includes(repo.path.toLowerCase().split("/")[0]);
            });
        }
        if (users) {
            repositories = repositories.filter((repo) => {
                return users.includes(repo.path.toLowerCase().split("/")[0]);
            });
        }

        // Filter out all repositories that does not have all topics
        if (topics && topics.length > 0) {
            repositories = repositories.filter((repo) => {
                return topics.every((topic) => {
                    return repo.topics?.includes(topic);
                });
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
            return (
                index ===
                self.findIndex((r) => {
                    return r.path === repo.path;
                })
            );
        });

        return repositories.sort((a, b) => {
            return a.path.localeCompare(b.path);
        });
    }

    /**
     * check
     * @description Checks if a repository is able to be updated
     * @param {IncomingHttpHeaders} headers The headers from the request
     * @param {GitHubPayload} payload The payload from the request
     * @returns {Promise<Repository | null>} True if the repository has updates, false otherwise
     */
    async check(headers: IncomingHttpHeaders, payload: GitHubPayload): Promise<Repository | null> {
        // Get event from headers (X-GitHub-Event)
        const event = headers["x-github-event"] as string;
        // Check if Event is allowed
        if (!this.checkEvent(event ?? "not_found")) {
            throw new Error("Event not allowed");
        }

        // Get Config
        const organizations = this.getConfig().orgs;
        const users = this.getConfig().users;
        const topics = this.getConfig().topics;
        const predefined = this.getConfig().repositories;

        // Get the repository information
        const [owner, repo] = payload.repository.full_name.split("/");

        // Check if the repository is in the organization OR user
        if (organizations && !organizations.includes(owner) && users && !users.includes(owner)) {
            return null;
        }

        // Check if the repository has all topics
        if (topics && topics.length > 0) {
            if (!payload.repository.topics || !topics.every((topic) => payload.repository.topics?.includes(topic))) {
                return null;
            }
        }

        // Check if the repository is in the predefined list
        if (predefined.length > 0 && !predefined.includes(payload.repository.full_name)) {
            return null;
        }

        // Fetch the repository
        const repository = await this.api.repos
            .get({
                owner: owner,
                repo: repo,
            })
            .then((response) => {
                return {
                    id: response.data.id.toString(),
                    path: response.data.full_name,
                    url: response.data.html_url,
                    branch: response.data.default_branch,
                    topics: response.data.topics,
                } as Repository;
            })
            .catch((error) => {
                throw new Error(`Could not fetch repository: ${error.message}`);
            });

        // If set, set branch
        if (payload.repository.default_branch) {
            repository.branch = payload.repository.default_branch;
        }

        return repository;
    }
}
