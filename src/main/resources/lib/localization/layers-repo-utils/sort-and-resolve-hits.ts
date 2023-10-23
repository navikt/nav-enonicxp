import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { MultiRepoNodeQueryHit } from '/lib/xp/node';
import { RepoBranch } from '../../../types/common';
import { runInContext } from '../../context/run-in-context';

type Hits = readonly MultiRepoNodeQueryHit[];

export type RepoIdContentBuckets = Record<string, Content[]>;

export type RepoIdNodeIdBuckets = Record<string, string[]>;

type NonResolvedArgs = {
    hits: Hits;
    resolveContent?: false;
};

type ResolvedArgs = {
    hits: Hits;
    resolveContent: true;
    branch: RepoBranch;
};

export function sortMultiRepoNodeHitsToBuckets(props: NonResolvedArgs): RepoIdNodeIdBuckets;
export function sortMultiRepoNodeHitsToBuckets(props: ResolvedArgs): RepoIdContentBuckets;
export function sortMultiRepoNodeHitsToBuckets(props: ResolvedArgs | NonResolvedArgs) {
    return props.resolveContent
        ? createBucketsWithContent(props.hits, props.branch)
        : createBucketsWithIds(props.hits);
}

const createBucketsWithIds = (hits: Hits) => {
    return hits.reduce<RepoIdNodeIdBuckets>((acc, node) => {
        const { repoId, id } = node;

        if (!acc[repoId]) {
            acc[repoId] = [];
        }

        acc[repoId].push(id);

        return acc;
    }, {});
};

const createBucketsWithContent = (hits: Hits, branch: RepoBranch) => {
    return hits.reduce<RepoIdContentBuckets>((acc, node) => {
        const { repoId, id } = node;

        if (!acc[repoId]) {
            acc[repoId] = [];
        }

        const content = runInContext({ repository: repoId, branch, asAdmin: true }, () =>
            contentLib.get({ key: id })
        );

        if (content) {
            acc[repoId].push(content);
        }

        return acc;
    }, {});
};
