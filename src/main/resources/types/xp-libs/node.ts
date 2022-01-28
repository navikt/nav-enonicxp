import { Content } from '../content-types/content-config';
import { Override } from '../util-types';
import nodeLib from '/lib/xp/node';
import { NodeGetParams, NodeModifyParams, RepoConnection, RepoNode, Source } from '*/lib/xp/node';
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

type FieldsOmittedFromNodeContent = 'attachment' | 'page' | 'childOrder';

type NodeContent<Content> = Omit<RepoNode, FieldsOmittedFromNodeContent> &
    Content & {
        components: NodeComponent[];
    };

type RepoNodeOverride<NodeData> = NodeData extends Content
    ? NodeContent<NodeData>
    : NodeData & RepoNode;

type NodeModifyParamsOverride<NodeData = Content> = Override<
    NodeModifyParams<NodeData>,
    { editor: (node: RepoNodeOverride<NodeData>) => RepoNodeOverride<NodeData> }
>;

// TODO: add more function overrides as needed
type RepoConnectionOverride = Override<
    RepoConnection,
    {
        get<NodeData = any>(
            keys: string | string[] | NodeGetParamsOverride | NodeGetParamsOverride[]
        ): RepoNodeOverride<NodeData> | null;

        modify<NodeData = any>(
            params: NodeModifyParamsOverride<NodeData>
        ): RepoNodeOverride<NodeData>;
    }
>;

interface NodeLibOverride {
    connect(params: SourceOverride): RepoConnectionOverride;
}

export type NodeLibrary = Override<nodeLib.NodeLibrary, NodeLibOverride>;
