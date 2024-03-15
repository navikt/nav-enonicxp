import httpClient, { HttpRequestParams } from '/lib/http-client';
import { URLS } from '../../constants';

type Params = Omit<HttpRequestParams, 'url'> & { servicePath?: string };

const SERVICE_URL = URLS.SEARCH_API_URL;

export const searchApiRequest = ({ servicePath, ...rest }: Params) => {
    return httpClient.request({
        ...rest,
        url: `${SERVICE_URL}${servicePath || ''}`,
        headers: {
            ...rest.headers,
            'api-key': app.config.searchApiKey,
        },
    });
};
