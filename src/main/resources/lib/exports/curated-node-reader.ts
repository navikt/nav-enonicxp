import { Content } from '/lib/xp/content';
import { ByteSource, RepoNode } from '/lib/xp/node';
import { getRepoConnection } from '../repos/repo-utils';
import { runInContext } from '../context/run-in-context';

export type CuratedProperty = {
    name: string;
    type:
        | 'string'
        | 'boolean'
        | 'long'
        | 'double'
        | 'xml'
        | 'geoPoint'
        | 'dateTime'
        | 'localDateTime'
        | 'localDate'
        | 'localTime'
        | 'reference'
        | 'link'
        | 'binaryReference'
        | 'property-set';
    value: string | CuratedProperty[] | null;
};

export type CuratedSourceNode = {
    formatVersion: 1;
    node: RepoNode<Content>;
    properties: CuratedProperty[];
    binaryReferences: string[];
    manualOrderValue: string | null;
};

type SourceVersion = {
    repository: string;
    branch: 'draft' | 'master';
    contentId: string;
    versionId?: string;
};

type NodeDescription = {
    versionId: string;
    properties: CuratedProperty[];
    binaryReferences: string[];
    manualOrderValue: string | null;
};

type NodeReaderBean = {
    describe: (contentId: string, versionId: string) => unknown;
    readBinary: (contentId: string, versionId: string, reference: string) => ByteSource;
};

const createReader = () => __.newBean('no.nav.navno.exports.CuratedNodeReader') as NodeReaderBean;

const validateSource = ({ repository, branch, contentId, versionId }: SourceVersion) => {
    if (
        ![
            'com.enonic.cms.default',
            'com.enonic.cms.navno-engelsk',
            'com.enonic.cms.navno-nynorsk',
        ].includes(repository) ||
        !['draft', 'master'].includes(branch) ||
        !/^[a-zA-Z0-9-]+$/.test(contentId) ||
        (versionId !== undefined && !/^[a-zA-Z0-9-]+$/.test(versionId))
    ) {
        throw new Error('Invalid curated source repository, branch, content id, or version');
    }
};

export const getCuratedSourceNode = (source: SourceVersion): CuratedSourceNode => {
    validateSource(source);
    return runInContext(
        { repository: source.repository, branch: source.branch, asAdmin: true },
        () => {
            const connection = getRepoConnection({
                repoId: source.repository,
                branch: source.branch,
                asAdmin: true,
            });
            const node = connection.get<Content>(
                source.versionId
                    ? { key: source.contentId, versionId: source.versionId }
                    : source.contentId
            );
            if (
                !node ||
                !node._versionKey ||
                (source.versionId && node._versionKey !== source.versionId)
            ) {
                throw new Error(`Selected content version was not found: ${source.contentId}`);
            }
            const description = __.toNativeObject(
                createReader().describe(source.contentId, node._versionKey)
            ) as NodeDescription;
            if (description.versionId !== node._versionKey) {
                throw new Error(`Content version changed during extraction: ${source.contentId}`);
            }
            return {
                formatVersion: 1,
                node,
                properties: description.properties,
                binaryReferences: description.binaryReferences,
                manualOrderValue: description.manualOrderValue,
            };
        }
    );
};

export const getCuratedSourceBinary = (
    source: SourceVersion & { versionId: string; binaryReference: string }
): ByteSource => {
    validateSource(source);
    if (!source.versionId) {
        throw new Error('An explicit source version is required for binary reads');
    }
    return runInContext(
        { repository: source.repository, branch: source.branch, asAdmin: true },
        () => createReader().readBinary(source.contentId, source.versionId, source.binaryReference)
    );
};
