export type Fylke = (typeof FYLKER)[number];

const FYLKER = [
    'agder',
    'innlandet',
    'more-og-romsdal',
    'nordland',
    'oslo',
    'rogaland',
    'troms-og-finnmark',
    'trondelag',
    'vest-viken',
    'vestfold-og-telemark',
    'vestland',
    'ost-viken',
] as const;

const fylkerSet: ReadonlySet<Fylke> = new Set(FYLKER);

export const isFylke = (fylkeOrNot: string): fylkeOrNot is Fylke => {
    return fylkerSet.has(fylkeOrNot as Fylke);
};
