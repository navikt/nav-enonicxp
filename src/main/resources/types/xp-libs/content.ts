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
    QueryResponse as _QueryResponse,
} from '*/lib/xp/content';
import { RepoBranch } from '../common';
import * as xpContentLib from '/lib/xp/content';

type QueryParams<
    ContentType extends ContentDescriptor = ContentDescriptor,
    AggregationKeys extends string = never
> = (
    | QueryContentParams<AggregationKeys>
    | QueryContentParamsWithSort<AggregationKeys>
) & {
    contentTypes?: ContentType[];
};

type QueryResponse<
    ContentType extends ContentDescriptor = ContentDescriptor,
    AggregationKeys extends string = never
> = Omit<_QueryResponse<any, AggregationKeys>, 'hits'> &
    Readonly<{
        hits: ReadonlyArray<Content<ContentType>>;
    }>;

type CreateParams<
    ContentType extends CustomContentDescriptor = CustomContentDescriptor
> = Omit<CreateContentParams<any>, 'contentType' | 'data'> & {
    contentType: ContentType;
    data: CustomContentDataConfigs[ContentType];
};

type ModifyParams<ContentType extends ContentDescriptor = ContentDescriptor> =
    Omit<ModifyContentParams<any>, 'editor'> & {
        editor: (content: Content<ContentType>) => Content<ContentType>;
    };

type PublishParams = PublishContentParams & {
    sourceBranch: RepoBranch;
    targetBranch: RepoBranch;
};

interface ContentLibOverride {
    get(params: GetContentParams): Content | null;

    query<
        ContentType extends ContentDescriptor = ContentDescriptor,
        AggregationKeys extends string = never
    >(
        params: QueryParams<ContentType, AggregationKeys>
    ): QueryResponse<ContentType, AggregationKeys>;

    // Dummy definition to prevent type errors, as the original definition
    // for this interface has an overloaded query function
    query(): never;

    create<
        ContentType extends CustomContentDescriptor = CustomContentDescriptor
    >(
        params: CreateParams<ContentType>
    ): Content<ContentType>;

    modify<ContentType extends ContentDescriptor = ContentDescriptor>(
        params: ModifyParams<ContentType>
    ): Content;

    publish(params: PublishParams): PublishResponse;

    getChildren(params: GetChildrenParams): QueryResponse;
}

export type ContentLibrary = ContentLibOverride &
    Omit<xpContentLib.ContentLibrary, keyof ContentLibOverride>;
