/**
 * Functions to get, query and manipulate nodes.
 *
 * @example
 * var nodeLib = require('/lib/xp/node');
 *
 * @module node
 */
declare global {
    interface XpLibraries {
        '/lib/xp/node': typeof import('./node');
    }
}
import type {
    Aggregations,
    AggregationsResult,
    AggregationsToAggregationResults,
    ByteSource,
    Filter,
    Highlight,
    HighlightResult,
    PrincipalKey,
    QueryDsl,
    SortDsl,
} from '@enonic-types/core';
export type {
    Aggregation,
    Aggregations,
    AggregationsResult,
    BooleanDslExpression,
    BooleanFilter,
    Bucket,
    BucketsAggregationResult,
    BucketsAggregationsUnion,
    ByteSource,
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
    PrincipalKey,
    QueryDsl,
    RangeDslExpression,
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
} from '@enonic-types/core';
declare type WithRequiredProperty<T, K extends keyof T> = T & {
    [P in K]-?: T[P];
};
export interface TermSuggestion {
    text: string;
    term: TermSuggestionOptions;
}
export interface TermSuggestionOptions {
    field: string;
    analyzer?: string;
    sort?: 'score' | 'frequency';
    suggestMode?: 'missing' | 'popular' | 'always';
    stringDistance?: 'internal' | 'damerau_levenshtein' | 'levenshtein' | 'jarowinkler' | 'ngram';
    size?: number | null;
    maxEdits?: number | null;
    prefixLength?: number | null;
    minWordLength?: number | null;
    maxInspections?: number | null;
    minDocFreq?: number | null;
    maxTermFreq?: number | null;
}
export interface Explanation {
    value: number;
    description: string;
    details: Explanation[];
}
export interface NodeQueryResultHit {
    id: string;
    score: number;
    explanation?: Explanation;
    highlight?: HighlightResult;
}
export interface SuggestionResult {
    text: string;
    length: number;
    offset: number;
    options: {
        text: string;
        score: number;
        freq?: number;
    }[];
}
export interface NodeQueryResult<
    AggregationOutput extends Record<string, AggregationsResult> | undefined = undefined,
> {
    total: number;
    count: number;
    hits: NodeQueryResultHit[];
    aggregations: AggregationOutput;
    suggestions?: Record<string, SuggestionResult[]>;
}
export interface NodeMultiRepoQueryResult<
    AggregationOutput extends Record<string, AggregationsResult> | undefined = undefined,
