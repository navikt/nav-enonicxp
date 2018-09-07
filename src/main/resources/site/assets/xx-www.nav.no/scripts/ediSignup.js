function validateEdiFormForSubmit() {
	clearErrors();
	var validForm = validateEdiFormFields();
	if (!validForm) {
	  $("#errorBox").show();
	  $("#content").focus();		
	}	
	return validForm;	
}

function validateEdiFormFields() {
	var validForm = true;
	var errorMsg = "";		
	
	var application = $("input[name=application]:checked").val();
	if (application ==  null) {
	  validForm = false;
	  errorMsg += '<p> Du må velge applikasjon </p>';	
	  displayErrorMessageInContext($("input[name=application]"), 'Velg applikasjon');	 	  
	}
	
	var framework = $("input[name=framework]:checked").val();
	if (framework ==  null) {
	  validForm = false;
	  errorMsg += '<p> Du må velge rammeverk for kommunikasjon </p>';	
	  displayErrorMessageInContext($("input[name=framework]"), 'Velg rammeverk for kommunikasjon');	 	  
	}
	
	if ($("#certificate_issuer").val().length <  1) {
	  validForm = false;
	  errorMsg += '<p> Du må velge CA - sertifikatutsteder </p>';
	  displayErrorMessageInContext($("#certificate_issuer"), 'Velge sertifikatutsteder');	  
	}
	
	if ($("#certificate_sn").val().length <  1) {
	  validForm = false;
	  errorMsg += '<p> Du må skrive inn sertifikatets seienummer  </p>';	  
	  displayErrorMessageInContext($("#certificate_sn"), 'Skriv inn sertifikatets seienummer');
	} else {
		var cellFormat = /^[0-9]{1,9}$/;
		if(!validateValue($("#certificate_sn").val(), cellFormat)) {
			validForm = false;
			errorMsg += '<p> Sertifikatets seienummer skal være ett heltall med intill 9 siffer </p>';			
			displayErrorMessageInContext($("#certificate_sn"), 'Seienummeret skal være ett heltall med intill 9 siffer');
		}		
	}

	if ($("#org_name").val().length <  1) {
	  validForm = false;
	  errorMsg += '<p> Du må skrive inn institusjonens navn  </p>';
	  displayErrorMessageInContext($("#org_name"), 'Skriv inn institusjonens navn');			
	} else if ($("#org_name").val().length > 128) {
			validForm = false;
			errorMsg += '<p> Institusjonens navn kan ikke ha flere enn 128 tegn</p>';	
		displayErrorMessageInContext($("#org_name"), 'Navnet kan ikke ha flere enn 128 tegn');			
	}
			
	if ((application == 'POLK' || application == 'LABR' || application == 'ORTOK' || application == 'APOK' )){
		var cellFormat = /^[0-9]{9,9}$/;
		if($("#org_num_unb").val().length <  1) {
			validForm = false;
			errorMsg += '<p> Du må skrive inn organisasjonsnummeret i UNB  </p>';		
			displayErrorMessageInContext($("#org_num_unb"), 'Skriv inn organisasjonsnummeret');	  
		}
		else if(!validateValue($("#org_num_unb").val(), cellFormat)) {
			validForm = false;
			errorMsg += '<p> Organisasjonsnummeret i UNB skal være ett heltall med 9 siffer </p>';
			displayErrorMessageInContext($("#org_num_unb"), 'Nummeret skal være ett heltall med 9 siffer');
		}
	}
	
	 if ($("#org_email").val().length <  1) {
	  validForm = false;
	  errorMsg += '<p> Du må skrive inn institusjonens e-post adresse for EDI </p>';
	  displayErrorMessageInContext($("#org_email"), 'Skriv inn institusjonens e-post adresse');
	} else {		
		if(!validateEmail($("#org_email").val())) {
			validForm = false;
			errorMsg += '<p> Institusjonens e-post adresse for EDI er ikke gyldig </p>';
			displayErrorMessageInContext($("#org_email"), 'E-post addressen er ikke gyldig');
		}
	}

	if ($("#edi_provider").val().length <  1) {
	  validForm = false;
	  errorMsg += '<p> Du må velge institusjonens EDI leverandør </p>';
	  displayErrorMessageInContext($("#edi_provider"), 'Velg EDI-leverandør');
	}
	
	if ($("#technical_contact_name").val().length <  1) {
	  validForm = false;
	  errorMsg += '<p> Du må skrive inn navn på teknisk kontakt </p>';
	  displayErrorMessageInContext($("#technical_contact_name"), 'Skriv inn navn på teknisk kontakt');
	}
	
	if ($("#technical_contact_email").val().length <  1) {
	  validForm = false;
	  errorMsg += '<p> Du må skrive inn e-post adressen til teknisk kontakt </p>';
	  displayErrorMessageInContext($("#technical_contact_email"), 'Skriv inn e-post adressen til teknisk kontakt');
	} else {		
		if(!validateEmail($("#technical_contact_email").val())) {
			validForm = false;
			errorMsg += '<p> E-post adresseen til teknisk kontakt er ikke gyldig </p>';
			displayErrorMessageInContext($("#technical_contact_email"), 'E-post addressen er ikke gyldig');
		}
	}
	
	if ($("#technical_contact_tlf").val().length <  1 && $("#technical_contact_tlf2").val().length <  1) {
	  validForm = false;
	  errorMsg += '<p> Du må skrive inn minst ett telefonnummer til teknisk kontakt </p>';
	  displayErrorMessageInContext($("#technical_contact_tlf"), 'Skriv inn minst ett telefonnummer');
	}
	
	if ($("#adm_contact_name").val().length <  1) {
	  validForm = false;
	  errorMsg += '<p> Du må skrive inn navn på administrativ kontakt </p>';
	  displayErrorMessageInContext($("#adm_contact_name"), 'Skriv inn navn på administrativ kontakt');
	}
	
	if ($("#adm_contact_email").val().length <  1) {
	  validForm = false;
	  errorMsg += '<p> Du må skrive inn e-post adressen til administrativ kontakt </p>';
	  displayErrorMessageInContext($("#adm_contact_email"), 'Skriv inn e-post adressen til administrativ kontakt');
	} else {		
		if(!validateEmail($("#adm_contact_email").val())) {
			validForm = false;
			errorMsg += '<p> E-post adresseen til administrativ kontakt er ikke gyldig </p>';
			displayErrorMessageInContext($("#adm_contact_email"), 'E-post addressen er ikke gyldig');
		}
	}
	
	if ($("#adm_contact_tlf").val().length <  1 && $("#adm_contact_tlf2").val().length <  1) {
	  validForm = false;
	  errorMsg += '<p> Du må skrive inn telefon eller mobil til administrativ kontakt </p>';
	  displayErrorMessageInContext($("#adm_contact_tlf"), 'Skriv inn minst ett telefonnummer');
	}
	
	if($("#accept_terms").attr('checked') == false){
		validForm = false;
		errorMsg += '<p> Du må bekrefte av institusjonen oppfyller sikkerhetskravene i normen for informasjonssikkerhet i helsesektoren.</p>';
		displayErrorMessageInContext($("#accept_terms"), 'Du må bekrefte av institusjonen oppfyller sikkerhetskravene i normen for informasjonssikkerhet i helsesektoren.');
	}
	
	$("#errorBox").html(errorMsg);
	return validForm;
}

