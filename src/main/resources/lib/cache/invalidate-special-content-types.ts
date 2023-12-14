import * as contentLib from '/lib/xp/content';
import { scheduleCacheInvalidation } from '../scheduling/scheduled-publish';
import { OpeningHours } from 'site/mixins/opening-hours/opening-hours';

type RawSpecialOpeningHours = OpeningHours['specialOpeningHours'];

type CustomSpecialOpeningHours = Extract<RawSpecialOpeningHours, { _selected: 'custom' }>;

export const scheduleContactInformationInvalidation = (
    content: contentLib.Content<'no.nav.navno:contact-information'>,
    node: any
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
        id: content._id,
        path: node.path,
        repoId: node.repo,
        publishFrom: validFrom,
        nameExtension: '-special-opening-hours-active',
    });

    scheduleCacheInvalidation({
        id: content._id,
        path: node.path,
        repoId: node.repo,
        publishFrom: validTo,
        nameExtension: '-special-opening-hours-inactive',
    });
};
