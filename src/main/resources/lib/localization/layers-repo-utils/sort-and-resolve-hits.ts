import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { MultiRepoNodeQueryHit } from '/lib/xp/node';
import { runInLocaleContext } from '../locale-context';
import { getLayersData } from '../layers-data';
import { RepoBranch } from '../../../types/common';

type Hits = readonly MultiRepoNodeQueryHit[];

export type LocaleContentBuckets = Record<string, Content[]>;

export type LocaleNodeIdBuckets = Record<string, string[]>;

type NonResolvedArgs = {
    hits: readonly MultiRepoNodeQueryHit[];
    resolveContent?: false;
};

type ResolvedArgs = {
    hits: readonly MultiRepoNodeQueryHit[];
    resolveContent: true;
    branch: RepoBranch;
};

export function sortMultiRepoNodeHitsToBuckets(props: NonResolvedArgs): LocaleNodeIdBuckets;
export function sortMultiRepoNodeHitsToBuckets(props: ResolvedArgs): LocaleContentBuckets;
export function sortMultiRepoNodeHitsToBuckets(props: ResolvedArgs | NonResolvedArgs) {
    return props.resolveContent
        ? createBucketsWithContent(props.hits, props.branch)
        : createBucketsWithIds(props.hits);
}

const createBucketsWithIds = (hits: Hits) => {
    return hits.reduce<LocaleNodeIdBuckets>((acc, node) => {
        const { repoId, id } = node;

        if (!acc[repoId]) {
            acc[repoId] = [];
        }

        acc[repoId].push(id);

        return acc;
    }, {});
};

const createBucketsWithContent = (hits: Hits, branch: RepoBranch) => {
    return hits.reduce<LocaleContentBuckets>((acc, node) => {
        const { repoId, id } = node;

        if (!acc[repoId]) {
            acc[repoId] = [];
        }

        const content = runInLocaleContext(
            { locale: getLayersData().repoIdToLocaleMap[repoId], branch, asAdmin: true },
            () => contentLib.get({ key: id })
        );

        if (content) {
            acc[repoId].push(content);
        }

        return acc;
    }, {});
};
