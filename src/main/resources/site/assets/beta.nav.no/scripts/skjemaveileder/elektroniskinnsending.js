function submitToVedlegg(skjemaveilederURL, key){
$("form#innsendingsvalg").attr("action", skjemaveilederURL);
$("form#innsendingsvalg").attr("key", key);
$("form#innsendingsvalg").attr("entrance","classic");
$("#innsendingsvalg").submit();
}

function submitPost(skjemaveilederURL){
$("form#innsendingsvalg").attr("action",skjemaveilederURL + '#adr');
$("#innsendingsvalg").submit();
}

function submitToElektronisk(formURL, key){
$("form#innsendingsvalg").attr("action", formURL);
$("#innsendingsvalg").submit();
}


