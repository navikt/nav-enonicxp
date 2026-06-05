import * as contentLib from '/lib/xp/content';
import { FormDetails } from '@xp-types/site/content-types/form-details';
import { forceArray } from '../utils/array-utils';
import { logger } from '../utils/logging';

type FormTypeVariation = FormDetails['formType'][number];
type VariationItem = NonNullable<
    | Extract<FormTypeVariation, { _selected: 'application' }>['application']['variations']
    | Extract<FormTypeVariation, { _selected: 'complaint' }>['complaint']['variations']
    | Extract<FormTypeVariation, { _selected: 'addendum' }>['addendum']['variations']
>[number];

const trimVariationItem = (
    item: VariationItem,
    onChanged: () => void
): VariationItem => {
    const trimmedLabel = item.label.trim();
    if (trimmedLabel !== item.label) {
        onChanged();
    }

    let link = item.link;
    if (link._selected === 'external') {
        const trimmedFormNumber = link.external.formNumber?.trim();
        const trimmedUrl = link.external.url.trim();

        if (trimmedFormNumber !== link.external.formNumber || trimmedUrl !== link.external.url) {
            onChanged();
            link = {
                ...link,
                external: {
                    ...link.external,
                    formNumber: trimmedFormNumber,
                    url: trimmedUrl,
                },
            };
        }
    }

    return { ...item, label: trimmedLabel, link };
};

const trimFormTypeVariation = (
    variation: FormTypeVariation,
    onChanged: () => void
): FormTypeVariation => {
    const selected = variation._selected;
    const selectedData = (variation as Record<string, unknown>)[selected] as {
        variations?: VariationItem[];
    };

    if (!selectedData?.variations) {
        return variation;
    }

    const trimmedVariations = forceArray(selectedData.variations).map((item) =>
        trimVariationItem(item, onChanged)
    );

    return {
        ...variation,
        [selected]: {
            ...selectedData,
            variations: trimmedVariations,
        },
    } as FormTypeVariation;
};

export const buildTrimmedFormDetailsData = (
    data: FormDetails
): { trimmedData: FormDetails; hasChanges: boolean } => {
    let hasChanges = false;
    const onChanged = () => {
        hasChanges = true;
    };

    const trimOptional = (s?: string): string | undefined => {
        if (s === undefined) return undefined;
        const trimmed = s.trim();
        if (trimmed !== s) onChanged();
        return trimmed;
    };

    const title = data.title.trim();
    if (title !== data.title) onChanged();

    const longTitle = trimOptional(data.longTitle);
    const languageDisclaimer = trimOptional(data.languageDisclaimer);

    const originalFormNumbers = forceArray(data.formNumbers);
    const trimmedFormNumbers = originalFormNumbers.map((n) => {
        const trimmed = n.trim();
        if (trimmed !== n) onChanged();
        return trimmed;
    });

    const trimmedFormType = forceArray(data.formType).map((ft) =>
        trimFormTypeVariation(ft, onChanged)
    ) as FormDetails['formType'];

    const trimmedData: FormDetails = {
        ...data,
        title,
        longTitle,
        languageDisclaimer,
        formNumbers:
            trimmedFormNumbers.length === 0
                ? undefined
                : trimmedFormNumbers.length === 1
                  ? trimmedFormNumbers[0]
                  : trimmedFormNumbers,
        formType: trimmedFormType,
    };

    return { trimmedData, hasChanges };
};

export const trimFormDetailsWhitespace = (content: contentLib.Content<'no.nav.navno:form-details'>) => {
    const { trimmedData, hasChanges } = buildTrimmedFormDetailsData(content.data);

    if (!hasChanges) {
        return;
    }

    logger.info(`Trimming whitespace in form-details content: ${content._id}`);

    contentLib.modify<'no.nav.navno:form-details'>({
        key: content._id,
        requireValid: false,
        editor: (c) => {
            c.data = trimmedData;
            return c;
        },
    });
};
