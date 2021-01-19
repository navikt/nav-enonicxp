const htmlCleanUp = (htmlField) => {
    const cleaner = __.newBean('tools.HtmlCleaner');
    return __.toNativeObject(cleaner.clean(htmlField));
};

module.exports = { htmlCleanUp };
