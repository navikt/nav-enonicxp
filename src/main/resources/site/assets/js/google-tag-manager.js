var dataLayer = dataLayer || [];
var navnoUrlScript = document.getElementById('google-tag-manager-props');
var innholdsvisningssider =  navnoUrlScript.getAttribute('innholdsvisningssider');
var seksjonssider =  navnoUrlScript.getAttribute('seksjonssider');
var subseksjonssider= navnoUrlScript.getAttribute('subseksjonssider');

if (innholdsvisningssider) {
    dataLayer[0].innholdsvisningssider = innholdsvisningssider;
}
if (seksjonssider) {
    dataLayer[0].seksjonssider = seksjonssider;
}
if(subseksjonssider) {
    dataLayer[0].subseksjonssider = subseksjonssider;
}

(function (w, d, s, l, i) {
    w[l] = w[l] || [];
    w[l].push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
    var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = (l !== 'dataLayer' ? '%26l=' + l : '');
    j.async = true;
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
    f.parentNode.insertBefore(j, f);
})(window, document, 'script', 'dataLayer', 'GTM-PM9RP3');