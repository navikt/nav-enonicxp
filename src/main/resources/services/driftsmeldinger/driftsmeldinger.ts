import portalLib from '/lib/xp/portal';
import cacheLib from '/lib/cache';
import contentLib, { Content } from '/lib/xp/content';
import { Melding } from '../../site/content-types/melding/melding';

const cacheKey = 'driftsmeldinger-cache';
const driftsmeldingerPath = '/www.nav.no/no/driftsmeldinger';

const cache = cacheLib.newCache({ size: 1, expire: 10 });

export const clearDriftsmeldingerCache = () => {
    cache.clear();
};

const maxMessages = 2;

type MessageContent = Content<'no.nav.navno:melding'>;

type Message = {
    heading: string;
    url: string;
    type: Melding['type'];
};

const transformMessageContent = (message: MessageContent): Message => ({
    heading: message.displayName,
    url: portalLib.pageUrl({ path: message._path }),
    type: message.data.type,
});

export const get = () => {
    const body = cache.get(cacheKey, () => {
        const result = contentLib.getChildren({
            key: driftsmeldingerPath,
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
            .slice(0, maxMessages);
    });

    return {
        body,
        contentType: 'application/json',
    };
};
