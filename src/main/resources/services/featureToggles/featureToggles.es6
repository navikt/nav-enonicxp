const libs = {
    content: require('/lib/xp/content'),
};

const handleGet = (req) => {
    const { features } = req.params;

    if (!features) {
        return null;
    }

    const featureToggles = libs.content.getChildren({
        key: '/www.nav.no/feature-toggles',
    });

    const result = featureToggles.hits
        .filter((feature) => features.indexOf(feature.data.featureName) >= 0)
        .reduce(
            (acc, feature) => ({
                ...acc,
                [feature.data.featureName]: {
                    toggle: feature.data.toggle,
                    percentage: feature.data.percentage,
                },
            }),
            {}
        );

    return {
        body: result,
        contentType: 'application/json',
    };
};

exports.get = handleGet;
