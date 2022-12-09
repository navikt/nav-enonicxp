import { RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import {
    searchRepoContentIdKey,
    searchRepoContentPathKey,
    searchRepoFacetsKey,
} from '../lib/search/utils';

export type ContentFacet = {
    facet: string;
    underfacets?: string[];
};

type SearchNodeDataFields = {
    [searchRepoFacetsKey]: ContentFacet;
    [searchRepoContentIdKey]: string;
    [searchRepoContentPathKey]: string;
};

type SearchNodeCreateParamsFields = {
    _name: string;
    _parentPath: string;
    modifiedTime?: Date;
    createdTime?: Date;
    publish: {
        first?: Date;
        from?: Date;
        to?: Date;
    };
};

export type SearchNodeCreateParams = Omit<RepoNode<Content>, keyof SearchNodeCreateParamsFields> &
    SearchNodeCreateParamsFields &
    SearchNodeDataFields;

export type SearchNode = RepoNode<Content> & SearchNodeDataFields;
