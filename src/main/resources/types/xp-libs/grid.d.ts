declare module '*/lib/xp/grid' {
    type SharedMapValue =
        | string
        | number
        | boolean
        | Record<string, unknown>
        | Array<unknown>
        | null;

    type SharedMapSetParams<Type extends SharedMapValue> = {
        key: string;
        ttlSeconds: number;
        value: Type;
    };

    type SharedMapModifyParams<Type extends SharedMapValue> = {
        key: string;
        ttlSeconds: number;
        func: (oldValue: Type) => Type;
    };

    interface SharedMap {
        set<Type extends SharedMapValue = SharedMapValue>(params: SharedMapSetParams<Type>): void;

        get<Type extends SharedMapValue = SharedMapValue>(key: string): Type;

        delete(key: string): void;

        modify<Type extends SharedMapValue = SharedMapValue>(
            params: SharedMapModifyParams<Type>
        ): Type;
    }

    namespace gridLib {
        interface GridLibrary {
            getMap(id: string): SharedMap;
        }
    }

    const gridLib: gridLib.GridLibrary;
    export = gridLib;
}
