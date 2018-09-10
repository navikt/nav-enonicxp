var navno = navno || {};
navno.loginUrl = 'https://tjenester.nav.no/dittnav/oversikt';
navno.logoutUrl = 'https://tjenester.nav.no/esso/logout';
navno.authServiceUrl = 'https://www.nav.no/innloggingslinje/auth';

var dataLayer = dataLayer || [{}];
dataLayer[0].seksjonssider = document.getElementById('navno-page-js').getAttribute("seksjonssider");

Modernizr.addTest('flexbox', Modernizr.testAllProps('flex'));

Innloggingslinje.init();