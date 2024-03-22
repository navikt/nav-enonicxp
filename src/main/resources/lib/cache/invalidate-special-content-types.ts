import * as contentLib from '/lib/xp/content';
import * as eventLib from '/lib/xp/event';
import { getPrepublishJobName, scheduleCacheInvalidation } from '../scheduling/scheduled-publish';

type Node = eventLib.EnonicEventData['nodes'][0];

export const scheduleContactInformationInvalidation = (
    content: contentLib.Content<'no.nav.navno:contact-information'>,
    node: Node
) => {
    const selected = content.data.contactType?._selected;
    if (!selected) {
        return;
    }

    const contactData = (content.data.contactType as any)[selected];
    const customSpecialOpeningHours = contactData.specialOpeningHours?.custom;
    if (!customSpecialOpeningHours) {
        return;
    }

    const { validFrom, validTo } = customSpecialOpeningHours;

    if (!validFrom || !validTo) {
        return;
    }

    scheduleCacheInvalidation({
        jobName: getPrepublishJobName(content._id, node.repo, 'special-opening-hours-active'),
        id: content._id,
        path: node.path,
        repoId: node.repo,
        time: validFrom,
    });

    scheduleCacheInvalidation({
        jobName: getPrepublishJobName(content._id, node.repo, 'special-opening-hours-inactive'),
        id: content._id,
        path: node.path,
        repoId: node.repo,
        time: validTo,
    });
};
