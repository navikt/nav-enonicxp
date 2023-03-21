export const getUnixTimeFromDateTimeString = (datetime?: string): number => {
    if (!datetime) {
        return 0;
    }

    const validDateTime = datetime.split('.')[0];
    return new Date(validDateTime).getTime();
};

// Nashorn does not parse datetime-strings with higher precision than milliseconds
export const fixDateFormat = (date: string) => {
    const [rest, fractionalSeconds] = date.split('.');

    if (!fractionalSeconds) {
        return rest;
    }

    const ms = fractionalSeconds.replace('Z', '').slice(0, 3);

    return `${rest}${ms ? `.${ms}Z` : ''}`;
};

export const dateTimesAreEqual = (dateTime1: string, dateTime2: string) =>
    new Date(fixDateFormat(dateTime1)).getTime() === new Date(fixDateFormat(dateTime2)).getTime();

const xpDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.?\d*Z?$/;

export const isXpDateTime = (value: string) => xpDateTimePattern.test(value);
