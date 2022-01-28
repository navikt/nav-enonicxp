import {
    Content,
    ContentDescriptor,
    CustomContentDataConfigs,
    CustomContentDescriptor,
} from '../content-types/content-config';
import {
    CreateContentParams as XpCreateContentParams,
    GetChildrenParams as XpGetChildrenParams,
    GetContentParams as XpGetContentParams,
    ModifyContentParams as XpModifyContentParams,
    PublishContentParams as XpPublishContentParams,
    PublishResponse as XpPublishResponse,
    QueryContentParams as XpQueryContentParams,
    QueryContentParamsWithSort as XpQueryContentParamsWithSort,
    QueryResponse as XpQueryResponse,
} from '*/lib/xp/content';
import { RepoBranch } from '../common';
import * as xpContentLib from '/lib/xp/content';
import { Override } from '../util-types';

export type QueryParams<
    ContentType extends ContentDescriptor = ContentDescriptor,
    AggregationKeys extends string = never
> = (XpQueryContentParams<AggregationKeys> | XpQueryContentParamsWithSort<AggregationKeys>) & {
    contentTypes?: ContentType[];
};

export type QueryResponse<
    ContentType extends ContentDescriptor = ContentDescriptor,
    AggregationKeys extends string = never
> = Override<
    XpQueryResponse<any, AggregationKeys>,
    Readonly<{
        hits: ReadonlyArray<Content<ContentType>>;
    }>
>;

export type CreateContentParams<
    ContentType extends CustomContentDescriptor = CustomContentDescriptor
> = Override<
    XpCreateContentParams<any>,
    {
        contentType: ContentType;
        data: CustomContentDataConfigs[ContentType];
    }
>;

export type ModifyContentParams<ContentType extends ContentDescriptor = ContentDescriptor> =
    Override<
        XpModifyContentParams<any>,
        {
            editor: (content: Content<ContentType>) => Content<ContentType>;
        }
    >;

export type PublishContentParams = Override<
    XpPublishContentParams,
    {
        sourceBranch: RepoBranch;
        targetBranch: RepoBranch;
    }
>;

interface ContentLibOverride {
    get(params: XpGetContentParams): Content | null;

    // TODO: add typing for filters
    query<
        ContentType extends ContentDescriptor = ContentDescriptor,
        AggregationKeys extends string = never
    >(
        params: QueryParams<ContentType, AggregationKeys>
    ): QueryResponse<ContentType, AggregationKeys>;

    // Dummy definition to prevent type errors, as the original definition
    // for this interface has an overloaded query function
    query(): never;

    create<ContentType extends CustomContentDescriptor = CustomContentDescriptor>(
        params: CreateContentParams<ContentType>
    ): Content<ContentType>;

    modify<ContentType extends ContentDescriptor = ContentDescriptor>(
        params: ModifyContentParams<ContentType>
    ): Content;

    publish(params: PublishContentParams): XpPublishResponse;

    getChildren(params: XpGetChildrenParams): QueryResponse;
}

export type ContentLibrary = Override<xpContentLib.ContentLibrary, ContentLibOverride>;
