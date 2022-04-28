import contentLib from '/lib/xp/content';
import taskLib from '/lib/xp/task';
import eventLib from '/lib/xp/event';
import clusterLib from '/lib/xp/cluster';
import { forceArray } from '../utils/nav-utils';

import { getProductIllustrationIcons, getProductSituationPages } from './overviewUtils';
import { getContentFromCustomPath } from '../custom-paths/custom-paths';
import { runInBranchContext } from '../utils/branch-context';
import { ContentDescriptor } from 'types/content-types/content-config';

import { createOrUpdateSchedule } from '../scheduling/schedule-job';

const batchCount = 1000;
const maxCount = 50000;
const eventType = 'productlist-generated';

interface ProductListData {
    // Todo: type this!
    entries: any;
    clear: any;
    get: any;
    set: any;
    remove: any;
    getEntries: any;
}

const productListData: ProductListData = {
    entries: {},
    clear: function () {
        this.entries = {};
    },
    get: function (key: string) {
        return this.entries[key];
    },
    set: function (key: string, value: string) {
        this.entries[key] = value;
    },
    remove: function (key: string) {
        delete this.entries[key];
    },
    getEntries: function (language: string) {
        // log.info(JSON.stringify(Object.values(this.entries)));
        return Object.values(this.entries)
            .filter((item: any) => item.language === language)
            .sort((a: any, b: any) => a.title.localeCompare(b.title));
    },
};

const includedContentTypes = ['content-page-with-sidemenus'].map(
    (contentType) => `${app.name}:${contentType}`
) as ContentDescriptor[];

const isIncludedType = (type: any) =>
    !!includedContentTypes.find((includedType) => includedType === type);

const validateContent = (content: any) => {
    if (!content) {
        return false;
    }

    if (!isIncludedType(content.type)) {
        return false;
    }

    return true;
};

const getContent = (path: any) => {
    const contentFromCustomPath = getContentFromCustomPath(path);
    if (contentFromCustomPath.length > 0) {
        if (contentFromCustomPath.length === 1) {
            return contentFromCustomPath[0];
        }
        log.warning(`Multiple entries found for custom path ${path} - skipping product`);
        return null;
    }

    return runInBranchContext(() => contentLib.get({ key: path }), 'master');
};

const updateProductListEntry = (path: any) => {
    const content = getContent(path);
    if (!content) {
        return;
    }

    const key = content._id;

    if (validateContent(content)) {
        productListData.set(key, content);
    } else if (productListData.get(key)) {
        productListData.remove(key);
    }
};

const cleanProduct = (product: any) => {
    const icons = getProductIllustrationIcons(product);
    const situationPages = getProductSituationPages(product);

    return {
        id: product._id,
        path: product._path,
        title: product.data.title || product.displayName,
        ingress: product.data.ingress,
        audience: product.data.audience,
        language: product.language,
        taxonomy: forceArray(product.data.taxonomy),
        area: product.data.area,
        page: product.page,
        illustration: {
            data: {
                icons,
            },
        },
        situationPages,
    };
};

const getAllProducts = (start = 0, previousEntries = []) => {
    const entriesBatch = contentLib
        .query({
            start,
            count: batchCount,
            contentTypes: includedContentTypes,
            filters: {
                boolean: {
                    mustNot: {
                        hasValue: {
                            field: 'data.noindex',
                            values: ['true'],
                        },
                    },
                },
            },
        })
        .hits.map(cleanProduct);
    return entriesBatch;
};

const getProductList = (language: string) => {
    return productListData.getEntries(language);
};

const generateProductListData = () => {
    log.info('generateProductListData');
    if (clusterLib.isMaster()) {
        taskLib.submit({
            description: 'productlist-generator-task',
            task: () => {
                log.info('Started generating productlist data');

                const startTime = Date.now();
                const productList = getAllProducts();

                eventLib.send({
                    type: eventType,
                    distributed: true,
                    data: { productList },
                });

                log.info(
                    `Finished generating productlist data with ${
                        productList.length
                    } entries after ${Date.now() - startTime}ms`
                );

                if (productList.length > maxCount) {
                    log.warning(`ProductList entries count exceeds recommended maximum`);
                }
            },
        });
    }
};

const buildProductListAndActivateSchedule = () => {
    runInBranchContext(generateProductListData, 'master');

    // Regenerate productlist from scratch at 06:00 daily
    createOrUpdateSchedule({
        jobName: 'productlist-generator-schedule',
        jobDescription: 'Generate product list data',
        jobSchedule: {
            type: 'CRON',
            value: '0 6 * * 1,2,3,4,5',
            timeZone: 'GMT+2:00',
        },
        taskDescriptor: 'no.nav.navno:productlist-generator',
        taskConfig: {},
    });
};

const updateProductListData = (productList: any) => {
    if (!productList || !Array.isArray(productList) || productList.length === 0) {
        log.info('Attempted to update productlist with invalid data');
        return;
    }

    productListData.clear();

    productList.forEach((entry) => {
        productListData.set(entry.id, entry);
    });
};

const activateDataUpdateEventListener = () => {
    eventLib.listener({
        type: `custom.${eventType}`,
        callback: (event) => {
            log.info('Received productlist data from master, updating...');
            const { productList } = event.data as any;
            updateProductListData(productList);
        },
    });
};

export {
    getProductList,
    buildProductListAndActivateSchedule,
    updateProductListEntry,
    activateDataUpdateEventListener,
};
