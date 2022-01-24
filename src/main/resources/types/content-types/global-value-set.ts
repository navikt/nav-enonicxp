// The data fields for this type are set through a custom editor, and
// are not defined in the descriptor file
type GlobalValueItem = {
    key: string;
    itemName: string;
    numberValue: number;
};

export type GlobalValueSetData = {
    valueItems?: GlobalValueItem[] | GlobalValueItem;
};
