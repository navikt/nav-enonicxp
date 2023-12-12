import * as contentLib from '/lib/xp/content';
import { scheduleCacheInvalidation } from '../scheduling/scheduled-publish';

export const scheduleContactInformationInvalidation = (content: contentLib.Content, node: any) => {
    if (content.type !== 'no.nav.navno:contact-information') {
        return;
    }

    const contactType =
        (content.data.contactType as any).chat || (content.data.contactType as any).telephone;
    const customSpecialOpeningHours = (contactType?.specialOpeningHours as any).custom;

    if (!customSpecialOpeningHours) {
        return;
    }

    const { validFrom, validTo } = customSpecialOpeningHours;

    if (!validFrom || !validTo) {
        return;
    }

    log.info(`validFrom: ${validFrom} - validTo: ${validTo}`);
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
