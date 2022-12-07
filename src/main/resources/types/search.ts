import { RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { SearchConfig } from './content-types/search-config';
import {
    searchRepoContentIdKey,
    searchRepoContentPathKey,
    searchRepoFacetsKey,
} from '../lib/search/utils';

export type ContentFacet = {
    facet: string;
    underfacets?: string[];
};

export type ConfigFacet = SearchConfig['fasetter'][number];

type SearchNodeDataFields = {
    [searchRepoFacetsKey]: ContentFacet[];
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
