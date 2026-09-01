import * as contentLib from '/lib/xp/content';
import thymeleafLib from '/lib/thymeleaf';
import { runInContext } from '../../../lib/context/run-in-context';
import { getContentNodeKey } from '../../../lib/utils/content-utils';

const view = resolve('./dashboard.html');

const dashboardInfo = () => {
    const content = runInContext({ branch: 'master' }, () =>
        contentLib.query({
            query: {
                term: {
                    field: '_parentPath',
                    value: '/content/www.nav.no/admin',
                },
            },
            count: 100,
            contentTypes: ['no.nav.navno:announcement-to-editors'],
            sort: 'createdTime DESC',
        })
    ).hits[0];

    if (content) {
        const { displayName, _path, data } = content;
        // Hent eventuelt underliggende innhold av samme innholdstype som subseksjoner
        const subSections = content.hasChildren
            ? runInContext({ branch: 'master' }, () =>
                  contentLib.query({
                      query: {
                          term: {
                              field: '_parentPath',
                              value: getContentNodeKey(_path),
                          },
                      },
                      count: 100,
                      contentTypes: ['no.nav.navno:announcement-to-editors'],
                      sort: '_manualordervalue DESC',
                  })
              ).hits
            : null;
        const { text, subText } = data;
        const model = { displayName, text, subSections, subText };

        return {
            body: thymeleafLib.render(view, model),
            contentType: 'text/html; charset=UTF-8',
        };
    }
    return {
        body: null,
        contentType: 'text/html; charset=UTF-8',
    };
};

export const get = dashboardInfo;
