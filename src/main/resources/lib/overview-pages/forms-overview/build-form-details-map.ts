import * as contentLib from '/lib/xp/content';
import { ContentWithFormDetails, FormDetailsMap } from './types';
import { forceArray } from '../../utils/array-utils';
import { FormsOverview } from '../../../site/content-types/forms-overview/forms-overview';

export const buildFormDetailsMap = (
    contentWithFormDetails: ContentWithFormDetails[],
    overviewType: FormsOverview['overviewType']
) => {
    const formDetailsIdsSet: Record<string, true> = {};

    contentWithFormDetails.forEach((content) => {
        forceArray(content.data.formDetailsTargets).forEach(
            (targetId) => (formDetailsIdsSet[targetId] = true)
        );
    }, []);

    const formDetailsIds = Object.keys(formDetailsIdsSet);

    const formDetailsContent = contentLib.query({
        count: formDetailsIds.length,
        contentTypes: ['no.nav.navno:form-details'],
        filters: {
            ids: {
                values: formDetailsIds,
            },
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'data.formType._selected',
                            values: [overviewType],
                        },
                    },
                ],
            },
        },
    }).hits;

    return formDetailsContent.reduce<FormDetailsMap>((acc, formDetail) => {
        acc[formDetail._id] = formDetail;
        return acc;
    }, {});
};
