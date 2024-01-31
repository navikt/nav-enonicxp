import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { contentTypesWithAlerts } from '../../contenttype-lists';
import { ContentDescriptor } from '../../../types/content-types/content-config';

const allowedContentTypes: ReadonlySet<ContentDescriptor> = new Set(contentTypesWithAlerts);

export const generateAlerts = (content: Content) => {
    if (!content || !allowedContentTypes.has(content.type)) {
        return null;
    }

    const relevantAlerts = contentLib.query({
        count: 10,
        contentTypes: ['no.nav.navno:alert-in-context'],
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'data.targetContent',
                            values: [content._id],
                        },
                    },
                ],
            },
        },
    }).hits;

    return relevantAlerts;
};
