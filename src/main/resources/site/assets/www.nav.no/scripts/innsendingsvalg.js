function submitPost(skjemaveilederURL){
$("form#innsendingsvalg").attr("action",skjemaveilederURL + '#adr');
$("#innsendingsvalg").submit();
}

function submitToVedlegg(skjemaveilederURL, key){
$("form#innsendingsvalg").attr("action", skjemaveilederURL);
$("form#innsendingsvalg").attr("key", key);
$("form#innsendingsvalg").attr("entrance","classic");
$("#innsendingsvalg").submit();
}


function toggleStepIndicator()
{
	$(".vedleggsveileder1").removeClass('waiting');
	$(".vedleggsveileder1").removeClass('selected');
	$(".vedleggsveileder2").removeClass('waiting');
	$(".vedleggsveileder3").removeClass('waiting');
	$(".vedleggsveileder3").removeClass('selected');
	$(".vedleggsveileder4").removeClass('waiting');
	$(".vedleggsveileder4").addClass('selected');
}