> {
    total: number;
    count: number;
    hits: (NodeQueryResultHit & {
        repoId: string;
        branch: string;
    })[];
    aggregations: AggregationOutput;
    suggestions?: Record<string, SuggestionResult[]>;
}
export declare type CreateNodeParams<NodeData = unknown> = NodePropertiesOnCreate & NodeData;
export interface ModifyNodeParams<NodeData = unknown> {
    key: string;
    editor: (node: Node<NodeData>) => ModifiedNode<NodeData>;
}
export interface GetNodeParams {
    key: string;
    versionId?: string;
}
export interface PushNodeParams {
    key?: string | null;
    keys?: string[] | null;
    target: string;
    includeChildren?: boolean;
    resolve?: boolean;
    exclude?: string[] | null;
}
export interface PushNodesResult {
    success: string[];
    failed: {
        id: string;
        reason: string;
    }[];
    deleted: string[];
}
export interface DiffBranchesParams {
    key: string;
    target: string;
    includeChildren: boolean;
}
export interface DiffBranchesResult {
    diff: {
        id: string;
        status: string;
    }[];
}
export interface GetBinaryParams {
    key: string;
    binaryReference?: string | null;
}
export interface MoveNodeParams {
    source: string;
    target: string;
}
export interface SetChildOrderParams {
    key: string;
    childOrder: string;
}
export interface QueryNodeParams<AggregationInput extends Aggregations = never> {
    start?: number;
    count?: number;
    query?: QueryDsl | string;
    sort?: string | SortDsl | SortDsl[];
    filters?: Filter | Filter[];
    aggregations?: AggregationInput;
    suggestions?: Record<string, TermSuggestion>;
    highlight?: Highlight;
    explain?: boolean;
}
export interface FindVersionsParams {
    key: string;
    start?: number | null;
    count?: number | null;
}
export interface NodeVersion {
    versionId: string;
    nodeId: string;
    nodePath: string;
    timestamp: string;
    commitId?: string;
}
export interface NodeVersionsQueryResult {
    total: number;
    count: number;
    hits: NodeVersion[];
}
export interface GetActiveVersionParams {
    key: string;
}
export interface SetActiveVersionParams {
    key: string;
    versionId: string;
}
export interface FindChildrenParams {
    parentKey: string;
    start?: number | null;
    count?: number | null;
    childOrder?: string;
    countOnly?: boolean;
    recursive?: boolean;
}
export interface DuplicateParams<NodeData = Record<string, unknown>> {
    nodeId: string;
    name?: string;
    parent?: string;
    includeChildren?: boolean;
    dataProcessor?: (v: NodeData) => NodeData;
    refresh?: RefreshMode;
}
export interface FindNodesByParentResult {
    total: number;
    count: number;
    hits: {
        id: string;
    }[];
}
export declare type RefreshMode = 'SEARCH' | 'STORAGE' | 'ALL';
export interface GetCommitParams {
    id: string;
}
export interface NodeCommit {
    id: string;
    message: string;
    committer: string;
    timestamp: string;
}
export interface CommitParams {
    keys: string | string[];
    message?: string;
}
export interface SetRootPermissionsParams {
    _permissions: AccessControlEntry[];
    _inheritsPermissions: boolean;
}
export declare type Permission =
    | 'READ'
    | 'CREATE'
    | 'MODIFY'
    | 'DELETE'
    | 'PUBLISH'
    | 'READ_PERMISSIONS'
    | 'WRITE_PERMISSIONS';
