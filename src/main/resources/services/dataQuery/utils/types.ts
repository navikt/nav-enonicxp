import { ContentDescriptor } from '../../../types/content-types/content-config';
import { Content, NotExistsFilter } from '/lib/xp/content';

export type Branch = 'published' | 'unpublished' | 'archived';

export type RunQueryParams = {
    requestId: string;
    branch: Branch;
    query?: string;
    batch: number;
    types?: ContentDescriptor[];
    notExistsFilter?: NotExistsFilter[];
};

export type ContentWithLocaleData = Content & { layerLocale: string; publicPath: string };
