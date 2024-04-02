import {
    Aggregations,
    AggregationsToAggregationResults,
    ByteSource,
    CommitParams,
    ConnectParams,
    DiffBranchesParams,
    DiffBranchesResult,
    DuplicateParams,
    FindVersionsParams,
    GetActiveVersionParams,
    GetCommitParams,
    GetNodeParams,
    MoveNodeParams,
    NodeCommit,
    NodePropertiesOnCreate,
    NodePropertiesOnModify,
    NodePropertiesOnRead,
    NodeQueryResult,
    NodeVersionsQueryResult,
    PushNodeParams,
    PushNodesResult,
    RefreshMode,
    RepoConnection as RepoConnectionOriginal,
    QueryNodeParams,
    SetChildOrderParams,
    SetRootPermissionsParams,
} from '@enonic-types/lib-node';

import { Content } from '/lib/xp/content';
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

export declare type RepoNode<Data> = NodePropertiesOnRead & NodeData<Data>;

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

    // delete(...keys: (string | string[])[]): string[];
    //
    // push(params: PushNodeParams): PushNodesResult;
    //
    // diff(params: DiffBranchesParams): DiffBranchesResult;
    //
    // getBinary(params: GetBinaryParams): ByteSource;
    //
    // move(params: MoveNodeParams): boolean;

    setChildOrder<Data = UnknownData>(params: SetChildOrderParams): RepoNode<Data>;

    // query<AggregationInput extends Aggregations = Aggregations>(
    //     params: QueryNodeParams<AggregationInput>
    // ): NodeQueryResult<AggregationsToAggregationResults<AggregationInput>>;
    //
    // exists(key: string): boolean;
    //
    // findVersions(params: FindVersionsParams): NodeVersionsQueryResult;
    //
    // getActiveVersion(params: GetActiveVersionParams): NodeVersion | null;
    //
    // setActiveVersion(params: SetActiveVersionParams): boolean;
    //
    // findChildren(params: FindChildrenParams): FindNodesByParentResult;
    //
    // refresh(mode?: RefreshMode): void;
    //
    setRootPermissions<Data = UnknownData>(params: SetRootPermissionsParams): RepoNode<Data>;

    // commit(params: CommitParams): NodeCommit;
    //
    // getCommit(params: GetCommitParams): NodeCommit | null;

    duplicate<Data = UnknownData>(params: DuplicateParams<Data>): RepoNode<Data>;
}

export declare function connect(params: ConnectParams): RepoConnection;

export {
    ValueType,
    ValueCountAggregation,
    UserKey,
    TermSuggestionOptions,
    TermSuggestion,
    TermsAggregation,
    TermDslExpression,
    SuggestionResult,
    StemmedDslExpression,
    StatsAggregationResult,
    StatsAggregation,
    SortDsl,
    SortDirection,
    SingleValueMetricAggregationsUnion,
    SingleValueMetricAggregationResult,
    SetRootPermissionsParams,
    SetChildOrderParams,
    SetActiveVersionParams,
    RoleKey,
    RefreshMode,
    RangeDslExpression,
    NodePropertiesOnRead,
    GetNodeParams,
    NodePropertiesOnCreate,
    NodePropertiesOnModify,
    Aggregations,
    QueryNodeParams,
    QueryDsl,
    PushNodesResult,
    PushNodeParams,
    PrincipalKey,
    Permission,
    PathMatchDslExpression,
    NumericRangeAggregation,
    NumericRange,
    NumericBucket,
    NotExistsFilter,
    NodeVersionsQueryResult,
    NodeVersion,
    NodeQueryResultHit,
    NodeQueryResult,
    NodeMultiRepoQueryResult,
    NodeIndexConfigTemplates,
    NodeIndexConfigParams,
    NodeIndexConfig,
    NodeConfigEntry,
    NgramDslExpression,
    MultiRepoConnectParams,
    MultiRepoConnection,
    multiRepoConnect,
    MoveNodeParams,
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
    GetCommitParams,
    GetBinaryParams,
    GetActiveVersionParams,
    GeoDistanceSortDsl,
    GeoDistanceAggregation,
    FulltextDslExpression,
    FindVersionsParams,
    FindNodesByParentResult,
    FindChildrenParams,
    Filter,
    FieldSortDsl,
    Explanation,
    ExistsFilter,
    ExistsDslExpression,
    DuplicateParams,
    DslQueryType,
    DslOperator,
    DistanceUnit,
    DiffBranchesResult,
    DiffBranchesParams,
    DateRangeAggregation,
    DateRange,
    DateHistogramAggregation,
    DateBucket,
    ConnectParams,
    CommonNodeProperties,
    CommitParams,
    BucketsAggregationsUnion,
    BucketsAggregationResult,
    Bucket,
    BooleanFilter,
    BooleanDslExpression,
    Aggregation,
    AccessControlEntry,
    AggregationsResult,
    ByteSource,
    NodeCommit,
} from '@enonic-types/lib-node';
