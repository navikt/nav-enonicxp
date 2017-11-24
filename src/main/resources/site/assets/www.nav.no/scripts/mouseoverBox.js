jQuery(function() {
	var newsListBox = jQuery('.newssection .newsListBox');
	var uls = jQuery(newsListBox).children('.newsList');
	jQuery(jQuery(uls).children('LI')).each(function(i) {
		jQuery(this).children('A').hover(function(e) {
			jQuery('BODY').append('<div class="mouseoverBox" id="molly"></div>');
			jQuery('#molly').html(jQuery(this).siblings('DIV.mouseoverContent').html());
			var left = jQuery(this).parents('.newsListBox').offset().left - (jQuery('#molly').width()+20);
			var top = e.pageY;
			if ( e.pageY+jQuery('#molly').height() > jQuery(window).height() ) {
				top = jQuery(this).offset().top-(jQuery('#molly').height()+jQuery(this).height()+20);
			}
			jQuery('#molly').css({ left: left+'px', top: (top+10)+'px' }).slideDown(300);
		}, function() {
			jQuery('#molly').remove();
		});
	});
});