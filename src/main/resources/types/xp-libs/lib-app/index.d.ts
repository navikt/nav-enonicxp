export type Application = {
    key: string;
    version: string | null;
    started: boolean;
    system: boolean;
};

export function get(params: { key: string }): Application | null;
export function list(): Application[];
