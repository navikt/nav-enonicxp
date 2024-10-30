import { isValidLocale } from '../../../lib/localization/layers-data';

export const externalArchiveContentIconGet = (req: XP.Request) => {
    const { id, locale } = req.params;

    if (!id || !locale) {
        return {
            status: 400,
            body: {
                msg: 'Parameters id and locale are required',
            },
        };
    }

    if (!isValidLocale(locale)) {
        return {
            status: 400,
            body: {
                msg: `Invalid locale specified: ${locale}`,
            },
        };
    }
};
