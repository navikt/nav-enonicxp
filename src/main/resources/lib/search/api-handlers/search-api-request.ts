import httpClient, { HttpRequestParams } from '/lib/http-client';
import { SEARCH_API_TOKEN_SCOPE, URLS } from '../../constants';
import { withCloudServiceAuthHeaders } from '../../utils/service-call-auth';

type Params = Omit<HttpRequestParams, 'url'> & { servicePath?: string };

const SERVICE_URL = URLS.SEARCH_API_URL;

export const searchApiRequest = ({ servicePath, ...rest }: Params) => {
    return httpClient.request({
        ...rest,
        url: `${SERVICE_URL}${servicePath || ''}`,
        headers: withCloudServiceAuthHeaders(
            {
                ...rest.headers,
                'api-key': app.config.searchApiKey,
            },
            SEARCH_API_TOKEN_SCOPE,
            'SearchAdminApi'
        ),
    });
};
