declare module '*/lib/xp/content' {
    import {
        ContentDescriptor,
        CustomContentDataConfigs,
        CustomContentDescriptor,
        ContentDataMapper,
    } from 'types/content-types/content-config';
    import { RepoBranch } from 'types/common';

    // Replacements for enonic-types definitions
    namespace contentLib {
        interface ContentLibrary {
            get(params: GetContentParams): Content | null;

            // TODO: add typing for filters
            query<
                ContentType extends ContentDescriptor = ContentDescriptor,
                AggregationKeys extends string = never
            >(
                params: QueryParams<ContentType, AggregationKeys>
            ): QueryResponse<ContentType, AggregationKeys>;

            create<ContentType extends CustomContentDescriptor = CustomContentDescriptor>(
                params: CreateContentParams<ContentType>
            ): Content<ContentType>;

            modify<ContentType extends ContentDescriptor = ContentDescriptor>(
                params: ModifyContentParams<ContentType>
            ): Content;

            getChildren(params: GetChildrenParams): QueryResponse;

            move<ContentType extends ContentDescriptor = ContentDescriptor>(
                params: MoveParams
            ): Content<ContentType>;

            // TODO: add media content types
            createMedia<Type = any>(params: CreateMediaParams): any;
        }

        type Content<Type extends ContentDescriptor = ContentDescriptor> =
            ContentDataMapper<Type> & {
                readonly _id: string;
                readonly _name: string;
                readonly _path: string;
                readonly creator: string;
                readonly modifier: string;
                readonly createdTime: string;
                readonly modifiedTime: string;
                owner: string;
                displayName: string;
                readonly hasChildren: boolean;
                language?: string;
                readonly valid: boolean;
                childOrder: string;
                x: Record<string, any>;
                attachments: Attachments;
                publish?: ScheduleParams;
                workflow: {
                    state: WORKFLOW_STATES;
                    checks: Record<string, WORKFLOW_STATES>;
                };
                page: Record<string, any>;
            };

        type QueryParams<
            ContentType extends ContentDescriptor = ContentDescriptor,
            AggregationKeys extends string = never
        > = {
            contentTypes?: ContentType[];
            start?: number;
            count: number;
            query?: string;
            filters?: BasicFilters | BooleanFilter;
            aggregations?: Record<AggregationKeys, Aggregation>;
            highlight?: Highlight;
            sort?: string;
        };

        type QueryResponse<
            ContentType extends ContentDescriptor = ContentDescriptor,
            AggregationKeys extends string = never
        > = Readonly<{
            hits: ReadonlyArray<Content<ContentType>>;
            count: number;
            total: number;
            aggregations: AggregationsResponse<AggregationKeys>;
            highlight?: HighlightResponse;
        }>;

        type CreateContentParams<
            ContentType extends CustomContentDescriptor = CustomContentDescriptor
        > = {
            contentType: ContentType;
            data: CustomContentDataConfigs[ContentType];
            name?: string;
            parentPath: string;
            displayName?: string;
            requireValid?: boolean;
            refresh?: boolean;
            language?: string;
            childOrder?: string;
            x?: Record<string, any>;
        };

        type ModifyContentParams<ContentType extends ContentDescriptor = ContentDescriptor> = {
            key: string;
            editor: (content: Content<ContentType>) => Content<ContentType>;
            requireValid?: boolean;
        };

        type PublishContentParams = {
            keys: Array<string>;
            sourceBranch: RepoBranch;
            targetBranch: RepoBranch;
            schedule?: ScheduleParams;
            excludeChildrenIds?: Array<string>;
            includeDependencies?: boolean;
        };
    }

