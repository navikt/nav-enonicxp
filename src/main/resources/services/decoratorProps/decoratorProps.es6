const { getSiteContent } = require('/lib/headless/guillotine/queries/sitecontent');

const handleGet = (req) => {
    const { id, branch } = req.params;
    const content = getSiteContent(id, branch || req.branch);

    if (!content) {
        return {
            status: 404,
            body: {
                message: 'Content not found',
            },
            contentType: 'application/json',
        };
    }

    const breadcrumbs = content.breadcrumbs;
    const languages = content.data?.languages;
    const currentLanguage = content.language;

    return {
        body: { breadcrumbs, ...(languages && { languages }), currentLanguage },
        contentType: 'application/json',
    };
};

exports.get = handleGet;
