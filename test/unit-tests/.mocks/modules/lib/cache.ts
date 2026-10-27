// Minimal in-memory mock of Enonic's /lib/cache for unit tests.
type Entry = unknown;

const newCache = (_params: { size: number; expire: number }) => {
    const store = new Map<string, Entry>();

    return {
        get: <A>(key: string, fetcher: () => A): A => {
            if (store.has(key)) {
                return store.get(key) as A;
            }
            const value = fetcher();
            store.set(key, value);
            return value;
        },
        getIfPresent: <A>(key: string): A | null =>
            store.has(key) ? (store.get(key) as A) : null,
        put: (key: string, value: unknown): void => {
            store.set(key, value);
        },
        remove: (key: string): void => {
            store.delete(key);
        },
        removePattern: (): void => {
            store.clear();
        },
        clear: (): void => {
            store.clear();
        },
        getSize: (): number => store.size,
    };
};

export default { newCache };
