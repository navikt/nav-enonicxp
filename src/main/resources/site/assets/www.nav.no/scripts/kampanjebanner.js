var navCampaign = window.navCampaign || {};
navCampaign.campaignCount;
navCampaign.currentCampaignNr;
$(function(){
	navCampaign.campaignCount = $('.NAVbigCampaign').length;
	$('.NAVbigCampaign').each(function(index) {
		if (index === 0) {
			$(this).show();
			navCampaign.currentCampaignNr = 1;
		} else {
			$(this).hide();
		}
	});
	if (navCampaign.campaignCount > 1) {
		transform('9s');
	}
});

function changeBanner() {
	var nextCampaignNr = determineNextBanner();
	$('#kampanje' + navCampaign.currentCampaignNr).fadeOut(4500);
	$('#kampanje' + nextCampaignNr).fadeIn(4500);
	navCampaign.currentCampaignNr = nextCampaignNr;	
}

function determineNextBanner() {
	if (navCampaign.currentCampaignNr === navCampaign.campaignCount) {
		return 1;
	} else {
		return navCampaign.currentCampaignNr + 1;
	}
}

function transform(delay) {
	$(window).everyTime(delay, 'loop', function() {
		changeBanner();
	}, times = navCampaign.campaignCount*3, belay = true);
};