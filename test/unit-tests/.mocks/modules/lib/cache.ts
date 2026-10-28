// In-memory replacement for lib-cache. Entries do not expire
const newCache = () => {
    const entries = new Map<string, unknown>();

    return {
        get: <A>(key: string, fetcher: () => A): A => {
            if (!entries.has(key)) {
                entries.set(key, fetcher());
            }

            return entries.get(key) as A;
        },
        getIfPresent: <A>(key: string): A | null =>
            entries.has(key) ? (entries.get(key) as A) : null,
        put: (key: string, value: unknown) => {
            entries.set(key, value);
        },
        remove: (key: string) => {
            entries.delete(key);
        },
        removePattern: (keyRegex: string) => {
            const pattern = new RegExp(keyRegex);
            Array.from(entries.keys())
                .filter((key) => pattern.test(key))
                .forEach((key) => entries.delete(key));
        },
        clear: () => entries.clear(),
        getSize: () => entries.size,
    };
};

export default { newCache };
