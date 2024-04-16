export const stripLineBreaks = (str: string) => str.replace(/\r?\n|\r/g, '');

export const capitalize = (str: string) =>
    str
        .split(' ')
        .map((letter) => {
            return `${letter
                .toLowerCase()
                .replace(/(^|[\s-])\S/g, (letter) => letter.toUpperCase())}`;
        })
        .join(' ');
