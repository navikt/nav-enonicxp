export const externalArchiveSearchService = (req: XP.Request) => {
    const { title } = req.params;

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            title,
        },
    };
};
