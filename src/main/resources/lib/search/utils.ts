import { URLS } from '../constants';

export const isSearchIndexingEnabled = () => !!(app.config.searchApiKey && URLS.SEARCH_API_URL);

export const generateSearchDocumentId = (contentId: string, locale: string) =>
    `${contentId}-${locale}`;
