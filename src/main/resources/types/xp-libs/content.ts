import {
    Content,
    ContentDescriptor,
    CustomContentDataConfigs,
    CustomContentDescriptor,
} from '../content-types/content-config';
import {
    CreateContentParams,
    GetChildrenParams,
    GetContentParams,
    ModifyContentParams,
    PublishContentParams,
    PublishResponse,
    QueryContentParams,
    QueryContentParamsWithSort,
    QueryResponse,
} from '*/lib/xp/content';
import { RepoBranch } from '../common';
import * as xpContentLib from '/lib/xp/content';
import { Override } from '../util-types';

type QueryParams<
    ContentType extends ContentDescriptor = ContentDescriptor,
    AggregationKeys extends string = never
> = (QueryContentParams<AggregationKeys> | QueryContentParamsWithSort<AggregationKeys>) & {
    contentTypes?: ContentType[];
};

type QueryResponseOverride<
    ContentType extends ContentDescriptor = ContentDescriptor,
    AggregationKeys extends string = never
> = Override<
    QueryResponse<any, AggregationKeys>,
    Readonly<{
        hits: ReadonlyArray<Content<ContentType>>;
    }>
>;

type CreateContentParamsOverride<
    ContentType extends CustomContentDescriptor = CustomContentDescriptor
> = Override<
    CreateContentParams<any>,
    {
        contentType: ContentType;
        data: CustomContentDataConfigs[ContentType];
    }
>;

type ModifyContentParamsOverride<ContentType extends ContentDescriptor = ContentDescriptor> =
    Override<
        ModifyContentParams<any>,
        {
            editor: (content: Content<ContentType>) => Content<ContentType>;
        }
    >;

type PublishContentParamsOverride = Override<
    PublishContentParams,
    {
        sourceBranch: RepoBranch;
        targetBranch: RepoBranch;
    }
>;

interface ContentLibOverride {
    get(params: GetContentParams): Content | null;

    // TODO: add typing for filters
    query<
        ContentType extends ContentDescriptor = ContentDescriptor,
        AggregationKeys extends string = never
    >(
        params: QueryParams<ContentType, AggregationKeys>
    ): QueryResponseOverride<ContentType, AggregationKeys>;

    // Dummy definition to prevent type errors, as the original definition
    // for this interface has an overloaded query function
    query(): never;

    create<ContentType extends CustomContentDescriptor = CustomContentDescriptor>(
        params: CreateContentParamsOverride<ContentType>
    ): Content<ContentType>;

    modify<ContentType extends ContentDescriptor = ContentDescriptor>(
        params: ModifyContentParamsOverride<ContentType>
    ): Content;

    publish(params: PublishContentParamsOverride): PublishResponse;

    getChildren(params: GetChildrenParams): QueryResponseOverride;
}

export type ContentLibrary = Override<xpContentLib.ContentLibrary, ContentLibOverride>;
