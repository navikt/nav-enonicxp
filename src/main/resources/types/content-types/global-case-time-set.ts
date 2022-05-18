// The data fields for this type are set through a custom editor, and
// are not defined in the descriptor file

export type CaseTimeUnit = 'days' | 'weeks' | 'months';

export type CaseTimeItem = {
    key: string;
    itemName: string;
    value: number;
    unit: CaseTimeUnit;
    type: 'caseTime';
};

export type GlobalCaseTimeSetData = {
    valueItems?: CaseTimeItem[] | CaseTimeItem;
};
