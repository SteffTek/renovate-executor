import { Payload } from "../../types/payload.js";

export type GitLabPayload = {
    object_kind: string;
    project: {
        id: number;
        web_url: string;
        path_with_namespace: string;
        default_branch: string;
    };
} & Payload;
