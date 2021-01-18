const htmlCleanUp = (htmlField) => {
    const cleaner = __.newBean('tools.HtmlCleaner');
    const cleanHtml = __.toNativeObject(cleaner.clean(htmlField));
    return cleanHtml;
};

module.exports = { htmlCleanUp };
