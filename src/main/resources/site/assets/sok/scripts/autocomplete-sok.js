/**
 * Autocomplete for søk i Enonic.
 *
 * Variablene autocompletePageUrl og searchPageUrl blir definert i sidemalen frameworkStandard.xsl eller frameworkSok.xsl, searchAdditionalParameters defineres i siden hvor formet befinner seg.
 */

jQuery(function () {
    function extractLast(term) {
        return split(term).pop();
    }

    function split(val) {
        return val.split(' ');
    }

    function extractFirst(term) {
        var previous = split(term).slice(0, -1);
        return previous.join("+");
    }

    var searchIds = ['#searchField', '#navetSearch', '#navSearch', '#inputSearch'];

    var autocompletePageUrl = jQuery('#autocompletePageUrl').text();
    var searchPageUrl = jQuery('#searchPageUrl').text();
    var searchAdditionalParameters = jQuery('#searchAdditionalParameters').text();

    for (var i = 0; i < searchIds.length; i++) {
        var searchId = searchIds[i];
        if (jQuery(searchId).length > 0) {
            jQuery(searchId).autocomplete({
                source: function (request, response) {
                    jQuery.getJSON(autocompletePageUrl,
                        {
                            prefix: encodeURI(extractLast(request.term).toLowerCase().replace(new RegExp("\"", "g"), "")),
                            query: encodeURI(extractFirst(request.term).toLowerCase().replace(new RegExp("\"", "g"), ""))
                        }, function (result, a, v) {response(result.map(decodeURI), a, v);})
                },
                select: function (event, ui) {
                    window.location = searchPageUrl + "?sokeord=" + ui.item.value + searchAdditionalParameters;
                    event.preventDefault();
                },
                minLength: 2
            });
        }
    }

    var searchIdsWithAlernativeUrl = ['#officeSearchField'];

    var alternativeAutocompletePageUrl = jQuery('#alternativeAutocompletePageUrl').text();
    var altertativeSearchPageUrl = jQuery('#altertativeSearchPageUrl').text();

    for (var i = 0; i < searchIdsWithAlernativeUrl.length; i++) {
        var searchIdAlternative = searchIdsWithAlernativeUrl[i];
        if (jQuery(searchIdAlternative).length > 0) {
            jQuery(searchIdAlternative).autocomplete({
                source: function (request, response) {
                    jQuery.getJSON(alternativeAutocompletePageUrl,
                        {
                            prefix: encodeURI(extractLast(request.term).toLowerCase().replace(new RegExp("\"", "g"), "")),
                            query: encodeURI(extractFirst(request.term).toLowerCase().replace(new RegExp("\"", "g"), ""))
                        }, function (result, a, v) {response(result.map(decodeURI), a, v);})
                },
                select: function (event, ui) {
                    window.location = altertativeSearchPageUrl + "?offset=0&queryparameter=" + ui.item.value;
                    event.preventDefault();
                },
                minLength: 2
            });
        }
    }
});
