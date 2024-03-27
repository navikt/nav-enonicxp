// We override certain types from this library in order to enable type narrowing of content-type specific fields

import {
    Aggregations,
    AggregationsResult,
    Filter,
    Highlight,
    HighlightResult,
    QueryDsl,
    SortDsl,
    GetContentParams,
    GetChildContentParams,
    IdGeneratorSupplier,
    MoveContentParams,
} from '@enonic-types/lib-content';

import { AggregationsToAggregationResults, Content as ContentOriginal } from '@enonic-types/core';
import { ContentDataMapper, ContentDescriptor } from '../../content-types/content-config';

export type Content<ContentType extends ContentDescriptor = ContentDescriptor> =
    ContentDataMapper<ContentType> &
        Omit<ContentOriginal, 'data' | 'type' | 'page' | 'fragment' | 'inherit'> & {
            inherit?: Array<'CONTENT' | 'PARENT' | 'NAME' | 'SORT'>; // This field is incorrectly defined in the original type
        };

export declare function get<ContentType extends ContentDescriptor = ContentDescriptor>(
    params: GetContentParams
): Content<ContentType> | null;

export interface ContentsResult<
    ContentType extends ContentDescriptor = ContentDescriptor,
    AggregationOutput extends Record<string, AggregationsResult> | undefined = undefined,
> {
    total: number;
    count: number;
    hits: Content<ContentType>[];
    aggregations: AggregationOutput;
    highlight?: Record<string, HighlightResult>;
}

export declare function getChildren<
    ContentType extends ContentDescriptor = ContentDescriptor,
    AggregationOutput extends Record<string, AggregationsResult> = never,
>(params: GetChildContentParams): ContentsResult<ContentType, AggregationOutput>;

export interface CreateContentParams<ContentType extends ContentDescriptor> {
    name?: string;
    parentPath: string;
    displayName?: string;
    requireValid?: boolean;
    refresh?: boolean;
    contentType: ContentType;
    language?: string;
    childOrder?: string;
    data: XP.ContentTypes[ContentType];
    x?: XpXData;
    idGenerator?: IdGeneratorSupplier;
    workflow?: Workflow;
}

export declare function create<ContentType extends ContentDescriptor>(
    params: CreateContentParams<ContentType>
): Content<ContentType>;

export interface QueryContentParams<
    ContentType extends ContentDescriptor = ContentDescriptor,
    AggregationInput extends Aggregations = never,
> {
    start?: number;
    count?: number;
    query?: QueryDsl | string;
    sort?: string | SortDsl | SortDsl[];
    filters?: Filter | Filter[];
    aggregations?: AggregationInput;
    contentTypes?: ContentType[] | ReadonlyArray<ContentType>;
    highlight?: Highlight;
}

export declare function query<
    ContentType extends ContentDescriptor = ContentDescriptor,
    AggregationInput extends Aggregations = never,
>(
    params: QueryContentParams<ContentType, AggregationInput>
): ContentsResult<ContentType, AggregationsToAggregationResults<AggregationInput>>;

export interface ModifyContentParams<ContentType extends ContentDescriptor = ContentDescriptor> {
    key: string;
    editor: (v: Content<ContentType>) => Content<ContentType>;
    requireValid?: boolean;
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
    _delete as delete,
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