export interface AccessControlEntry {
    principal: PrincipalKey;
    allow?: Permission[];
    deny?: Permission[];
}
export interface NodeIndexConfig {
    analyzer?: string;
    default?: NodeConfigEntry;
    configs: {
        path: string;
        config: NodeConfigEntry;
    }[];
}
export declare type NodeIndexConfigTemplates = 'none' | 'byType' | 'fulltext' | 'path' | 'minimal';
export interface NodeIndexConfigParams {
    analyzer?: string;
    default?: Partial<NodeConfigEntry> | NodeIndexConfigTemplates;
    configs?: {
        path: string;
        config: Partial<NodeConfigEntry> | NodeIndexConfigTemplates;
    }[];
}
export interface NodeConfigEntry {
    decideByType: boolean;
    enabled: boolean;
    nGram: boolean;
    fulltext: boolean;
    includeInAllText: boolean;
    path: boolean;
    indexValueProcessors: string[];
    languages: string[];
}
export declare type CommonNodeProperties = {
    _childOrder: string;
    _inheritsPermissions: boolean;
    _manualOrderValue?: number;
    _name: string;
    _nodeType: string;
    _path: string;
    _permissions: AccessControlEntry[];
    _state: string;
    _ts: string;
    _versionKey: string;
};
export declare type NodePropertiesOnCreate = Partial<CommonNodeProperties> & {
    _indexConfig?: Partial<NodeIndexConfigParams>;
    _parentPath?: string;
};
export declare type NodePropertiesOnModify = CommonNodeProperties & {
    _id: string;
    _indexConfig: NodeIndexConfigParams;
    _parentPath?: never;
};
export declare type NodePropertiesOnRead = CommonNodeProperties & {
    _id: string;
    _indexConfig: NodeIndexConfig;
    _parentPath?: never;
};
export declare type ModifiedNode<Data = Record<string, unknown>> = NodePropertiesOnModify & Data;
export declare type Node<Data = Record<string, unknown>> = NodePropertiesOnRead & Data;
export interface RepoConnection {
    create<NodeData = Record<string, unknown>>(params: CreateNodeParams<NodeData>): Node<NodeData>;
    modify<NodeData = Record<string, unknown>>(params: ModifyNodeParams<NodeData>): Node<NodeData>;
    get<NodeData = Record<string, unknown>>(key: string | GetNodeParams): Node<NodeData> | null;
    get<NodeData = Record<string, unknown>>(
        keys: (string | GetNodeParams)[]
    ): Node<NodeData> | Node<NodeData>[] | null;
    get<NodeData = Record<string, unknown>>(
        ...keys: (string | GetNodeParams | (string | GetNodeParams)[])[]
    ): Node<NodeData> | Node<NodeData>[] | null;
    delete(...keys: (string | string[])[]): string[];
    push(params: PushNodeParams): PushNodesResult;
    diff(params: DiffBranchesParams): DiffBranchesResult;
    getBinary(params: GetBinaryParams): ByteSource;
    move(params: MoveNodeParams): boolean;
    setChildOrder<NodeData = Record<string, unknown>>(params: SetChildOrderParams): Node<NodeData>;
    query<AggregationInput extends Aggregations = never>(
        params: QueryNodeParams<AggregationInput>
    ): NodeQueryResult<AggregationsToAggregationResults<AggregationInput>>;
    exists(key: string): boolean;
    findVersions(params: FindVersionsParams): NodeVersionsQueryResult;
    getActiveVersion(params: GetActiveVersionParams): NodeVersion | null;
    setActiveVersion(params: SetActiveVersionParams): boolean;
    findChildren(params: FindChildrenParams): FindNodesByParentResult;
    refresh(mode?: RefreshMode): void;
    setRootPermissions<NodeData = Record<string, unknown>>(
        params: SetRootPermissionsParams
    ): Node<NodeData>;
    commit(params: CommitParams): NodeCommit;
    getCommit(params: GetCommitParams): NodeCommit | null;
    duplicate<NodeData = Record<string, unknown>>(
        params: DuplicateParams<NodeData>
    ): Node<NodeData>;
}
export interface MultiRepoConnection {
    query<AggregationInput extends Aggregations = never>(
        params: QueryNodeParams<AggregationInput>
    ): NodeMultiRepoQueryResult<AggregationsToAggregationResults<AggregationInput>>;
}
export interface ConnectParams {
    repoId: string;
    branch: string;
    principals?: PrincipalKey[];
    user?: {
        login: string;
        idProvider?: string;
    };
}
/**
 * Creates a connection to a repository with a given branch and authentication info.
 *
 * @example-ref examples/node/connect.js
 *
 * @param {object} params JSON with the parameters.
 * @param {object} params.repoId repository id
 * @param {object} params.branch branch id
 * @param {object} [params.user] User to execute the callback with. Default is the current user.
 * @param {string} params.user.login Login of the user.
 * @param {string} [params.user.idProvider] Id provider containing the user. By default, all the id providers will be used.
 * @param {string[]} [params.principals] Additional principals to execute the callback with.
 * @returns {RepoConnection} Returns a new repo-connection.
 */
export declare function connect(params: ConnectParams): RepoConnection;
export interface MultiRepoConnectParams {
    sources: WithRequiredProperty<ConnectParams, 'principals'>[];
}
/**
 * Creates a connection to several repositories with a given branch and authentication info.
 *
 * @example-ref examples/node/multiRepoConnect.js
 *
 * @param {object} params JSON with the parameters.
 * @param {object[]} params.sources array of sources to connect to
 * @param {object} params.sources.repoId repository id
 * @param {object} params.sources.branch branch id
 * @param {object} [params.sources.user] User to execute the callback with. Default is the current user.
 * @param {string} params.sources.user.login Login of the user.
 * @param {string} [params.sources.user.idProvider] Id provider containing the user. By default, all the id providers will be used.
 * @param {string[]} params.sources.principals Principals to execute the callback with.
 *
 * @returns {MultiRepoConnection} Returns a new multirepo-connection.
 */
export declare function multiRepoConnect(params: MultiRepoConnectParams): MultiRepoConnection;
