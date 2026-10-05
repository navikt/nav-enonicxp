// We override certain types from this library in order to enable type narrowing of content-type specific fields

import {
    Aggregations,
    AggregationsToAggregationResults,
    ByteSource,
    CommitParams,
    ConnectParams,
    DiffBranchesParams,
    DiffBranchesResult,
    DuplicateParams,
    GetActiveVersionParams,
    GetCommitParams,
    GetNodeParams,
    MoveNodeParams,
    NodeCommit,
    NodePropertiesOnCreate,
    NodePropertiesOnModify,
    NodePropertiesOnRead,
    NodeQueryResult,
    PushNodeParams,
    PushNodesResult,
    RefreshMode,
    RepoConnection as RepoConnectionOriginal,
    QueryNodeParams,
} from '@enonic-types/lib-node';

import { Content, Attachment } from '/lib/xp/content';
import { NodeComponent } from '../../components/component-node';

type ContentNodeData<ContentData extends Content> = Omit<
    ContentData,
    'attachment' | 'childOrder'
> & {
    components?: NodeComponent[];
};

type UnknownData = Record<string, unknown>;

type NodeData<Data> = Data extends Content ? ContentNodeData<Data> : Data;

export declare type CreatedNode<Data> = NodePropertiesOnCreate & NodeData<Data>;

export declare type ModifiedNode<Data> = NodePropertiesOnModify & NodeData<Data>;

// attachment property is missing from enonic-types. Remove it from here if it ever gets implemented.
export declare type RepoNode<Data> = NodePropertiesOnRead &
    NodeData<Data> & { attachment?: Attachment & { binary: string } };

export declare type CreateNodeParams<NodeData = UnknownData> = NodePropertiesOnCreate & NodeData;

export interface ModifyNodeParams<NodeData = UnknownData> {
    key: string;
    editor: (node: RepoNode<NodeData>) => ModifiedNode<NodeData>;
}

export interface RepoConnection extends RepoConnectionOriginal {
    create<Data = UnknownData>(params: CreateNodeParams<Data>): RepoNode<Data>;

    modify<Data = UnknownData>(params: ModifyNodeParams<Data>): RepoNode<Data>;

    get<Data>(key: string | GetNodeParams): RepoNode<Data> | null;

    get<Data = UnknownData>(
        keys: (string | GetNodeParams)[]
    ): RepoNode<Data> | RepoNode<Data>[] | null;

    get<Data = UnknownData>(
        ...keys: (string | GetNodeParams | (string | GetNodeParams)[])[]
    ): RepoNode<Data> | RepoNode<Data>[] | null;

    duplicate<Data = UnknownData>(params: DuplicateParams<Data>): RepoNode<Data>;
}

export declare function connect(params: ConnectParams): RepoConnection;

// There no "rest" type operator for imports/exports, so we have to export everything we don't
// override one by one :|
export {
    TermSuggestionOptions,
    TermSuggestion,
    SuggestionResult,
    RefreshMode,
    NodePropertiesOnRead,
    GetNodeParams,
    NodePropertiesOnCreate,
    NodePropertiesOnModify,
    QueryNodeParams,
    PushNodesResult,
    PushNodeParams,
    Permission,
    NodeVersion,
    NodeQueryResultHit,
    NodeQueryResult,
    NodeMultiRepoQueryResult,
    NodeIndexConfigTemplates,
    NodeIndexConfigParams,
    NodeIndexConfig,
    NodeConfigEntry,
    MultiRepoConnectParams,
    MultiRepoConnection,
    multiRepoConnect,
    MoveNodeParams,
    GetCommitParams,
    GetBinaryParams,
    GetActiveVersionParams,
    FindNodesByParentResult,
    FindChildrenParams,
    Explanation,
    DuplicateParams,
    DiffBranchesResult,
    DiffBranchesParams,
    ConnectParams,
    CommonNodeProperties,
    CommitParams,
    AccessControlEntry,
    NodeCommit,
    UpdateNodeParams,
    PatchNodeParams,
    PatchNodeResult,
    SortNodeParams,
    SortNodeResult,
    GetVersionsParams,
    GetNodeVersionsResult,
    ApplyPermissionsParams,
    ApplyPermissionsResult,
    BranchResult,
    NodeAllTextConfig,
    NodePropertiesOnUpdate,
    NodePropertiesOnPatch,
    UpdatedNode,
    PatchedNode,
    Node,
} from '@enonic-types/lib-node';

// Types re-exported from lib-node in XP7, moved to @enonic-types/core in XP8
export {
    ValueType,
    ValueCountAggregation,
    UserKey,
    TermsAggregation,
    TermDslExpression,
    StemmedDslExpression,
    StatsAggregationResult,
    StatsAggregation,
    SortDsl,
    SortDirection,
    SingleValueMetricAggregationsUnion,
    SingleValueMetricAggregationResult,
    RoleKey,
    RangeDslExpression,
    Aggregations,
    QueryDsl,
    PrincipalKey,
    PathMatchDslExpression,
    NumericRangeAggregation,
    NumericRange,
    NumericBucket,
    NotExistsFilter,
    NgramDslExpression,
    MinAggregation,
    MaxAggregation,
    MatchAllDslExpression,
    LikeDslExpression,
    InDslExpression,
    IdsFilter,
    HistogramAggregation,
    HighlightResult,
    Highlight,
    HasValueFilter,
    GroupKey,
    GeoDistanceSortDsl,
    GeoDistanceAggregation,
    FulltextDslExpression,
    Filter,
    FieldSortDsl,
    ExistsFilter,
    ExistsDslExpression,
    DslQueryType,
    DslOperator,
    DistanceUnit,
    DateRangeAggregation,
    DateRange,
    DateHistogramAggregation,
    DateBucket,
    BucketsAggregationsUnion,
    BucketsAggregationResult,
    Bucket,
    BooleanFilter,
    BooleanDslExpression,
    Aggregation,
    AggregationsResult,
    ByteSource,
} from '@enonic-types/core';
