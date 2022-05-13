// The data fields for this type are set through a custom editor, and
// are not defined in the descriptor file

export type CaseProcessingTimeUnit = 'days' | 'weeks' | 'months';

export type CaseProcessingTimeItem = {
    key: string;
    itemName: string;
    value: number;
    unit: CaseProcessingTimeUnit;
    type: 'caseTime';
};

export type CaseProcessingTimeData = {
    valueItems?: CaseProcessingTimeItem[] | CaseProcessingTimeItem;
};
