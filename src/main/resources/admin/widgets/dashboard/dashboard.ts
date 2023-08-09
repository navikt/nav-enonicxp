const dashboardInfo = () => {
    return {
        body: '<widget>Informasjon til redaktører</widget>',
        contentType: 'text/html',
    };
};

exports.get = dashboardInfo;
