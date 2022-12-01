import portalLib from '/lib/xp/portal';
import contentLib from '/lib/xp/content';
import { frontendProxy } from './frontend-proxy';
import { logger } from '../utils/logging';
import { ContentDescriptor } from '../../types/content-types/content-config';
import { ProductBlob } from '../../site/content-types/product-blob/product-blob';
import { runInBranchContext } from '../utils/branch-context';
import { hasValidCustomPath } from '../custom-paths/custom-paths';

type ContentCategoryTypes = 'product-page' | 'guide-page' | 'themed-article-page';

const setProductPageReference = (
    language: string,
    contentCategory: ContentCategoryTypes,
    localizedContentData?: { productPage?: string }
) => {
    const content = contentLib.query({
        start: 0,
        count: 2,
        contentTypes: [`no.nav.navno:${contentCategory}`],
    }).hits;

    if (content.length !== 1) {
        logger.error(`Found ${content.length} content!`);
        return;
    }

    const id = content[0]._id;
};

const doStuff = (req: XP.Request) => {
    const content = portalLib.getContent();
    if (!content || content.type !== 'no.nav.navno:product-blob') {
        logger.error('No product blob found!');
        return;
    }

    const { contentNo, contentNn, contentEn, contentSe, contentOther, contentCategory } =
        content.data;

    const selectedContentType = contentCategory?._selected;
    if (!selectedContentType) {
        logger.error('No content type selected');
        return;
    }

    setProductPageReference('no', selectedContentType, contentNo);
    setProductPageReference('nn', selectedContentType, contentNn);
    setProductPageReference('en', selectedContentType, contentEn);
    setProductPageReference('se', selectedContentType, contentSe);

    contentOther?.forEach((contentOtherLang) => {
        setProductPageReference(contentOtherLang.lang, selectedContentType, contentOtherLang);
    });
};

const productController = (req: XP.Request) => {
    // if ((req.mode === 'edit' || req.mode === 'inline') && req.method === 'GET') {
    //     doStuff(req);
    // }

    return frontendProxy(req);
};

export const get = productController;
