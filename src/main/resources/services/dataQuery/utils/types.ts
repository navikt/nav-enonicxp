import { ContentDescriptor } from '../../../types/content-types/content-config';
import { Content, NotExistsFilter } from '/lib/xp/content';

export const publishStatuses = ['published', 'unpublished', 'archived'] as const;
export type PublishStatus = (typeof publishStatuses)[number];

export type RunQueryParams = {
    requestId: string;
    publishStatus: PublishStatus;
    query?: string;
    batch: number;
    types?: ContentDescriptor[];
    notExistsFilter?: NotExistsFilter[];
};

export type RunExternalArchiveQueryParams = {
    requestId: string;
    batch?: number;
    query: string;
    types: ContentDescriptor[];
};

export type ContentWithLocaleData = Content & { layerLocale: string; publicPath: string };
