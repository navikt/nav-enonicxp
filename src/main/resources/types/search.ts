import { CreatedNode, CreateNodeParams, RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import {
    SEARCH_REPO_CONTENT_ID_KEY,
    SEARCH_REPO_CONTENT_PATH_KEY,
    SEARCH_REPO_FACETS_KEY,
    SEARCH_REPO_HREF_KEY,
    SEARCH_REPO_LOCALE_KEY,
} from '../lib/search/_legacy/search-utils';
import { ArrayOrSingle } from './util-types';

export type ContentFacet = {
    facet: string;
    underfacets?: string[];
};

type SearchNodeDataFields = {
    [SEARCH_REPO_FACETS_KEY]: ArrayOrSingle<ContentFacet>;
    [SEARCH_REPO_CONTENT_ID_KEY]: string;
    [SEARCH_REPO_CONTENT_PATH_KEY]: string;
    [SEARCH_REPO_HREF_KEY]: string;
    [SEARCH_REPO_LOCALE_KEY]: string;
};

type SearchNodeCreateParamsFields = {
    modifiedTime?: Date;
    createdTime?: Date;
    publish: {
        first?: Date;
        from?: Date;
        to?: Date;
    };
};

export type SearchNodeCreateParams = CreateNodeParams<
    Omit<CreatedNode<Content>, keyof SearchNodeCreateParamsFields> &
        SearchNodeCreateParamsFields &
        SearchNodeDataFields
>;

export type SearchNode = RepoNode<Content> & SearchNodeDataFields;
