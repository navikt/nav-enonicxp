import { Content } from '/lib/xp/content';

const globalValuesContentType = `${app.name}:global-value-set`;

// The data fields for this type are set through a custom editor, and
// are not defined in the descriptor file
type GlobalValueItem = {
    key: string;
    itemName: string;
    numberValue: number;
};

type GlobalValueSetData = {
    valueItems?: GlobalValueItem[] | GlobalValueItem;
};

export const isGlobalValueSet = (
    content: Content<any>
): content is Content<GlobalValueSetData> =>
    content?.type === globalValuesContentType;
