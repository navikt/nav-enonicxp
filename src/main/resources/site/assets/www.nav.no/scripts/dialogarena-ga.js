function reportUrl(url){
    var link = document.createElement('a');
    link.href=url;
    url = link.pathname + link.search;

	var wicketMatcher = /\?[0-9]+/;
	var dokuMatcher = /\/dokumentinnsending\/[a-zA-Z]*(\/[a-zA-Z0-9]*\/?[0-9]*)?(\?[0-9]*)?(.*)?/;
	var match = url.match(wicketMatcher);
	
	if(match){
		url = url.replace(match[0],'');
        url = url.replace('&','?');
	}
		
    match= url.match(dokuMatcher);
    if(match != null){
        url = url.replace(match[1],'');
    }
    return url;
}
var _gaq = _gaq || [];
var pluginUrl = '//www.google-analytics.com/plugins/ga/inpage_linkid.js';
_gaq.push(['_setAccount', 'UA-9127381-15']);
_gaq.push(['_gat._anonymizeIp']);
_gaq.push(['_setDomainName', 'nav.no']);
_gaq.push(['_require', 'inpage_linkid', pluginUrl]);
_gaq.push(['_trackPageview', reportUrl(window.location.href)]);

(function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();
