$(function() {
exportContentKeys();
var trItems = $('table.rusken tbody tr:visible').length;
var spanItems = $('div.contentkeys span').length;
var contentTimestamp = '';

$('table').tablesorter();          

	$( "#datepicker" ).datepicker({
		changeMonth: true,
		changeYear: true,
		minDate: '-5Y',
		maxDate: '+1D',
		dateFormat: 'yy-mm-dd',
		onClose: function(date) {
		    $('.error').removeClass('error');
		    $('.hide').removeClass('hide');
		    
			$('.rusken .timestamp').each(function(){
     			contentTimestamp = $(this).attr('title');
     			// skjul innhold med timestamp nyere enn date fra datepicker
     			if (date <= contentTimestamp) {	
          			$(this).parent('tr').addClass('hide');          			
     			}
			
			});
			exportContentKeys();
			trItems = $('table.rusken tbody tr:visible').length;
			spanItems = $('div.contentkeys span').length;
			//console.log(spanItems + ' ' + trItems);
			if (trItems === spanItems) {
			$('h1').text(trItems + ' treff');
			}
			else {
			// dette skal ikke kunne skje
			$('h1').text('En feil oppstod!').addClass('error');
			}
		}
	});
});

function exportContentKeys() {
	$("div.contentkeys span, div.contentkeys br").remove();
	var html = '';
	$('tr:visible td.key:nth-child(2)').each(function(){
		if($(this).html() != '') {
			html += '<span>' + $(this).html() + '</span><br />';
		}
	});
	$("div.contentkeys").append(html);
}
