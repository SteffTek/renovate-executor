import { Payload } from "../../types/payload.js";

export type GitHubPayload = {
    hook: {
        id: number;
        type: string;
        events: Array<string>;
    };
    repository: {
        id: number;
        name: string;
        full_name: string;
        owner: {
            login: string;
        };
        default_branch: string;
        topics?: Array<string>;
    };
} & Payload;
