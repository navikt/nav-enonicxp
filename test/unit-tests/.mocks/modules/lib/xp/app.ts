type Application = {
	key: string;
	version: string | null;
	started: boolean;
	system: boolean;
};

export const get = jest.fn<({ key }: { key: string }) => Application | null>();
export const list = jest.fn<() => Application[]>();
