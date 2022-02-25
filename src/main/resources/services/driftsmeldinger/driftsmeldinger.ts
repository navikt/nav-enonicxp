import portalLib from '/lib/xp/portal';
import cacheLib from '/lib/cache';
import contentLib, { Content } from '/lib/xp/content';
import { Melding } from '../../site/content-types/melding/melding';

const cacheKey = 'driftsmeldinger-cache';
const driftsmeldingerPath = '/www.nav.no/no/driftsmeldinger';

const cache = cacheLib.newCache({ size: 50, expire: 60 });

type MessageContent = Content<'no.nav.navno:melding'>;

type Message = {
    heading: string;
    url: string;
    type: Melding['type'];
};

const constructMessage = (message: MessageContent) => {
    const heading = message.displayName;
    const url = portalLib.pageUrl({ path: message._path });
    const type = message.data.type;

    return {
        heading,
        url,
        type,
    };
};

export const get = () => {
    const body = cache.get(cacheKey, () => {
        const result = contentLib.getChildren({
            key: driftsmeldingerPath,
            start: 0,
            count: 2,
            sort: '_manualordervalue DESC',
        });

        return result.hits.reduce(
            (acc, item) =>
                item.type === 'no.nav.navno:melding' ? [...acc, constructMessage(item)] : acc,
            [] as Message[]
        );
    });

    return {
        body,
        contentType: 'application/json',
    };
};
