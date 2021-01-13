const htmlCleanUp = (htmlField) => {
    const theWolf = __.newBean('tools.HtmlCleaner');
    const cleanHtml = __.toNativeObject(theWolf.clean(htmlField));
    log.info(cleanHtml);
    return cleanHtml;
};

module.exports = { htmlCleanUp };
