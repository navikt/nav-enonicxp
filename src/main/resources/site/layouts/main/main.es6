const libs = {
    portal: require('/lib/xp/portal'),
    thymeleaf: require('/lib/thymeleaf'),
};
const view = resolve('./main.html');

exports.get = function () {
    const component = libs.portal.getComponent();

    const model = {
        firstRegion: component.regions.first,
        secondRegion: component.regions.second,
        lClass: component.regions.second
            ? {
                  first: 'col-sm-12 col-md-8',
                  second: 'col-sm-12 col-md-4',
              }
            : {
                  first: 'col-sm-12',
                  second: '',
              },
    };

    return {
        body: libs.thymeleaf.render(view, model),
        contentType: 'text/html',
    };
};