function validateEmail(email) {
	var cellFormat = /^([A-Za-z0-9._%+-])+\@([A-Za-z0-9.-])+\.([A-Za-z]{2,4})$/;
	return validateValue(email, cellFormat);
}

function validateValue(value, pattern) {	 	
	if (!value.match(pattern)){
	  return false;
	}
	return true;
}

function showFramework(application){
	if(application=='POLK'){
		enableRadioButton($('#framework_x400'));
		enableRadioButton($('#framework_smtp'));
		enableRadioButton($('#framework_nav'));
	}
	else if(application=='ORTOK' || application=='LABR' || application=='APOK'){
		enableRadioButton($('#framework_x400'));
		enableRadioButton($('#framework_smtp'));
		disableRadioButton($('#framework_nav'));
		$('#framework_nav').val([]);
	}
	else if(application=='SM/LE+LOM'){
		disableRadioButton($('#framework_x400'));
		$('#framework_x400').val([]);
		disableRadioButton($('#framework_smtp'));
		$('#framework_smtp').val([]);
		enableRadioButton($('#framework_nav'));
	}
}

function enableRadioButton(radioButton) {
	radioButton.removeAttr('disabled');
}

function disableRadioButton(radioButton) {
	radioButton.attr('disabled', 'disabled');
}

function hideOrgNrUNB(){
	$('#unb_row').hide();
}

function showOrgNrUNB(){
	$('#unb_row').show();
}