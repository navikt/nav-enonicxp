
function goBack() {
     history.go(-1);
}

function toggleStepIndicator()
{
$(".vedleggsveileder1").hide();
 $(".vedleggsveileder2").hide();
 $(".vedleggsveileder3").hide();
 $(".vedleggsveileder4").hide();
 $(".vedleggsveileder5").show();
 $(".vedleggsveileder6").show();
 $(".vedleggsveileder5").removeClass("selected");
 $(".vedleggsveileder5").removeClass("waiting");
 $(".vedleggsveileder6").removeClass("waiting");
 $(".vedleggsveileder6").addClass("selected");
}

$(document).ready(function() {
			
	$(".vedleggsveileder1").removeClass("selected");
		    $(".vedleggsveileder2").removeClass("waiting");
	        $(".vedleggsveileder3").addClass("selected");
	        $(".vedleggsveileder3").removeClass("waiting");
	}); // jquery document ready end