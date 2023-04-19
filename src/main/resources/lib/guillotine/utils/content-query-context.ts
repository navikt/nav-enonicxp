import * as contextLib from '/lib/xp/context';

export type GuillotineContentQueryContext = { baseContentId?: string; baseContentLocale?: string };

export const getGuillotineContentQueryContext = (): GuillotineContentQueryContext => {
    const { baseContentId, baseContentLocale } =
        contextLib.get<GuillotineContentQueryContext>().attributes;

    return { baseContentId, baseContentLocale };
};
