// We override certain types from this library in order to enable type narrowing of content-type specific fields

import {
    Aggregations,
    AggregationsResult,
    GetContentParams,
    GetChildContentParams,
    MoveContentParams,
    ContentsResult as ContentsResultOriginal,
    CreateContentParams as CreateContentParamsOriginal,
    QueryContentParams as QueryContentParamsOrignal,
    ModifyContentParams as ModifyContentParamsOriginal,
} from '@enonic-types/lib-content';

import { AggregationsToAggregationResults, Content as ContentOriginal } from '@enonic-types/core';
import { ContentDataMapper, ContentDescriptor } from '../../content-types/content-config';

export type Content<ContentType extends ContentDescriptor = ContentDescriptor> =
    ContentDataMapper<ContentType> &
        Omit<ContentOriginal, 'data' | 'type' | 'page' | 'fragment' | 'inherit'> & {
            inherit?: Array<'CONTENT' | 'PARENT' | 'NAME' | 'SORT'>; // This field is incorrectly defined in the original type
            archivedTime?: string; // Archive related fields are missing in the original type
            archivedBy?: string;
        } & (
            | {
                  originalParentPath: string;
                  originalName: string;
              }
            | {
                  originalParentPath?: undefined;
                  originalName?: undefined;
              }
        );

export declare function get<ContentType extends ContentDescriptor = ContentDescriptor>(
    params: GetContentParams
): Content<ContentType> | null;

export interface ContentsResult<
    ContentType extends ContentDescriptor = ContentDescriptor,
    AggregationOutput extends Record<string, AggregationsResult> | undefined = undefined,
> extends ContentsResultOriginal<unknown, AggregationOutput> {
    hits: Content<ContentType>[];
}

export declare function getChildren<
    ContentType extends ContentDescriptor = ContentDescriptor,
    AggregationOutput extends Record<string, AggregationsResult> = never,
>(params: GetChildContentParams): ContentsResult<ContentType, AggregationOutput>;

export interface CreateContentParams<ContentType extends ContentDescriptor>
    extends CreateContentParamsOriginal<unknown, ContentType> {
    contentType: ContentType;
    data: XP.ContentTypes[ContentType];
    page?: XP.Page;
}

export declare function create<ContentType extends ContentDescriptor>(
    params: CreateContentParams<ContentType>
): Content<ContentType>;

export interface QueryContentParams<
    ContentType extends ContentDescriptor = ContentDescriptor,
    AggregationInput extends Aggregations = never,
> extends QueryContentParamsOrignal<AggregationInput> {
    contentTypes?: ContentType[] | ReadonlyArray<ContentType>;
}

export declare function query<
    ContentType extends ContentDescriptor = ContentDescriptor,
    AggregationInput extends Aggregations = never,
>(
    params: QueryContentParams<ContentType, AggregationInput>
): ContentsResult<ContentType, AggregationsToAggregationResults<AggregationInput>>;

export interface ModifyContentParams<ContentType extends ContentDescriptor = ContentDescriptor>
    extends ModifyContentParamsOriginal<unknown, ContentType> {
    editor: (v: Content<ContentType>) => Content<ContentType>;
}

export declare function modify<ContentType extends ContentDescriptor = ContentDescriptor>(
    params: ModifyContentParams<ContentType>
): Content<ContentType> | null;

export declare function move<ContentType extends ContentDescriptor = ContentDescriptor>(
    params: MoveContentParams
): Content<ContentType>;

export interface ResetInheritanceParams {
    key: string;
    projectName: string;
    inherit: Content['inherit'];
}

export declare function resetInheritance(params: ResetInheritanceParams): void;

// There no "rest" type operator for imports/exports, so we have to export everything we don't
// override one by one :|
export {
    Aggregation,
    getAttachments,
    Aggregations,
    AggregationsResult,
    Attachment,
    BooleanDslExpression,
    BooleanFilter,
    Bucket,
    BucketsAggregationResult,
    BucketsAggregationsUnion,
    ByteSource,
    Component,
    DateBucket,
    DateHistogramAggregation,
    DateRange,
    DateRangeAggregation,
    DistanceUnit,
    DslOperator,
    DslQueryType,
    ExistsDslExpression,
    ExistsFilter,
    FieldSortDsl,
    Filter,
    FormItem,
    FormItemInlineMixin,
    FormItemInput,
    FormItemLayout,
    FormItemOptionSet,
    FormItemSet,
    FulltextDslExpression,
    GeoDistanceAggregation,
    GeoDistanceSortDsl,
    GroupKey,
    HasValueFilter,
    Highlight,
    HighlightResult,
    HistogramAggregation,
    IdsFilter,
    InDslExpression,
    InputType,
    LikeDslExpression,
    MatchAllDslExpression,
    MaxAggregation,
    MinAggregation,
    NgramDslExpression,
    NotExistsFilter,
    NumericBucket,
    NumericRange,
    NumericRangeAggregation,
    PathMatchDslExpression,
    PublishInfo,
    QueryDsl,
    RangeDslExpression,
    Region,
    RoleKey,
    SingleValueMetricAggregationResult,
    SingleValueMetricAggregationsUnion,
    SortDirection,
    SortDsl,
    StatsAggregation,
    StatsAggregationResult,
    StemmedDslExpression,
    TermDslExpression,
    TermsAggregation,
    UserKey,
    ValueCountAggregation,
    ValueType,
    Schedule,
    ARCHIVE_ROOT_PATH,
    CONTENT_ROOT_PATH,
    GetContentParams,
    GetAttachmentStreamParams,
    getAttachmentStream,
    AddAttachmentParam,
    addAttachment,
    RemoveAttachmentParams,
    removeAttachment,
    SiteConfig,
    Site,
    GetSiteParams,
    getSite,
    GetSiteConfigParams,
    getSiteConfig,
    DeleteContentParams,
    delete as delete,
    GetChildContentParams,
    IdGeneratorSupplier,
    PublishContentParams,
    PublishContentResult,
    publish,
    UnpublishContentParams,
    unpublish,
    ContentExistsParams,
    exists,
    CreateMediaParams,
    createMedia,
    MoveContentParams,
    ArchiveContentParams,
    archive,
    RestoreContentParams,
    restore,
    Permission,
    AccessControlEntry,
    SetPermissionsParams,
    Permissions,
    setPermissions,
    GetPermissionsParams,
    Icon,
    ContentType,
    getType,
    getTypes,
    GetOutboundDependenciesParams,
    getOutboundDependencies,
    ResetInheritanceHandler,
    ModifyMediaParams,
    modifyMedia,
    DuplicateContentParams,
    DuplicateContentsResult,
    duplicate,
    getPermissions,
} from '@enonic-types/lib-content';