    // Definitions from enonic-types v0.3.12
    namespace contentLib {
        interface ContentLibrary {
            /**
             * This function fetches a content
             */
            // get<Data extends object, XData extends object = object>(
            //     params: GetContentParams
            // ): Content<Data, EmptyObject, XData> | null;
            /**
             * This command queries content
             */
            // query<Data extends object, AggregationKeys extends string = never>(
            //     params: QueryContentParams<AggregationKeys>
            // ): QueryResponse<Data, AggregationKeys, QueryResponseMetaDataScore>;
            // query<Data extends object, AggregationKeys extends string = never>(
            //     params: QueryContentParamsWithSort<AggregationKeys>
            // ): QueryResponse<Data, AggregationKeys, QueryResponseMetaDataSort>;
            /**
             * This function creates a content.
             */
            // create<Data extends object>(params: CreateContentParams<Data>): Content<Data>;
            /**
             * Modifies properties of a content
             */
            // modify<
            //     Data extends object,
            //     PageConfig extends object = object,
            //     XData extends object = object
            // >(
            //     params: ModifyContentParams<Data, PageConfig, XData>
            // ): Content<Data, PageConfig, XData>;
            /**
             * This function deletes a content
             */
            delete(params: DeleteContentParams): boolean;
            /**
             * This function checks if a content exists for the current context.
             */
            exists(params: ExistsParams): boolean;
            /**
             * This function publishes content to a branch
             */
            publish(params: PublishContentParams): PublishResponse;
            /**
             * This function unpublishes content that had been published to the master branch
             */
            unpublish(params: UnpublishContentParams): ReadonlyArray<string>;
            /**
             * This function fetches children of a content
             */
            // getChildren<Data extends object>(params: GetChildrenParams): QueryResponse<Data>;
            /**
             * This function returns the list of content items that are outbound dependencies of specified content.
             */
            getOutboundDependencies(params: GetOutboundDependenciesParams): ReadonlyArray<string>;
            /**
             * Rename a content or move it to a new path
             */
            // move<Data extends object>(params: MoveParams): Content<Data>;
            /**
             * This function returns the parent site of a content
             */
            getSite<Config extends object, PageConfig extends object = never>(
                params: GetSiteParams
            ): Site<Config, PageConfig>;
            /**
             * This function returns the site configuration for this app in the parent site of a content
             */
            getSiteConfig<Config extends object>(params: GetSiteConfigParams): Config;
            /**
             * Creates a media content
             */
            // createMedia<Data extends object>(params: CreateMediaParams): Content<Data>;
            /**
             * Adds an attachment to an existing content.
             */
            addAttachment(params: AddAttachmentParams): void;
            /**
             * This function returns a content attachments
             */
            getAttachments(key: string): Attachments | null;
            /**
             * This function returns a data-stream for the specified content attachment
             */
            getAttachmentStream(params: AttachmentStreamParams): ByteSource | null;
            /**
             * Removes an attachment from an existing content
             */
            removeAttachment(params: RemoveAttachmentParams): void;
            /**
             * Resets custom inheritance flags of a content item. For an item that was inherited from a parent content
             * project/layer this action will reset specified changes made inside a specified layer.
             * @since 7.6.0
             */
            resetInheritance(params: ResetInheritanceParams): void;
            /**
             * Gets permissions on a content
             */
            getPermissions(params: GetPermissionsParams): GetPermissionsResult;
            /**
             * Sets permissions on a content
             */
            setPermissions(params: SetPermissionsParams): GetPermissionsResult;
            /**
             * Returns the properties and icon of the specified content type
             */
            getType(name: string): ContentType | null;
            /**
             * Returns the list of all the content types currently registered in the system
             */
            getTypes(): ReadonlyArray<ContentType>;
            /**
             * Archive a content.
             * @since 7.8.0
             */
            archive(params: ArchiveParams): Array<string>;
            /**
             * Restore a content from the archive.
             * @since 7.8.0
             */
            restore(params: RestoreParams): Array<string>;
        }
        type WORKFLOW_STATES = 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'REJECTED' | 'READY';
        // interface Content<
        //     Data extends object = object,
        //     PageConfig extends object = object,
        //     XData extends object = object
        // > {
        //     readonly _id: string;
        //     readonly _name: string;
        //     readonly _path: string;
        //     readonly creator: string;
        //     readonly modifier: string;
        //     readonly createdTime: string;
        //     readonly modifiedTime: string;
        //     owner: string;
        //     type: string;
        //     displayName: string;
        //     readonly hasChildren: boolean;
        //     language?: string;
        //     readonly valid: boolean;
        //     childOrder: string;
        //     data: Data;
        //     x: Record<string, Record<string, XData>>;
        //     page: Page<PageConfig>;
        //     attachments: Attachments;
        //     publish?: ScheduleParams;
        //     workflow: {
        //         state: WORKFLOW_STATES;
        //         checks: Record<string, WORKFLOW_STATES>;
        //     };
        // }
        /**
         * Implements the "data" of type "base:shortcut"
         */
        interface BaseShortcut {
            target: string;
            parameters?: Array<BaseShortcutParameter> | BaseShortcutParameter;
        }
        interface BaseShortcutParameter {
            name: string;
            value: string;
        }
        /**
         * Implements the "data" of type "base:media"
         */
        interface BaseMedia<Media extends object = BaseMediaConfig> {
            media: Media;
            caption?: string;
            artist?: string | Array<string>;
            copyright?: string;
            tags?: string | Array<string>;
        }
        interface BaseMediaConfig {
            attachment: string;
        }
        /**
         * Implements the "data" of type "media:image"
         */
        interface MediaImage extends BaseMedia<ImageConfig> {
            altText?: string;
        }
        type Image = MediaImage;
        interface ImageConfig {
            attachment: string;
            focalPoint: {
                x: number;
                y: number;
            };
            zoomPosition: {
                left: number;
                top: number;
                right: number;
                bottom: number;
            };
            cropPosition: {
                left: number;
                top: number;
                right: number;
                bottom: number;
                zoom: number;
            };
        }
        interface Page<Config> {
            readonly type: string;
            readonly path: string;
            readonly descriptor: string;
            readonly config: Config;
            readonly regions: Record<string, import('/lib/xp/portal').Region>;
        }
        interface Attachment {
            name: string;
            label?: string;
            size: number;
            mimeType: string;
        }
        interface Attachments {
            [key: string]: Attachment;
        }
        // interface QueryContentParams<AggregationKeys extends string = never> {
        //     start?: number;
        //     count: number;
        //     query?: string;
        //     filters?: BasicFilters | BooleanFilter;
        //     aggregations?: Record<AggregationKeys, Aggregation>;
        //     contentTypes?: Array<string>;
        //     highlight?: Highlight;
        // }
        interface ExistsFilter {
            exists: {
                field: string;
            };
        }
        interface NotExistsFilter {
            notExists: {
                field: string;
            };
        }
        interface HasValueFilter {
            hasValue: {
                field: string;
                values: Array<unknown>;
            };
        }
        interface IdsFilter {
            ids: {
                values: Array<string>;
            };
        }
        type BasicFilters = ExistsFilter | NotExistsFilter | HasValueFilter | IdsFilter;
        interface BooleanFilter {
            boolean: {
                must?: BasicFilters | Array<BasicFilters>;
                mustNot?: BasicFilters | Array<BasicFilters>;
                should?: BasicFilters | Array<BasicFilters>;
            };
        }
        // type QueryContentParamsWithSort<AggregationKeys extends string = never> =
        //     QueryContentParams<AggregationKeys> & {
        //         sort: string;
        //     };
        // interface QueryResponse<
        //     Data extends object,
        //     AggregationKeys extends string = never,
        //     QueryMetaData extends QueryResponseMetaDataSort | QueryResponseMetaDataScore | {} = {}
        // > {
        //     readonly count: number;
        //     readonly hits: ReadonlyArray<Content<Data, EmptyObject> & QueryMetaData>;
        //     readonly total: number;
        //     readonly aggregations: AggregationsResponse<AggregationKeys>;
        //     readonly highlight: HighlightResponse;
        // }
        interface QueryResponseMetaDataSort {
            readonly _score: null;
            readonly _sort: Array<string>;
        }
        interface QueryResponseMetaDataScore {
            readonly _score: number;
        }
        type Aggregation =
            | TermsAggregation
            | StatsAggregation
            | RangeAggregation
            | GeoDistanceAggregation
            | DateRangeAggregation
            | DateHistogramAggregation
            | MinAggregation
            | MaxAggregation
            | ValueCountAggregation;
        interface TermsAggregation {
            terms: {
                field: string;
                order: string;
                size: number;
                minDocCount?: number;
            };
            aggregations?: {
                [subaggregation: string]: Aggregation;
            };
        }
        interface StatsAggregation {
            stats: {
                field: string;
                order: string;
                size: number;
            };
            aggregations?: {
                [subaggregation: string]: Aggregation;
            };
        }
        interface RangeAggregation {
            range: {
                field: string;
                ranges?: Array<{
                    from?: number;
                    to?: number;
                }>;
                range?: {
                    from: number;
                    to: number;
                };
            };
            aggregations?: {
                [subaggregation: string]: Aggregation;
            };
        }
        interface GeoDistanceAggregation {
            geoDistance: {
                field: string;
                ranges?: Array<{
                    from?: number;
                    to?: number;
                }>;
                range?: {
                    from: number;
                    to: number;
                };
                unit: string;
                origin: {
                    lat: string;
                    lon: string;
                };
            };
            aggregations?: {
                [subaggregation: string]: Aggregation;
            };
        }
        interface DateRangeAggregation {
            dateRange: {
                field: string;
                format: string;
                ranges: Array<{
                    from?: string;
                    to?: string;
                }>;
            };
            aggregations?: {
                [subaggregation: string]: Aggregation;
            };
        }
        interface DateHistogramAggregation {
            dateHistogram: {
                field: string;
                interval: string;
                minDocCount: number;
                format: string;
            };
            aggregations?: {
                [subaggregation: string]: Aggregation;
            };
        }
        /**
         * @since 7.7.0
         */
        interface MinAggregation {
            min: {
                field: string;
            };
            aggregations?: {
                [subaggregation: string]: Aggregation;
            };
        }
        /**
         * @since 7.7.0
         */
        interface MaxAggregation {
            max: {
                field: string;
            };
            aggregations?: {
                [subaggregation: string]: Aggregation;
            };
        }
        /**
         * @since 7.7.0
         */
        interface ValueCountAggregation {
            count: {
                field: string;
            };
            aggregations?: {
                [subaggregation: string]: Aggregation;
            };
        }
        interface AggregationsResponseBucket {
            readonly docCount: number;
            readonly key: string;
            readonly from?: number | string;
            readonly to?: number | string;
            readonly [key2: string]: any;
        }
        interface AggregationsResponseEntry {
            readonly buckets: Array<AggregationsResponseBucket>;
        }
        type AggregationsResponse<AggregationKeys extends string> = {
            [K in AggregationKeys]: AggregationsResponseEntry;
        };
        interface Highlight {
            encoder?: 'default' | 'html';
            fragmenter?: 'simple' | 'span';
            fragmentSize?: number;
            numberOfFragments?: number;
            noMatchSize?: number;
            order?: 'score' | 'none';
            preTag?: string;
            postTag?: string;
            requireFieldMatch?: boolean;
            tagsSchema?: string;
            properties: Record<string, Highlight>;
        }
        interface HighlightResponse {
            readonly [uuid: string]:
                | {
                      [name: string]: ReadonlyArray<string>;
                  }
                | undefined;
        }
        interface GetContentParams {
            key: string;
            versionId?: string;
        }
        interface DeleteContentParams {
            key: string;
        }
        interface ExistsParams {
            key: string;
        }
        // interface CreateContentParams<Data> {
        //     /**
        //      * Name of content
        //      *
        //      * The parameter name is optional, but if it is not set then displayName must be specified.
        //      * When name is not set, the system will auto-generate a name based on the displayName,
        //      * by lower-casing and replacing certain characters. If there is already a content with the
        //      * auto-generated name, a suffix will be added to the name in order to make it unique.
        //      */
        //     name?: string;
        //     /**
        //      * Path to place content under
        //      */
        //     parentPath: string;
        //     /**
        //      * Display name. Default is same as name
        //      */
        //     displayName?: string;
        //     /**
        //      * The content has to be valid, according to the content type, to be created.
        //      * If requireValid=true and the content is not strictly valid, an error will be thrown
        //      */
        //     requireValid?: boolean;
        //     /**
        //      * If refresh is true, the created content will to be searchable through queries immediately,
        //      * else within 1 second. Since there is a performance penalty doing this refresh,
        //      * refresh should be set to false for bulk operations
        //      */
        //     refresh?: boolean;
        //     /**
        //      * Content type to use
        //      */
        //     contentType: string;
        //     /**
        //      * The language tag representing the content’s locale
        //      */
        //     language?: string;
        //     /**
        //      * Default ordering of children when doing getChildren if no order is given in query
        //      */
        //     childOrder?: string;
        //     /**
        //      * Actual content data
        //      */
        //     data: Data;
        //     /**
        //      * eXtra data to use
        //      */
        //     x?: Record<string, any>;
        // }
        // interface ModifyContentParams<
        //     Data extends object,
        //     PageConfig extends object = object,
        //     XData extends object = object
        // > {
        //     /**
        //      * Path or id to the content
        //      */
        //     key: string;
        //     /**
        //      * Editor callback function
        //      */
        //     editor: (c: Content<Data, PageConfig, XData>) => Content<Data, PageConfig, XData>;
        //     /**
        //      * The content has to be valid, according to the content type, to be updated.
        //      * If requireValid=true and the content is not strictly valid, an error will be thrown
        //      */
        //     requireValid?: boolean;
        // }
        // interface PublishContentParams {
        //     keys: Array<string>;
        //     sourceBranch: string;
        //     targetBranch: string;
        //     schedule?: ScheduleParams;
        //     excludeChildrenIds?: Array<string>;
        //     includeDependencies?: boolean;
        // }
        interface ScheduleParams {
            from?: string;
            to?: string;
            first?: string;
        }
        interface PublishResponse {
            readonly pushedContents: ReadonlyArray<string>;
            readonly deletedContents: ReadonlyArray<string>;
            readonly failedContents: ReadonlyArray<string>;
        }
        interface UnpublishContentParams {
            readonly keys: ReadonlyArray<string>;
        }
        interface GetChildrenParams {
            key: string;
            count: number;
            start?: number;
            sort?: string;
        }
        interface GetOutboundDependenciesParams {
            /**
             * Path or id to the content
             */
            key: string;
        }
        interface MoveParams {
            source: string;
            target: string;
        }
        interface GetSiteParams {
            key: string;
        }
        interface Site<
            Config extends object,
            PageConfig extends object = never,
            XData extends object = object
        > {
            readonly _id: string;
            readonly _name: string;
            readonly _path: string;
            type: string;
            readonly hasChildren: boolean;
            readonly valid: boolean;
            data: {
                siteConfig: SiteConfig<Config> | Array<SiteConfig<Config>>;
            };
            x: Record<string, Record<string, XData>>;
            page: Page<PageConfig>;
            attachments: Attachments;
            publish: ScheduleParams;
        }
        interface SiteConfig<Config> {
            applicationKey: string;
            config: Config;
        }
        interface GetSiteConfigParams {
            key: string;
            applicationKey: string;
        }
        interface AttachmentStreamParams {
            key: string;
            name: string;
        }
        interface RemoveAttachmentParams {
            key: string;
            name: string | Array<string>;
        }
        interface ByteSource {
            isEmpty(): boolean;
            size(): number;
        }
        interface CreateMediaParams {
            name: string;
            parentPath: string;
            mimeType?: string;
            focalX?: number;
            focalY?: number;
            data: ByteSource;
        }
        interface AddAttachmentParams {
            key: string;
            name: string;
            mimeType: string;
            label?: string;
            data?: ByteSource;
        }
        interface GetPermissionsParams {
            key: string;
        }
        interface GetPermissionsResult {
            readonly inheritsPermissions: boolean;
            readonly permissions: ReadonlyArray<PermissionsParams>;
        }
        /**
         * From enum "com.enonic.xp.security.acl.Permission"
         */
        type Permission =
            | 'READ'
            | 'CREATE'
            | 'MODIFY'
            | 'DELETE'
            | 'PUBLISH'
            | 'READ_PERMISSIONS'
            | 'WRITE_PERMISSIONS';
        interface PermissionsParams {
            principal: import('/lib/xp/auth').PrincipalKey;
            allow: Array<Permission>;
            deny: Array<Permission>;
        }
        interface SetPermissionsParams {
            key: string;
            inheritPermissions: boolean;
            overwriteChildPermissions: boolean;
            permissions: Array<PermissionsParams>;
        }
        interface IconType {
            readonly data?: ByteSource;
            readonly mimeType?: string;
            readonly modifiedTime?: string;
        }
        interface ContentType {
            readonly name: string;
            readonly displayName: string;
            readonly description: string;
            readonly superType: string;
            readonly abstract: boolean;
            readonly final: boolean;
            readonly allowChildContent: boolean;
            readonly displayNameExpression: string;
            readonly icon: ReadonlyArray<IconType>;
            readonly form: ReadonlyArray<FormItem>;
        }
        interface ResetInheritanceParams {
            /**
             * Path or id to the content
             */
            key: string;
            /**
             * A unique id of a Content Layer in which the inherited content item should be reset
             */
            projectName: string;
            /**
             * Array of inheritance flags (case-sensitive, all upper-case).
             * Supported values are:
             *  - CONTENT (resets any customized content data)
             *  - PARENT (resets item moved under a different parent)
             *  - NAME (resets renamed item)
             *  - SORT (resets custom sorting)
             */
            inherit: Array<'CONTENT' | 'PARENT' | 'NAME' | 'SORT'>;
        }
        type InputType =
            | 'Time'
            | 'DateTime'
            | 'CheckBox'
            | 'ComboBox'
            | 'Long'
            | 'Double'
            | 'RadioButton'
            | 'TextArea'
            | 'ContentTypeFilter'
            | 'GeoPoint'
            | 'TextLine'
            | 'Tag'
            | 'CustomSelector'
            | 'AttachmentUploader'
            | 'ContentSelector'
            | 'MediaSelector'
            | 'ImageSelector'
            | 'HtmlArea';
        type FormItemType = 'Input' | 'ItemSet' | 'Layout' | 'OptionSet';
        interface FormItem<Config = unknown> {
            readonly formItemType: FormItemType | string;
            readonly name: string;
            readonly label: string;
            readonly maximize: boolean;
            readonly inputType: InputType;
            readonly occurrences: {
                readonly maximum: 1;
                readonly minimum: 1;
            };
            readonly config: Config;
        }
        interface ArchiveParams {
            /**
             * Path or id of the content to be archived.
             */
            content: string;
        }
        interface RestoreParams {
            /**
             * Path or id of the content to be restored.
             */
            content: string;
            /**
             * Path of parent for restored content.
             */
            path: string;
        }
    }

    const contentLib: contentLib.ContentLibrary;
    export = contentLib;
}
