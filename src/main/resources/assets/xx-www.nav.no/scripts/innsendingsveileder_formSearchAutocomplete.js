var selectedItem = null;
$(document).ready(function() {
	//Autocomplete NAV-skjema
	$('input.selectednavskjema').autocomplete(formSearchAutocompleteUrl, {
		selectFirst: false,
		minChars: 2,
		cacheLength: 1000,
		dataType: 'json',
		extraParams: { 
			limit: '15',
			format: 'json',
			timestamp: ''
		},
		parse: function(data) {
			var parsed = [];
			data = data.skjema;
			
			for(var i = 0; i < data.length; i++) {
				parsed[parsed.length] = {
					data: data[i],
					value: data[i].text,
					result: data[i].text
				};
			}
			return parsed;
		},
		formatItem: function(item) {
			return item.text;
		}
	}).result(function(event, item) {
		window.location = item.url;
	});	
});

/*function changeValue(event){ 
	if(event.which == 9)  {  //om man trykker tab
		alert('tab er trykket på');
	} else if( event.which == 13) { //om man trykker enter
		alert(selectedItem.url);
		window.location = selectedItem.url;
	}
};*/