import { Content } from '/lib/xp/content';
import { clearDriftsmeldingerCache } from '../../services/driftsmeldinger/driftsmeldinger';
import { clearDecoratorMenuCache } from '../../services/menu/menu';
import { clearSiteinfoCache } from '../site-info/controller';
import { sendReliableEvent } from '../events/reliable-custom-events';

export type LocalCacheInvalidationData = {
    driftsmeldinger?: boolean;
    decoratorMenu?: boolean;
    all?: boolean;
};

export const localCacheInvalidationEventName = 'local-cache-invalidation';

export const clearLocalCaches = ({
    all,
    decoratorMenu,
    driftsmeldinger,
}: LocalCacheInvalidationData) => {
    clearSiteinfoCache();

    if (all || driftsmeldinger) {
        clearDriftsmeldingerCache();
    }

    if (all || decoratorMenu) {
        clearDecoratorMenuCache();
    }
};

export const getCachesToClear = (content: Content[]) => ({
    driftsmeldinger: content.some((content) => content.type === 'no.nav.navno:melding'),
    decoratorMenu: content.some((content) => content.type === 'no.nav.navno:megamenu-item'),
});

export const sendLocalCacheInvalidationEvent = (cachesToClear: LocalCacheInvalidationData) => {
    sendReliableEvent<LocalCacheInvalidationData>({
        type: localCacheInvalidationEventName,
        data: cachesToClear,
    });
};
