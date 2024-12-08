import { Payload } from "../../types/payload.js";

export type GitLabPayload = {
    event_type: string;
    project: {
        id: number;
        web_url: string;
        path_with_namespace: string;
        default_branch: string;
    }
} & Payload;
