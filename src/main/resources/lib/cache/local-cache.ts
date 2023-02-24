import { clearDriftsmeldingerCache } from '../../services/driftsmeldinger/driftsmeldinger';
import { clearDecoratorMenuCache } from '../../services/menu/menu';
import { clearSiteinfoCache } from '../controllers/site-info-controller';
import { sendReliableEvent } from '../events/reliable-custom-events';

export const LOCAL_CACHE_INVALIDATION_EVENT_NAME = 'local-cache-invalidation';

export const invalidateLocalCaches = () => {
    clearSiteinfoCache();
    clearDriftsmeldingerCache();
    clearDecoratorMenuCache();
};

export const sendLocalCacheInvalidationEvent = () => {
    sendReliableEvent({
        type: LOCAL_CACHE_INVALIDATION_EVENT_NAME,
    });
};
