import * as contentLib from '/lib/xp/content';
import * as portalLib from '/lib/xp/portal';
import { customSelectorHitWithLink } from '../service-utils';
import { forceArray } from '../../lib/utils/array-utils';
import { CONTENT_STUDIO_EDIT_PATH_PREFIX } from '../../lib/constants';

const iconData = `\
<svg width="32" height="32" viewBox="0 0 134 134">
<path d="M20.6125 9C15.3448 9 11 13.3826 11 18.6978V113.314C11 118.629 15.3448 123 20.6125 123H114.387C119.655 123 124 118.629 124 113.314V18.6978C124 13.3826 119.655 9 114.387 9H20.6125ZM20.6125 15.346H114.387C116.285 15.346 117.722 16.7823 117.722 18.6978V113.314C117.722 115.23 116.285 116.667 114.387 116.667H20.6125C18.7139 116.667 17.2777 115.23 17.2777 113.314V18.6978C17.2777 16.7823 18.7138 15.346 20.6125 15.346ZM64.3599 28.0003C63.5274 28.0003 62.7292 28.3334 62.1404 28.9274C61.5516 29.5214 61.2214 30.3267 61.2206 31.1667V50.167C61.2214 51.0069 61.5516 51.8122 62.1404 52.4062C62.7291 53.0002 63.5274 53.3333 64.3599 53.3341H102.027C102.859 53.3333 103.657 53.0002 104.246 52.4062C104.834 51.8122 105.165 51.0069 105.165 50.167V31.1667C105.165 30.3268 104.834 29.5214 104.246 28.9274C103.657 28.3334 102.859 28.0003 102.027 28.0003H64.3599ZM29.8333 34.3337V40.667H48.6667V34.3337H29.8333ZM67.5 34.3337H98.8885V47.0006H67.5V34.3337ZM64.3615 59.6667C63.529 59.6675 62.7308 60.0007 62.142 60.5946C61.5532 61.1886 61.223 61.9939 61.2222 62.8339V81.8342C61.223 82.6741 61.5532 83.4794 62.142 84.0734C62.7307 84.6674 63.529 85.0005 64.3615 85.0005H102.028C102.861 85.0005 103.659 84.6674 104.248 84.0734C104.836 83.4795 105.167 82.6741 105.167 81.8342V62.8339C105.167 61.994 104.836 61.1886 104.248 60.5946C103.659 60.0007 102.861 59.6675 102.028 59.6667H64.3615ZM29.8349 66.0001V72.3335H48.6683V66.0001H29.8349ZM67.5016 66.0001H98.8901V78.667H67.5016V66.0001ZM29.8349 97.6669V104H104.53V97.6669H29.8349Z" fill="#3E3832"/>
</svg>
\
`;

const getFormDetailContent = (formDetailIds: string[]) => {
    const formDetails = contentLib.query({
        count: 100,
        filters: {
            ids: {
                values: formDetailIds,
            },
        },
    });

    return formDetails.hits.map((hit) =>
        customSelectorHitWithLink(
            {
                id: hit._id,
                displayName: hit.displayName,
                icon: { data: iconData, type: 'image/svg+xml' },
            },
            `${CONTENT_STUDIO_EDIT_PATH_PREFIX}/${hit._id}`
        )
    );
};

const getPreselectedFormIds = () => {
    const currentContent = portalLib.getContent();

    if (!currentContent) {
        return [];
    }

    if (
        !(
            currentContent.type === 'no.nav.navno:content-page-with-sidemenus' ||
            currentContent.type === 'no.nav.navno:guide-page' ||
            currentContent.type === 'no.nav.navno:main-article'
        )
    ) {
        return [];
    }

    const { data } = currentContent;
    return forceArray(data.formDetailsTargets);
};

export const get = () => {
    const selectableFormIds = getPreselectedFormIds();
    const formDetails = getFormDetailContent(selectableFormIds);

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            total: 0,
            count: 0,
            hits: formDetails,
        },
    };
};
