/**
 * @type Repository
 * @description A repository represents a git repository that should be checked for updates. This will be set as filter for the renovate runner.
 */
export type Repository = {
    /**
     * Id
     * @description The id of the repository. This will be used to identify the repository.
     * @example "123456"
     */
    id: string;
    /**
     * Project Path
     * @description The path to the project in GitHub or GitLab. This will be used to filter the repositories.
     * @example "stefftek/renovate-executor"
     */
    path: string;
    /**
     * Repository URL
     * @description The URL to the repository.
     * @example "https://github.com/stefftek/renovate-executor"
     */
    url: string;
    /**
     * Branch
     * @description The branch that should be checked for updates. If not set, the default branch will be used.
     * @example "main"
     */
    branch: string | undefined;
    /**
     * Topics
     * @description The topics that are set for the repository. This will be used to filter the repositories.
     * @example ["renovate"]
     */
    topics?: Array<string>;
};
