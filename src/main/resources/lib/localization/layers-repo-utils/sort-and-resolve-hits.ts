import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { NodeMultiRepoQueryResult } from '/lib/xp/node';
import { RepoBranch } from '../../../types/common';
import { runInContext } from '../../context/run-in-context';

type Hits = NodeMultiRepoQueryResult['hits'];

export type RepoIdContentBuckets = Record<string, Content[]>;

export type RepoIdNodeIdBuckets = Record<string, string[]>;

type ArgsNoResolve = {
    hits: Hits;
    resolveContent?: false;
};

type ArgsWithResolve = {
    hits: Hits;
    resolveContent: true;
    branch: RepoBranch;
};

export function sortMultiRepoNodeHitsToBuckets(args: ArgsNoResolve): RepoIdNodeIdBuckets;
export function sortMultiRepoNodeHitsToBuckets(args: ArgsWithResolve): RepoIdContentBuckets;
export function sortMultiRepoNodeHitsToBuckets(args: ArgsWithResolve | ArgsNoResolve) {
    return args.resolveContent
        ? createBucketsWithContent(args.hits, args.branch)
        : createBucketsWithIds(args.hits);
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
