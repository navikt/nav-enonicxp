import * as contentLib from '/lib/xp/content';
import * as eventLib from '/lib/xp/event';
import { getPrepublishJobName, scheduleCacheInvalidation } from '../scheduling/scheduled-publish';
import { OpeningHours } from 'site/mixins/opening-hours/opening-hours';

type RawSpecialOpeningHours = OpeningHours['specialOpeningHours'];

type CustomSpecialOpeningHours = Extract<RawSpecialOpeningHours, { _selected: 'custom' }>;

type Node = eventLib.EnonicEventData['nodes'][0];

export const scheduleContactInformationInvalidation = (
    content: contentLib.Content<'no.nav.navno:contact-information'>,
    node: Node
) => {
    const contactType =
        (content.data.contactType as any)?.chat || (content.data.contactType as any)?.telephone;
    const customSpecialOpeningHours = (
        contactType?.specialOpeningHours as CustomSpecialOpeningHours
    )?.custom as CustomSpecialOpeningHours['custom'];

    if (!customSpecialOpeningHours) {
        return;
    }

    const { validFrom, validTo } = customSpecialOpeningHours;

    if (!validFrom || !validTo) {
        return;
    }

    scheduleCacheInvalidation({
        jobName: getPrepublishJobName(`${content._id}-special-opening-hours-active`),
        id: content._id,
        path: node.path,
        repoId: node.repo,
        time: validFrom,
    });

    scheduleCacheInvalidation({
        jobName: getPrepublishJobName(`${content._id}-special-opening-hours-inactive`),
        id: content._id,
        path: node.path,
        repoId: node.repo,
        time: validTo,
    });
};
