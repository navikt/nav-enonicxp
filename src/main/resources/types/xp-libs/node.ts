import { Content, ContentDescriptor } from '../content-types/content-config';
import { Override } from '../util-types';
import nodeLib from '/lib/xp/node';
import { NodeGetParams, RepoConnection, RepoNode, Source } from '*/lib/xp/node';
import { RepoBranch } from '../common';
import { NodeComponent } from '../components/component-node';

type SourceOverride = Override<
    Source,
    {
        branch: RepoBranch;
    }
>;

type NodeGetParamsOverride = Override<
    NodeGetParams,
    {
        versionId?: string;
    }
>;

type FieldsOmittedFromNodeContent = 'attachment' | 'page' | 'childOrder' | 'type';

type RepoContent<ContentType extends ContentDescriptor = ContentDescriptor> = Omit<
    Content<ContentType>,
    FieldsOmittedFromNodeContent
> & {
    type: ContentType;
    components: NodeComponent[];
};

type RepoNodeOverride<ContentType extends ContentDescriptor = ContentDescriptor> = Override<
    RepoNode,
    ContentType extends ContentDescriptor ? RepoContent<ContentType> : RepoContent
>;

// TODO: add more function overrides as needed
type RepoConnectionOverride = Override<
    RepoConnection,
    {
        get(
            keys: string | string[] | NodeGetParamsOverride | NodeGetParamsOverride[]
        ): RepoNodeOverride | null;
    }
>;

interface NodeLibOverride {
    connect(params: SourceOverride): RepoConnectionOverride;
}

export type NodeLibrary = Override<nodeLib.NodeLibrary, NodeLibOverride>;
