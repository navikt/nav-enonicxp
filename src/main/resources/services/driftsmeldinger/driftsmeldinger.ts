import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { Melding } from '@xp-types/site/content-types/melding';
import { getFromLocalCache } from '../../lib/cache/local-cache';
import { forceArray } from '../../lib/utils/array-utils';
import { getPublicPath } from '../../lib/paths/public-path';
import { CONTENT_LOCALE_DEFAULT } from '../../lib/constants';

const CACHE_KEY = 'driftsmeldinger-cache';
const DRIFTSMELDINGER_PATH = '/www.nav.no/no/driftsmeldinger';
const MAX_MESSAGES = 100;

type MessageContent = Content<'no.nav.navno:melding'>;

type Message = {
    heading: string;
    url: string;
    type: Melding['type'];
    urlscope: string[];
};

const transformMessageContent = (message: MessageContent): Message => {
    return {
        heading: message.displayName,
        url: getPublicPath(message, CONTENT_LOCALE_DEFAULT),
        type: message.data.type,
        urlscope: forceArray(message.data.urlscope?.urls),
    };
};

export const get = () => {
    const body = getFromLocalCache(CACHE_KEY, () => {
        const result = contentLib.getChildren({
            key: DRIFTSMELDINGER_PATH,
            count: 1000,
            sort: '_manualordervalue DESC',
        });

        return result.hits
            .reduce(
                (acc, item) =>
                    item.type === 'no.nav.navno:melding'
                        ? [...acc, transformMessageContent(item)]
                        : acc,
                [] as Message[]
            )
            .slice(0, MAX_MESSAGES);
    });

    return {
        body,
        contentType: 'application/json',
    };
};
