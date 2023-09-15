import {
    getGlobalValueItem,
    getGlobalValueSet,
    getGvKeyAndContentIdFromUniqueKey,
} from './global-value-utils';
import { GlobalValueItem } from './types';
import { CaseTimeUnit } from '../../types/content-types/global-case-time-set';
import { CONTENT_ROOT_PROJECT_ID, CONTENT_STUDIO_PATH_PREFIX } from '../constants';

// Global values are always retrieved from the default project
const EDITOR_PATH_PREFIX = `${CONTENT_STUDIO_PATH_PREFIX}/${CONTENT_ROOT_PROJECT_ID}`;

const enToNo: Record<CaseTimeUnit, string> = {
    days: 'dager',
    weeks: 'uker',
    months: 'måneder',
};

export const buildGlobalValuePreviewString = (valueItem: GlobalValueItem) => {
    if (valueItem.type === 'caseTime') {
        return `Navn: ${valueItem.itemName} - Behandlingstid: ${valueItem.value} ${
            enToNo[valueItem.unit]
        }`;
    }

    return `Navn: ${valueItem.itemName} - Verdi: ${valueItem.numberValue}`;
};

export const createGlobalValueMacroPreview = (key: string) => {
    const { contentId, gvKey } = getGvKeyAndContentIdFromUniqueKey(key);

    if (!contentId) {
        return `<span>Feil: ${key} er ikke en gyldig referanse til en global verdi</span>`;
    }

    const globalValueSet = getGlobalValueSet(contentId);

    if (!globalValueSet) {
        return `<span>Feil: ${contentId} er ikke en gyldig referanse til global verdier</span>`;
    }

    const { displayName, _path } = globalValueSet;

    const valueItem = getGlobalValueItem(gvKey, globalValueSet);

    if (!valueItem) {
        return `<span>Feil: verdi med nøkkel ${gvKey} finnes ikke under ${displayName} (id: ${contentId})</span>`;
    }

    return `
        <div>
            <span style='font-size:20px'>${displayName}</span><br/>
            <span style='color:#888888'>${_path}</span><br/>
            <a href='${EDITOR_PATH_PREFIX}/edit/${contentId}' target='_blank'>[Åpne i editoren]</a><br/>
            <br/>
            ${buildGlobalValuePreviewString(valueItem)}
        </div>
    `;
};
