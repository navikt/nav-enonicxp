$(function() {
   
   $("#settlement_info").parent().hide();
   $("#settlement_uuid").parent().hide();
   $("#settlement_org_num").parent().parent().hide();
   $("#settlement_period").parent().parent().hide();

   $(".datovelger").datepicker({
      flat: true,
      showOn: 'button',
      buttonImage: '/_public/www.nav.no/bilder/calendar.png',
      buttonImageOnly: true,
      dateFormat: 'yymmdd',
      firstDay: 1,
      showWeeks: true,
      currentText: 'N&aring;',
      dayNames: ['S&oslash;ndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'L&oslash;rdag'],
      dayNamesMin: ['S&oslash;', 'Ma', 'Ti', 'On', 'To', 'Fr', 'L&oslash;'],
      dayNamesShort: ['S&oslash;n', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'L&oslash;r'],
      monthNames: ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'],
      monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'],
      nextText: 'Neste',
      prevText: 'Forrige',
      weekHeader: 'Uke',
	  yearRange: '-10:+03'
   });

	$('TABLE.data TBODY TR:even').addClass("even");
	$('TABLE.data TBODY TR:odd').addClass("odd");

	$('TABLE.data TBODY TR').hover(function() {
		$(this).addClass("hover");
	}, function() {
		$(this).removeClass("hover");
	});

	$('TABLE.data TBODY TR').click(function() {
		document.location = $($($(this).children('TD')[0]).children('A')[0]).attr('href');
	});

   $('.ui-datepicker-trigger').hover(function() {
      $(this).attr('src', '/_public/www.nav.no/bilder/calendar-over.png');
   }, function() {
      $(this).attr('src', '/_public/www.nav.no/bilder/calendar.png');
   });
   
});

function validateEdiRequestFormForSubmit() {
	clearErrors();
	var validForm = validateEdiStatusRequestFormFields();
	if (!validForm) {
	  $("#errorBox").show();
	  $("#content").focus();		
	}	
	return validForm;	
}

function validateEdiStatusRequestFormFields() {
	var validForm = true;
	var errorMsg = "";
	
	var application = $("input[name=application]:checked").val();
	if (application ==  null) {
	  validForm = false;
	  errorMsg += '<p> Du må velge applikasjon </p>';	
	  displayErrorMessageInContext($("input[name=application]"), 'Velg applikasjon');	 	  
	}
	
	var cellFormat = /^[0-9]{9,9}$/;
	if($("#org_num_unb").val().length <  1) {
		validForm = false;
		errorMsg += '<p> Du må skrive inn organisasjonsnummeret i UNB  </p>';		
		displayErrorMessageInContext($("#org_num_unb"), 'Skriv inn organisasjonsnummeret');	  
	} else if(!validateValue($("#org_num_unb").val(), cellFormat)) {
		validForm = false;
		errorMsg += '<p> Organisasjonsnummeret i UNB skal være ett heltall med 9 siffer </p>';
		displayErrorMessageInContext($("#org_num_unb"), 'Nummeret skal være ett heltall med 9 siffer');
	}
	
	var settlement_ident = $("input[name=settlement_ident]:checked").val();
	if (settlement_ident == null ) {
	  validForm = false;
	  errorMsg += '<p> Du må velge identifisere det aktuelle oppgjøret </p>';	
	  displayErrorMessageInContext($("input[name=settlement_ident]"), 'Velg hvordan oppgjøret skal identifiseres');	
	} else if ( settlement_ident == "uuid" ) {
		var cellFormat = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
		if ($("#settlement_uuid").val().length <  1) {
			validForm = false;
			errorMsg += '<p> Du må skrive inn oppgjørets UUID-nummer </p>';
			displayErrorMessageInContext($("#settlement_uuid"), 'Skriv inn UUID-nummeret');
		} else if(!validateValue($("#settlement_uuid").val(), cellFormat)) {
			validForm = false;
			errorMsg += '<p> Ugyldig UUID-nummer</p>';
			displayErrorMessageInContext($("#settlement_uuid"), 'Ugyldig UUID-nummer');
		}
	} else {
		var cellFormat = /^[0-9]{9,9}$/;
		if($("#settlement_org_num").val().length > 0 && !validateValue($("#settlement_org_num").val(), cellFormat)) {
			validForm = false;
			errorMsg += '<p> Organisasjonsnummeret i for oppgjøret skal være ett heltall med 9 siffer </p>';
			displayErrorMessageInContext($("#settlement_org_num"), 'Nummeret skal være ett heltall med 9 siffer');
		}
		
		var cellFormat = /^[0-9]{4}[0-9]{2}[0-9]{2}$/;
		if($("#settlement_period").val().length <  1) {
			validForm = false;
			errorMsg += '<p> Du må skrive inn oppjørsperioden  </p>';		
			displayErrorMessageInContext($("#settlement_period"), 'Skriv inn oppgjørsperioden');	  
		} else if(!validateValue($("#settlement_period").val(), cellFormat)) {
			validForm = false;
			errorMsg += '<p> Oppgjørsperioden er ugyldig </p>';
			displayErrorMessageInContext($("#settlement_period"), 'Ugyldig periode');
		}
		
		if($("#settlement_send_date").val().length <  1) {
			validForm = false;
			errorMsg += '<p> Du må skrive inn oppjørspets avsenderdato  </p>';		
			displayErrorMessageInContext($("#settlement_send_date"), 'Skriv inn avsenderdato');	  
		} else if(!validateValue($("#settlement_send_date").val(), cellFormat)) {
			validForm = false;
			errorMsg += '<p> Oppgjørets avsenderdato er ugyldig </p>';
			displayErrorMessageInContext($("#settlement_send_date"), 'Ugyldig dato');
		}
		
		var cellFormat = /^[0-9]{1,9}(\.[0-9]{2})?$/;
		if($("#settlement_refund").val().length > 0 && !validateValue($("#settlement_refund").val(), cellFormat)) {
			validForm = false;
			errorMsg += '<p> Refusjonskravet er ugyldig, korrekt format er 12.34 </p>';
			displayErrorMessageInContext($("#settlement_refund"), 'Ugyldig refusjonskrav');
		}
	}
		
	$("#errorBox").html(errorMsg);
	if(validForm){
		if ($("#settlement_org_num").val().length == 0) {
			$("#settlement_org_num").val($("#org_num_unb").val());
		}
	}
	return validForm;
}

function validateValue(value, pattern) {	 	
	if (!value.match(pattern)){
	  return false;
	}
	return true;
}

function displayUUID(){	
	$("#settlement_uuid").parent().show();
	$("#settlement_org_num").parent().parent().hide();
	$("#settlement_period").parent().parent().hide();
	return true;
}

function displayNoUUID(){
	if ($("#settlement_org_num").val().length == 0) {		
		$("#settlement_org_num").val($("#org_num_unb").val());
	}
	$("#settlement_uuid").parent().hide();
	$("#settlement_org_num").parent().parent().show();
	$("#settlement_period").parent().parent().show();
	return true;
}
