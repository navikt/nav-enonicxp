const libs = {
    content: require('/lib/xp/content'),
};

const handleGet = (req) => {
    const { features } = req.params;

    log.info(features);
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
                    rollout: feature.data.gradualRollout,
                },
            }),
            {}
        );
    log.info(JSON.stringify(result));

    return {
        body: result,
        contentType: 'application/json',
    };
};

exports.get = handleGet;
