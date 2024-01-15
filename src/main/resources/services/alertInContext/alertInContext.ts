import * as contentLib from '/lib/xp/content';
import { ContentDescriptor } from 'types/content-types/content-config';
import { getFromLocalCache } from '../../lib/cache/local-cache';

const CACHE_KEY = 'alert-in-context-cache';
import { Content } from '/lib/xp/content';

type AlertContent = Content<'no.nav.navno:alert-in-context'>;
type AlertData = {
    type: 'critical' | 'information';
    text: string;
    scope: {
        scopeType: 'url' | 'area';
        urls?: string[];
        areas?: string[];
    };
};

const transformAlertData = (alertContent: AlertContent): AlertData => {
    const { data } = alertContent;

    let scope;

    if (data.scope._selected === 'url') {
        scope = {
            scopeType: data.scope._selected,
            urls: data.scope['url'].url.map((url: any) => url.urls),
        };
    } else {
        scope = {
            scopeType: data.scope._selected,
            areas: data.scope['area'].area,
        };
    }

    return {
        type: data.type || 'information',
        text: data.text || '',
        scope,
    };
};

export const get = (req: XP.CustomSelectorServiceRequest) => {
    const body = getFromLocalCache(CACHE_KEY, () => {
        const result = contentLib.query({
            count: 1000,
            contentTypes: ['no.nav.navno:alert-in-context'],
        }).hits;

        return result.reduce(
            (acc, item) =>
                item.type === 'no.nav.navno:alert-in-context'
                    ? [...acc, transformAlertData(item)]
                    : acc,
            [] as AlertData[]
        );
    });

    return {
        status: 200,
        contentType: 'application/json',
        body,
    };
};
