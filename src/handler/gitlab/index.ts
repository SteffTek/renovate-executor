/**
 * Imports
 */
import { MergeRequest, Repository } from "../../types/repository.js";
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
     * @returns {Promise<{ repo: Repository | null; event: string }>} True if the repository has updates, false otherwise
     */
    async check(
        headers: IncomingHttpHeaders,
        payload: GitLabPayload,
    ): Promise<{ repo: Repository | null; event: string }> {
        // Check if event is allowed
        if (!this.checkEvent(payload.object_kind)) {
            throw new Error(
                `Event not allowed: ${payload.object_kind}. Allowed events: ${this.getAllowedEvents().join(", ")}`,
            );
        }

        // Log Event and Project
        console.log(`Got event: ${payload.object_kind} for project: ${payload.project.path_with_namespace}`);

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
                return { repo: null, event: payload.object_kind };
            }
        }

        // Check if repository is in predefined list
        if (predefined.length > 0) {
            if (!predefined.includes(payload.project.path_with_namespace)) {
                return { repo: null, event: payload.object_kind };
            }
        }

        // Fetch repository from api (Topics not set in payload)
        const project = await this.api.Projects.show(payload.project.id).catch(() => {
            return null;
        });
        if (!project) {
            return { repo: null, event: payload.object_kind };
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
                return { repo: null, event: payload.object_kind };
            }
        }

        return { repo: repository, event: payload.object_kind };
    }

    /**
     * is merge request
     * @description Check if the payload is a merge request
     * @param {string} event The event type
     */
    isMergeRequest(event: string): boolean {
        return event === "merge_request";
    }

    /**
     * get renovate merge requests
     * @description Get the merge requests for the repository
     * @param {Repository} repository The repository to get the merge requests for
     * @returns {Promise<Array<MergeRequest>>} The merge requests for the repository
     */
    async getMergeRequests(repository: Repository): Promise<Array<MergeRequest>> {
        // Fetch merge requests from api
        return await this.api.MergeRequests.all({
            projectId: parseInt(repository.id),
            state: "opened",
        })
            .then((response) => {
                return response.map((mr) => {
                    return {
                        id: mr.iid.toString(),
                        projectId: mr.project_id.toString(),
                        title: mr.title,
                        description: mr.description,
                        author: mr.author.id.toString(),
                        repository: repository.path,
                        url: mr.web_url,
                        status: mr.state,
                    } as MergeRequest;
                });
            })
            .catch((error) => {
                throw new Error(`Failed to fetch merge requests: ${error}`);
            });
    }

    /**
     * approve merge request
     * @description Approve the merge request
     * @param {MergeRequest} mergeRequest The merge request to approve
     * @returns {Promise<void>}
     */
    async approveMergeRequest(mergeRequest: MergeRequest): Promise<void> {
        // Check if description contains "Automerge: Enabled"
        if (!mergeRequest.description.includes("**Automerge**: Enabled")) {
            throw new Error("Automerge is not enabled");
        }

        // Check if approver token is set
        if (!this.getConfig().approve_token) {
            throw new Error("Approver token not set");
        }

        // Create new GitLab API instance for approving merge requests
        const approverAPI = new Gitlab({
            token: this.getConfig().approve_token ?? "",
            host: this.getConfig().endpoint ?? "https://gitlab.com",
        });

        // Get current user to check if user is author of mr
        const authorUser = await this.api.Users.showCurrentUser();
        // const reviewUser = await approverAPI.Users.showCurrentUser(); // NOT NEEDED FOR GITLAB

        if (authorUser.id !== parseInt(mergeRequest.author)) {
            throw new Error("Renovate-User is not the author of the merge request");
        }

        // Get MR from API
        const mr = await approverAPI.MergeRequests.show(
            parseInt(mergeRequest.projectId),
            parseInt(mergeRequest.id),
        ).catch((error) => {
            console.error(`Failed to fetch merge request: ${error}`);
            return null;
        });

        if (!mr) {
            throw new Error("Failed to fetch merge request");
        }

        // Check if MR is open
        if (mr.state !== "opened") {
            throw new Error("Merge Request is not open");
        }

        // Check if MR needs approval
        if (mr.approvals_before_merge === null || mr.approvals_before_merge === 0) {
            // Fail Silent when no approvals are needed
            return;
            // This is too annoying for the user
            // throw new Error("Merge request does not need approval");
        }

        // Approve MR
        await approverAPI.MergeRequestApprovals.approve(
            parseInt(mergeRequest.projectId),
            parseInt(mergeRequest.id),
        ).catch((error) => {
            throw new Error(`Failed to approve merge request: ${error}`);
        });
    }
}
