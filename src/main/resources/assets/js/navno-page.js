var navno = navno || {};
var navnoProps = document.getElementById('navno-props');
navno.authServiceUrl = navnoProps.getAttribute('authServiceUrl');

/* Google Analytics */
(function(w, p, l){
    w[l] = w[l] || [];
    var ga = {};
    var is =  p.getAttribute('innholdsvisningssider');
    var ss =  p.getAttribute('seksjonssider');
    var sss = p.getAttribute('subseksjonssider');
    if (is)  ga.innholdsvisningssider = is;
    if (ss)  ga.seksjonssider = ss;
    if (sss) ga.subseksjonssider = sss;
    w[l].push(ga);
})(window, document.getElementById('navno-props'), 'dataLayer');

/* Google Tag Manager */
(function (w, d, s, l, i) {
    w[l] = w[l] || [];
    w[l].push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
    var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != 'dataLayer' ? '%26l=' + l : '';
    j.async = true;
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
    f.parentNode.insertBefore(j, f);
})(window, document, 'script', 'dataLayer', 'GTM-PM9RP3');

Modernizr.addTest('flexbox', Modernizr.testAllProps('flex'));
Innloggingslinje.init();
