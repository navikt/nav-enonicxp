
function goBack() {
     history.go(-1);
}

$(document).ready(function() {
			
			$(".vedleggsveileder1").removeClass("selected");
		    $(".vedleggsveileder2").removeClass("waiting");
	        $(".vedleggsveileder3").addClass("selected");
	        $(".vedleggsveileder3").removeClass("waiting");
	}); // jquery document ready end