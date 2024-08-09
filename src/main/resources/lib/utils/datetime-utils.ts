export const getUnixTimeFromDateTimeString = (datetime?: string | null): number => {
    if (!datetime) {
        return 0;
    }

    const validDateTime = datetime.split('.')[0];
    return new Date(validDateTime).getTime();
};

export const getISONowWithoutMS = () => {
    return new Date().toISOString().split('.')[0] + 'Z';
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
