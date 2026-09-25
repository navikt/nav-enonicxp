import { FormIntermediateStepData } from '@xp-types/site/mixins/form-intermediate-step-data';
import { FormDetails } from '@xp-types/site/content-types/form-details';
import { forceArray, removeDuplicates } from './array-utils';

// Injected content lookup, so each caller resolves intermediate steps in the correct context
// (guillotine uses the request context, the search index builder uses the locale repo).
type ResolveContent = (id: string) => { data?: any } | null | undefined;

const extractFormNumbersFromSteps = (steps: FormIntermediateStepData['steps']): string[] => {
    const numbers: string[] = [];

    forceArray(steps).forEach((step) => {
        if (!step || !step.nextStep) {
            return;
        }

        const { nextStep } = step;

        if (nextStep._selected === 'external' && nextStep.external.formNumber) {
            numbers.push(nextStep.external.formNumber);
        } else if (nextStep._selected === 'next' && nextStep.next && nextStep.next.steps) {
            numbers.push(...extractFormNumbersFromSteps(nextStep.next.steps));
        }
    });

    return numbers;
};

const getFormNumbersFromVariations = (
    formType: FormDetails['formType'],
    resolveContent: ResolveContent
): string[] => {
    return forceArray(formType).reduce<string[]>((acc, variation) => {
        const { _selected } = variation;
        const selectedVariation = (variation as any)[_selected];

        // If the editor created a form-detail, didn't add any variations and just saved, we have
        // nothing to extract.
        if (!selectedVariation?.variations) {
            return acc;
        }

        const subFormNumbers: string[] = [];
        forceArray(selectedVariation.variations).forEach((variationItem) => {
            if (variationItem.link._selected === 'external') {
                if (variationItem.link.external.formNumber) {
                    subFormNumbers.push(variationItem.link.external.formNumber);
                }
            }

            if (variationItem.link._selected === 'internal') {
                const intermediateStep = resolveContent(variationItem.link.internal.target);

                if (intermediateStep && intermediateStep.data) {
                    subFormNumbers.push(
                        ...extractFormNumbersFromSteps(intermediateStep.data.steps)
                    );
                }
            }
        });

        return [...acc, ...subFormNumbers];
    }, []);
};

// Returns the complete, deduplicated set of form numbers for a form-details: the legacy
// top-level `formNumbers` field first (so editor-entered values are always kept), then the
// numbers aggregated from the variations and their intermediate steps.
export const getAllFormNumbers = (
    data: FormDetails,
    resolveContent: ResolveContent
): string[] => {
    const legacyFormNumbers = forceArray(data.formNumbers);
    const variationFormNumbers = getFormNumbersFromVariations(data.formType, resolveContent);

    return removeDuplicates([...legacyFormNumbers, ...variationFormNumbers].filter(Boolean));
};
