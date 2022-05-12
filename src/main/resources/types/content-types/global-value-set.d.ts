// The data fields for this type are set through a custom editor, and
// are not defined in the descriptor file

export type GlobalNumberValueItem = {
    key: string;
    itemName: string;
    numberValue: number;
    type?: undefined;
};

export type GlobalNumberValueSetData = {
    valueItems?: GlobalNumberValueItem[] | GlobalNumberValueItem;
};
