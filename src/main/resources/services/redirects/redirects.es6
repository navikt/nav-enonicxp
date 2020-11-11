const { getRedirectContent } = require('../sitecontent/sitecontent');
const contentLib = require('/lib/xp/content');
const cacheLib = require('/lib/siteCache');

// Denne er ganske "tung", men skal kun kalles build-time fra frontend
const handleGet = (req) => {
    const redirects = cacheLib
        .getRedirects(
            'redirects',
            undefined,
            req.branch || 'master',
            () =>
                contentLib.getChildren({
                    key: '/redirects',
                    start: 0,
                    count: 10000,
                }).hits
        )
        .map((redirect) => {
            const destinationContent = getRedirectContent(redirect._path, req.branch);
            if (!destinationContent?.data) {
                return null;
            }

            return {
                source: redirect._path.replace('/redirects', ''),
                destination:
                    destinationContent.data.target?._path.replace('/www.nav.no', '') ||
                    destinationContent.data.url,
            };
        })
        .filter(Boolean);

    return redirects
        ? {
              status: 200,
              body: redirects,
              contentType: 'application/json',
          }
        : {
              status: 500,
              body: {
                  message: 'Error while fetching redirect paths',
              },
              contentType: 'application/json',
          };
};

exports.get = handleGet;
