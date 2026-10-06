import { Content } from '/lib/xp/content';
import { ByteSource, RepoNode } from '/lib/xp/node';
import { getRepoConnection } from '../repos/repo-utils';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { runInContext } from '../context/run-in-context';
import {
    CURATED_CONTENT_ROOT_PATH,
    isCuratedBranch,
    isCuratedContentId,
    isCuratedRepository,
} from './curated-safety';

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
        !isCuratedRepository(repository) ||
        !isCuratedBranch(branch) ||
        !isCuratedContentId(contentId) ||
        (versionId !== undefined && !isCuratedContentId(versionId))
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
            if (!node?._versionKey || (source.versionId && node._versionKey !== source.versionId)) {
                throw new Error(`Selected content version was not found: ${source.contentId}`);
            }
            const description = __.toNativeObject(
                createReader().describe(source.contentId, node._versionKey)
            ) as NodeDescription;
            if (description.versionId !== node._versionKey) {
                throw new Error(`Content version changed during extraction: ${source.contentId}`);
            }
            return {
                node,
                properties: description.properties,
                binaryReferences: description.binaryReferences,
                manualOrderValue: description.manualOrderValue,
            };
        }
    );
};

// lib-node is bundled in the app, and before XP 7.16.6 it leaves allText out of _indexConfig
// (enonic/xp#12164). Checking one node lets an app built with an older xpVersion fail before
// the manifest is built, instead of on the first downloaded node.
export const assertSourceIncludesAllTextConfig = () => {
    const root = getRepoConnection({
        repoId: CONTENT_ROOT_REPO_ID,
        branch: 'draft',
        asAdmin: true,
    }).get<Content>(CURATED_CONTENT_ROOT_PATH);
    if (!root) {
        throw new Error(`Curated content root ${CURATED_CONTENT_ROOT_PATH} was not found`);
    }
    if (!(root._indexConfig as { allText?: unknown }).allText) {
        throw new Error(
            'This no.nav.navno build leaves allText out of the index config. Build it with xpVersion 7.16.6 or later'
        );
    }
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
