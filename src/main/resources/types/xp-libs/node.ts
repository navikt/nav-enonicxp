import { Content } from '../content-types/content-config';
import { Override } from '../util-types';
import nodeLib from '/lib/xp/node';
import {
    NodeGetParams as XpNodeGetParams,
    NodeModifyParams as XpNodeModifyParams,
    RepoConnection as XpRepoConnection,
    RepoNode as XpRepoNode,
    Source as XpSource,
} from '*/lib/xp/node';
import { RepoBranch } from '../common';
import { NodeComponent } from '../components/component-node';

export type Source = Override<
    XpSource,
    {
        branch: RepoBranch;
    }
>;

type NodeGetParams = Override<
    XpNodeGetParams,
    {
        versionId?: string;
    }
>;

type FieldsOmittedFromNodeContent = 'attachment' | 'page' | 'childOrder';

export type NodeContent<Content> = Omit<XpRepoNode, FieldsOmittedFromNodeContent> &
    Content & {
        components: NodeComponent[];
    };

export type RepoNode<NodeData> = NodeData extends Content
    ? NodeContent<NodeData>
    : NodeData & XpRepoNode;

export type NodeModifyParams<NodeData = Content> = Override<
    XpNodeModifyParams<NodeData>,
    { editor: (node: RepoNode<NodeData>) => RepoNode<NodeData> }
>;

// TODO: add more function overrides as needed
export type RepoConnection = Override<
    XpRepoConnection,
    {
        get<NodeData = any>(
            keys: string | string[] | NodeGetParams | NodeGetParams[]
        ): RepoNode<NodeData> | null;

        modify<NodeData = any>(params: NodeModifyParams<NodeData>): RepoNode<NodeData>;
    }
>;

interface NodeLibOverride {
    connect(params: Source): RepoConnection;
}

export type NodeLibrary = Override<nodeLib.NodeLibrary, NodeLibOverride>;
