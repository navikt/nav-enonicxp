import * as contextLib from '/lib/xp/context';

export type GuillotineContentQueryContext = { baseContentId?: string };

export const getGuillotineContentQueryBaseContentId = () =>
    contextLib.get<GuillotineContentQueryContext>().attributes.baseContentId;
