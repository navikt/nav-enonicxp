$(function initAddressOptionsForm() {
    var slideSpeed = 200;
	
	
    if ($('.address-options').length > 0) {
        initRadioButtonInteraction();
        initZipCodeInputFields();
        initAutocomplete();
        handleFormSubmit();
        handleNavUnitInputToggle();
        expandCheckedFields();
        restoreSelectedNavUnit();
    }

    function handleNavUnitInputToggle() {
        var navUnitContainer = $('#nav-unit');
        $('#excase1').on('click', function () {
            navUnitContainer.slideToggle(slideSpeed);
        });

        var navUnit2Container = $('#nav-unit-2');
        $('.radio-options input[name="utland"]').on('click', function () {
            var isChecked = ($("#utlandContactEnhet:checked").length === 1);
            if ($(this).attr("id") === "utlandContactEnhet" && isChecked) {
                navUnit2Container.slideDown(slideSpeed);
            }
            else if (!isChecked) {
                navUnit2Container.slideUp(slideSpeed);
            }
        });
    }

    function restoreSelectedNavUnit() {
        var navRelationInNorwayCb = $("#excase1").is(":checked");
        var navRelationFromAbroadCb = $("#utlandContactEnhet").is(":checked");
        var postalPlace = $("#notinnorwaypostalplace").val();
        var aRadioButtonIsChecked = ($("input[type='radio']:checked").length > 0);

        var navUnitOrgValue = $("#navUnitOrg").val();
        var isNavUnitOrgFilledOut = (isNotUndefined(navUnitOrgValue) && navUnitOrgValue.length > 0);

        var navUnitMultipleValue = $("#navUnitMultiple").val();
        var isNavUnitMultipleFilledOut = (isNotUndefined(navUnitMultipleValue) && navUnitMultipleValue.length > 0);

        if (navRelationInNorwayCb || navRelationFromAbroadCb ||
            (aRadioButtonIsChecked && (isNavUnitOrgFilledOut || isNavUnitMultipleFilledOut))) {

            var chosenNavUnitJSON = localStorage.getItem("skjemaveileder_chosennavunit_privatperson");

            if (chosenNavUnitJSON !== null) {
                var chosenNavUnitName = JSON.parse(chosenNavUnitJSON)["navUnit"];

                if (typeof chosenNavUnitName !== 'undefined' && chosenNavUnitName !== null && chosenNavUnitName.length > 1) {
                    var chosenNavUnitValue = JSON.parse(chosenNavUnitJSON)["navUnitID"];

                    if (navRelationInNorwayCb) {
                        restoreSelectedNavUnitViewElements($('#navdepartment1'), chosenNavUnitName);
                    }
                    else if (navRelationFromAbroadCb) {
                        restoreSelectedNavUnitViewElements($('#excaseNAVKontor'), chosenNavUnitName);
                    }
                    else if (isNavUnitOrgFilledOut) {
                        restoreSelectedNavUnitViewElements($('#navUnitOrg'), chosenNavUnitName);
                    }
                    else if (isNavUnitMultipleFilledOut) {
                        restoreSelectedNavUnitViewElements($('#navUnitMultiple'), chosenNavUnitName);
                    }

                    $("#chosennavunit").val(chosenNavUnitValue);
                }
            }
        }
        if (aRadioButtonIsChecked && typeof postalPlace !== 'undefined' && postalPlace.length > 0) {

            var postalDetails = localStorage.getItem("postalDetails");

            if (postalDetails !== null) {
                var postalCode = JSON.parse(postalDetails)["postalCode"];
                var navUnitID = JSON.parse(postalDetails)["navUnitID"];
                var cachedPostalPlace = JSON.parse(postalDetails)["postalPlace"];

                $("#notinnorwayzip").val(postalCode);
                $("#postalplacetxt").text(cachedPostalPlace);

                $("#chosennavunit").val(navUnitID);
            }
        }
        else {
            localStorage.removeItem("postalDetails");
        }
    }

    function initRadioButtonInteraction() {

        var extraTopLevelRadioChoice = $('input[type="radio"][id^="top-level-rb"]');
        if (extraTopLevelRadioChoice.length > 0) {
            firstLevelAddressOptions(extraTopLevelRadioChoice);
        }

        var ettersendelseTopLevelRadio = $('input[type="radio"][name="hasfrontpage"]');
        if (ettersendelseTopLevelRadio.length > 0) {
            firstLevelAddressOptions(ettersendelseTopLevelRadio);
        }

        var firstLevelRadioChoice = $('input[type="radio"][id^="first-level-rb"]');
        firstLevelAddressOptions(firstLevelRadioChoice);

        var secondLevelRadioChoice = $('input[type="radio"][id^="second-level-rb"]');
        subLevelAddressOptions(secondLevelRadioChoice);
    }

    function expandCheckedFields() {

        $("input[type='radio']:checked").click();

        if ($("#excase1").is(":checked")) {
            $("#nav-unit").show();
        }
        else if ($("#utlandContactEnhet").is(":checked")) {
            $("#nav-unit-2").show();
        }
    }

    function resetDeselectedInput(radioLevel) {
        var deSelectedInputContainer = $(".radio-choice-wrapper[data-checked='false']" + radioLevel);

        deSelectedInputContainer.find("input[type='text']").val("");
        deSelectedInputContainer.find('.js-cleanup-on-deselect').empty().val(''); // fjerner poststed fra <span> og hidden input

        deSelectedInputContainer.find(".radio-choice-wrapper[data-checked='true']").attr("data-checked", false);

        var uncheckedInput = deSelectedInputContainer.find("input:not([data-single-choice='true']):checked").attr("checked", false);
        if (uncheckedInput.length > 0 && uncheckedInput.hasClass("triggersDropdown")) {
            var id = "#" + uncheckedInput.attr("aria-controls");
            $(id).hide();
        }

        // Fjern indikering av valgt nav-kontor i markup/styling når input verdien for den nullstilles
        var navUnitNameElement = $("span.chosenNavUnitName").filter(function () {
            return $(this).text().length > 0;
        });
        var isNavOfficeChosen = navUnitNameElement.text().length > 1;

        if (isNotUndefined(navUnitNameElement) && isNavOfficeChosen) {
            restoreNavUnitTextInput(navUnitNameElement, false);
        }
    }

    function resetChosenNavUnit(radioChoiceContainer) {
        $("#chosennavunit").val("");

        radioChoiceContainer.find("li").remove();
        radioChoiceContainer.hide();
    }

    function checkForNavUnitUpdateRequirement(activeRadioButton) {
        if (activeRadioButton.attr("value") === "alt6") {
             $("#chosennavunit").val("");
        }
        else if (activeRadioButton.attr("value") === "alt7") {
            $("#chosennavunit").val($("#navofficealt7").val());
        }
    }

    function handleRadioInputValues(activeRadioButton) {
        $("input[name='situation']").attr("value", "");

        if (activeRadioButton.attr("name") === "situation") {
            activeRadioButton.attr("value", activeRadioButton.attr("data-value"));
        }
        else if (activeRadioButton.attr("data-placeholder-radio") === "true") {
            var situationInput = $("#" + activeRadioButton.attr("data-placeholder-for"));
            situationInput.attr("value", situationInput.attr("data-value"));
        }
    }

    function firstLevelAddressOptions(radioButtonElements) {
        radioButtonElements.on("click", function () {

            var activeRadioButton = $(this);
            var radioChoiceContainer = activeRadioButton.parent();

            if (radioChoiceContainer.attr("data-checked") !== 'true') {
                radioChoiceContainer.attr("data-checked", true);

                $("input[name='situation'][type='hidden']").attr("data-checked", false);
                $("#" + (activeRadioButton.attr("data-placeholder-for"))).attr("data-checked", true);

                radioChoiceContainer.find(".address-dropdown").first().slideToggle(slideSpeed);

                if (radioChoiceContainer.siblings("[data-checked='true']").length > 0) {
                    $(radioChoiceContainer.siblings("[data-checked='true']"))
                        .attr("data-checked", false)
                        .find(".address-dropdown:not([data-stay-expanded='true'])").slideUp(slideSpeed)
                        .find('.input-container[data-is-showing="true"]').hide().attr("data-is-showing", false)
                        .parent().find("input[name='situation']").attr("checked", false);
                }

                resetDeselectedInput("[data-radio-level='1']");
                resetChosenNavUnit($(".nav-office-selection"));
                resetFormerNavUnitRelation();

                handleRadioInputValues(activeRadioButton);

                $(".error-panel.showing").removeClass("showing").hide().find("li").hide();
            }
        });
    }

    function resetFormerNavUnitRelation() {
        $("span.chosenNavUnitName").text("");
    }

    function subLevelAddressOptions(radioButtonElements) {
        radioButtonElements.on("click", function (e) {
            var inputContainer = $(this).parent().find('.input-container');

            if (inputContainer.attr("data-is-showing") === "true") {
                e.preventDefault();
            }
            else {
                $(".input-container[data-is-showing='true']").slideToggle(slideSpeed).attr("data-is-showing", false).parent().attr("data-checked", false);

                if (inputContainer.length > 0) {
                    inputContainer.slideToggle(slideSpeed).attr("data-is-showing", true).parent().attr("data-checked", true);
                }
                else {
                    $(this).parent().attr("data-checked", true);
                }

                resetDeselectedInput("[data-radio-level='2']");
                resetChosenNavUnit($(".nav-office-selection"));
                resetFormerNavUnitRelation();

                checkForNavUnitUpdateRequirement($(this));
                handleRadioInputValues($(this));

                $(".error-panel.showing").removeClass("showing").hide().find("li").hide();
            }
        });
    }

    function initZipCodeInputFields() {
        $("#innorwayzip").bind('keyup', function () {
            var userZipExpression = /^[0-9]{4}$/;
            var zipCode = $(this).val();
            if (zipCode.length == 4 && zipCode.match(userZipExpression)) {
                $(this).attr("data-active-postnr-input", true);
                checkPostalNumber();
                resetChosenNavUnit($("#navEnhetSelection"));
            }
        });
        $("#notinnorwayzip").bind('keyup', function () {
            var input = $(this),
                userZipExpression = /^[0-9]{4}$/,
                zipCode = $(this).val();

            if (zipCode.length == 4 && zipCode.match(userZipExpression)) {
                $(this).attr("data-active-postnr-input", true);
                checkPostalNumber(input);
                resetChosenNavUnit($("#navEnhetSelection2"));
            }
        });
    }

    function initAutocomplete() {
        changenavdepartment1();

        var chosenNavUnit = $("#chosennavunit");

        addAutocomplete($('#navdepartment1'), chosenNavUnit, $("#navdepartment1Selected"), $("#navdepartment1SelectedChangeButton"));
        addAutocomplete($('#excaseNAVKontor'), chosenNavUnit, $("#excaseNAVKontorSelected"), $("#excaseNAVKontorSelectedChangeButton"));

        addAutocomplete($('#navUnitMultiple'), chosenNavUnit, $("#navUnitMultipleSelected"), $("#navUnitMultipleSelectedChangeButton"));
        addAutocomplete($('#navUnitOrg'), chosenNavUnit, $("#navUnitOrgSelected"), $("#navUnitOrgSelectedChangeButton"));
    }

    function toggleInputRequirement(selectedContainer) {
        $.when(selectedContainer.find("input[data-required-by-controller]")).then(function() {
            var controllerInputId = "#" + ($(this).attr("data-required-by-controller"));
            if ($(controllerInputId).is(":checked")) {
                $(this).attr("data-required", true);
            }
            else {
                $(this).attr("data-required", false);
            }
        });
    }

    function getValidCheckedInput() {
        return $("input[type='radio']:checked").filter(function () {
            var isSituationPlaceholder = (isNotUndefined($(this).attr("data-placeholder-radio"))
                && ($(this).attr("data-placeholder-radio") === "true"));

            var isNewFrontPageRadio = ($(this).attr("name") === "hasfrontpage" && $(this).attr("value") === "false");

            var isValidCheckedRadio = ($(this).attr("name") === 'situation' || isSituationPlaceholder || isNewFrontPageRadio);

            if (isValidCheckedRadio) {
                return true;
            }
            return false;
        }).last();
    }

    function handleFormSubmit() {
        $("#address-options-form").submit(function (event) {

		
            var frontPageChoice = $("input[name='hasfrontpage']:checked");
            if (frontPageChoice.length > 0) {
                if (frontPageChoice.attr("value") === "true") {
                    return true;
                }
                else {
				
                    var nestedRadioGroupCount = parseInt(frontPageChoice.parent().attr("data-radiogroup-count"));
                    var isOnlyOneChecked = $("input[type='radio']:checked").length === 1;

                    if (nestedRadioGroupCount > 1 && isOnlyOneChecked && frontPageChoice.attr("value") === "false") {
					$("#frontpage-errortext").removeClass("hide").addClass("showing").show();		
					$("#frontpage-errorpanel").removeClass("hide").addClass("showing").show();	
                        event.preventDefault();
                        return false;
                    }
                }
            }
		
            var isFormValid = false;
			
            var validCheckedInput = getValidCheckedInput();

            var inputContainer = validCheckedInput.parent();
            var checkedInputValue = validCheckedInput.attr("value");
		
            if (validCheckedInput.attr("name") === 'situation' && (checkedInputValue === 'alt6' || checkedInputValue === 'alt7')) {
                isFormValid = true;
            }
            else if (validCheckedInput.length > 0) {
                var subLevels = parseInt(inputContainer.attr("data-radiogroup-count"));
                if (subLevels === 1) {
                    var errorPanel = $("#" + inputContainer.attr("data-error-panel"));

                    toggleInputRequirement(inputContainer);

                    isFormValid = validateInputFields(inputContainer.find("input[data-required='true']"), errorPanel);
                }
                else if (subLevels > 1) {
                    var requiredInputContainer = inputContainer.find(".address-dropdown .radio-choice-wrapper[data-checked='true']");
                    var errorPanel = $("#" + requiredInputContainer.attr("data-error-panel"));

                    toggleInputRequirement(requiredInputContainer);

                    isFormValid = validateInputFields(requiredInputContainer.find("input[data-required='true']"), errorPanel);
                }
            }

            isFormValid = reValidateFormBasedOnUtlandRequirements(isFormValid);

            if (isFormValid) {
                rememberChosenNavUnit();
				
                return true;
            }
            else {

				var employeraddressChoiceChosen = $("input[type='radio'][name='top-level-radio-placeholder']").is(":checked");
				var addressChoiceChosen = $("input[type='radio'][name='radio-placeholder']").is(":checked");
			    var utlandSituationChosen = $("input[type='radio'][name='situation']").is(":checked");
				var isUtlandChosen = $("input[type='radio'][value='alt3']").is(":checked")
				var contactWithNav = $("input[type='radio'][name='utland']").is(":checked");
				var abroadIsChosen = $("input[type='radio'][value='abroad']").is(":checked");
				var onepersonIsChosen = $("input[type='radio'][id='top-level-rb-1']").is(":checked");
			  	var oneAbroadpersonIsChosen = $("input[type='radio'][id='top-level-rb-2']").is(":checked");
				var employerAbroadpersonIsChosen = $("input[type='radio'][id='first-level-rb-2']").is(":checked");
				var tiltakIsChosen = $("input[type='radio'][id='first-level-rb-1']").is(":checked");
		
				if ((!addressChoiceChosen) && (employeraddressChoiceChosen) && (onepersonIsChosen))
				{	    	
				
					$("#toplevel-errortext").removeClass("hide").addClass("showing").show();		
					$("#toplevel-errorpanel").removeClass("hide").addClass("showing").show();	
																
				}		
				

				if ((!addressChoiceChosen) && (!employeraddressChoiceChosen) && (!tiltakIsChosen))
				{	    	
					$("#main-errorpanel").removeClass("hide").addClass("showing").show();
					$("#main-errortext").removeClass("hide").addClass("showing").show();									
				}				
				
				if  ((!utlandSituationChosen) && (abroadIsChosen))
				{	    
					$("#utland-errortext").removeClass("hide").addClass("showing").show();		
					$("#utland-errorpanel").removeClass("hide").addClass("showing").show();	
										
				}
				if  ((isUtlandChosen) && (!contactWithNav))
				{
					$("#alt3-errorpanel").removeClass("hide").addClass("showing").show();		
					$("#contactwithnav-errortext").removeClass("hide").addClass("showing").show();			
				}
				if  ((employerAbroadpersonIsChosen) && (!utlandSituationChosen) && (!contactWithNav))
				{
					$("#utland-errortext").removeClass("hide").addClass("showing").show();		
					$("#utland-errorpanel").removeClass("hide").addClass("showing").show();				
				}
				if  ((employerAbroadpersonIsChosen) && (utlandSituationChosen) && (contactWithNav))
				{
					$("#contactwithnav-errorpanel").removeClass("showing").addClass("hide").hide();		
					$("#contactwithnav-errortext").removeClass("showing").addClass("hide").hide();				
				}
                event.preventDefault();
            }
        });
    }

    function reValidateFormBasedOnUtlandRequirements(isValid) {
        var isFormValid = isValid;
        var isUtlandChosen = $("input[type='radio'][value='alt3']").is(":checked"), utlandRadioInput = $("input[name='utland']");
        if (isUtlandChosen && utlandRadioInput.length > 0 && !utlandRadioInput.is(":checked")) {
            if (isFormValid) {
                isFormValid = false;
            }
        }
        return isFormValid;
    }

    function rememberChosenNavUnit() {
        var chosenNavDepartment = $("span.chosenNavUnitName").filter(function () {
            return $(this).text().length > 0;
        }).text();

        var postalCode = $("#notinnorwayzip").val();

        if (chosenNavDepartment.length > 1) {
            localStorage.setItem("skjemaveileder_chosennavunit_privatperson",
                JSON.stringify({"navUnit": chosenNavDepartment, "navUnitID": $("#chosennavunit").val()}));
        }
        else {
            localStorage.removeItem("skjemaveileder_chosennavunit_privatperson");
        }

        if (isNotUndefined(postalCode) && postalCode.length === 4) {
            localStorage.setItem("postalDetails",
                JSON.stringify({"postalCode": postalCode, "navUnitID": $("#chosennavunit").val(), "postalPlace": $("#postalplacetxt").text()}));
        }
    }

    function validateInputFields(inputElements, errorPanel) {
        var errorList = errorPanel.find("ul");
        errorList.find("li").hide();

        var userZipExpression = /^[0-9]{4}$/;
        var isInputValid = true;

        $.each(inputElements, function (index, input) {

            var inputInfoAttribute = input.getAttribute("data-info-type");
            var errorTextItem = null;

            if (inputInfoAttribute === "postnr") {
                var isZipCodeValid = input.value.match(userZipExpression);
                errorTextItem = errorList.find("#postnr-errortext");

                if (!isZipCodeValid) {
                    isInputValid = false;
                    errorTextItem.show();
                }
                else {
                    errorTextItem.hide();
                }
            }
            else if (inputInfoAttribute === "fnr") {
                errorTextItem = errorList.find("#fnr-errortext");
                if (!validateFnr(input.value)) {
                    isInputValid = false;
                    errorTextItem.show();
                }
                else {
                    errorTextItem.hide();
                }
            }
            else if (inputInfoAttribute === "adresse") {
                errorTextItem = errorList.find("#address-errortext");
                if (!isTextInputValid(input.value.trim(), errorTextItem)) {
                    isInputValid = false;
                }
            }
            else if (inputInfoAttribute === "nav-office") {
                errorTextItem = errorList.find("#nav-office-errortext");

                if (input.value.trim().length === 0 || $("#chosennavunit").val().trim().length === 0) {
                    isInputValid = false;
                    errorTextItem.show();
                }
                else {
                    errorTextItem.hide();
                }
            }
        });

        if (!isInputValid) {
            errorPanel.removeClass("hide").addClass("showing").show();
        }
        else {
            errorPanel.removeClass("showing").addClass("hide");
        }
        return isInputValid;
    }

    function isTextInputValid(text, inputElement) {
        if (!(text.length > 0 ) || hasIllegalChars(text)) {
            inputElement.show();
            return false;
        }
        inputElement.hide();
        return true;
    }

    function hasIllegalChars(input) {
        //define illegal characters here:
        return input.match(/[\[\]=\/\?@\:\;\|�!#��\$%&{}\+\^�~`�*><]/g);
    }

    function validateFnr(fodselsNummer) {
        var numArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        var checksum = 0;
        var rest = 0;
        var WEIGHTS1 = [3, 7, 6, 1, 8, 9, 4, 5, 2];
        var WEIGHTS2 = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

        var BIRTH_NUMBER_LENGTH = 11;
        var CHECKSUM_CONSTANT = 11;
        var CHECKSUM_MODULO = 11;

        if ((fodselsNummer == "undefined") || (fodselsNummer.length != BIRTH_NUMBER_LENGTH) || ("00000000000" == fodselsNummer)) {
            return false;
        }

        for (i = 0; i < BIRTH_NUMBER_LENGTH; i++) {
            var c = fodselsNummer.charAt(i);
            if ('0' > c || '9' < c) {
                return false;
            }
            numArray[i] = c;
        }

        for (i = 0; i < BIRTH_NUMBER_LENGTH - 2; i++) {
            checksum += numArray[i] * WEIGHTS1[i];
        }

        rest = checksum % CHECKSUM_MODULO;

        if (rest == 0) {
            rest = CHECKSUM_CONSTANT;
        }

        checksum = parseInt(numArray[BIRTH_NUMBER_LENGTH - 2]) + rest - CHECKSUM_CONSTANT;

        if (checksum != 0) {
            return false;
        }

        checksum = 0;
        for (i = 0; i < BIRTH_NUMBER_LENGTH - 1; i++) {
            checksum += numArray[i] * WEIGHTS2[i];
        }

        rest = checksum % CHECKSUM_MODULO;

        if (rest == 0 || rest == 1) {
            rest = CHECKSUM_CONSTANT;
        }

        checksum = parseInt(numArray[BIRTH_NUMBER_LENGTH - 1]) + rest - CHECKSUM_CONSTANT;

        if (checksum == 0) {
            validfnr = true;
        }
        return checksum == 0;
    }
});

function restoreSelectedNavUnitViewElements(navOfficeInput, navUnitName) {
    navOfficeInput.val(navUnitName).hide();
    navOfficeInput.siblings("span.chosenNavUnitName").text(navUnitName).show();
    navOfficeInput.siblings("input[type='button']").show();
}
function restoreNavUnitTextInput(navOfficeNameElement, showUnitName) {
    navOfficeNameElement.siblings("input[type='button']").hide();
    var navUnitInput = navOfficeNameElement.siblings("input[type='text']").val("").show();

    if (showUnitName) {
        navUnitInput.val(navOfficeNameElement.text());
    }

    navOfficeNameElement.hide();
}

function checkPostalNumberCallback(json) {
    var mottakerEnheter = json;

    var postnrInput = $("input[data-active-postnr-input='true']");
    postnrInput.removeAttr("data-active-postnr-input");
    var enhetsvalgListe = $("#" + postnrInput.attr("data-office-list-id"));

    if ($('input[name="situation"]:checked').val() == 'alt2') {
        $("#notinnorwaypostalplace").val(mottakerEnheter.postalPlace);
        $('#postalplacetxt').text(mottakerEnheter.postalPlace);
    }

    if (mottakerEnheter !== null && mottakerEnheter.offices.length > 0) {
        $("#chosennavunit").val(mottakerEnheter.offices[0].id);

        if (mottakerEnheter.offices.length > 1) {

            enhetsvalgListe.find("input[type='radio']").attr("checked", false).parent().remove();

            for (n in mottakerEnheter.offices) {
                if (mottakerEnheter.offices[n].hasOwnProperty('name')) { // jslint
                    var office = mottakerEnheter.offices[n];

                    enhetsvalgListe.append("<li>" +
                        "<input type='radio' name='enhet' id='" + office.id + "'/>" +
                        "<label for='" + office.id + "'>" + office.name + "</label>" +
                        "</li>");
                }
            }
            enhetsvalgListe.parent().show();

            var radioItems = enhetsvalgListe.find("input[type='radio']");

            if ($('input[name="situation"][data-checked="true"]').val() === 'alt1'
                || $('input[name="situation"]:checked').val() === 'alt2') {

                radioItems.first().attr("checked", true);
            }

            radioItems.on("click", function () {
                $("#chosennavunit").val($(this).attr("id"));
            });
        }
    }
}

function checkPostalNumber(element) {

    var postNrCheckUrl = $("#address-options-form").attr("data-postnrcheck-url"),
        params = requestParametersForPostalNumberCheck($("#address-options-form").serializeArray()),
        postalPlaceTxt = element ? element.next('#postalplacetxt') : null;

    if (postalPlaceTxt) { // <span> for poststed, som står rett etter postnummer-input, får spinner.
        postalPlaceTxt.empty().addClass('input-spinner');
    }

    $.ajax({
        url: postNrCheckUrl,
        dataType: 'script',
        data: params,
        type: 'GET'
    })

        .always(function () { // kjører alltid, uavhengig av om requesten returnererer noe eller ei (success || fail)
            if (postalPlaceTxt) {
                postalPlaceTxt.removeClass('input-spinner');
            }

        });
}

function requestParametersForPostalNumberCheck(paramArray, alt) {
    var postnrString = (alt === 2) ? 'notinnorwayzip' : 'innorwayzip';

    var result = '';

    $.each(paramArray, function (index, param) {
        if (isValidParameter(param.name, postnrString) && param.value !== "") {
            if (index !== 0) {
                result += '&';
            }

            result += (param.name + "=" + param.value);
        }
    });

    return result;
}

function isValidParameter(paramName, postnrString) {
    if (paramName === "situation" || paramName === "type" || paramName === "key" || paramName === "situation" || paramName.indexOf(postnrString) > -1) {
        return true;
    }
    return false;
}

function addAutocomplete(inputElement, valueElement, labelElement, changeButton) {
    inputElement.autocomplete({
        source: function (request, response) {
            request.term = request.term.replace(/æ/g, "%C3%A6");
            request.term = request.term.replace(/ø/g, "%C3%B8");
            request.term = request.term.replace(/å/g, "%C3%A5");
            request.term = request.term.replace(/Æ/g, "%C3%86");
            request.term = request.term.replace(/Ø/g, "%C3%98");
            request.term = request.term.replace(/Å/g, "%C3%85");

            $.get(autocompleteUrl + '?term=' + request.term, function (data) {
                if (data) {
                    response(JSON.parse(data));
                }
            });
        },
        minLength: 2,
        delay: 400,
        select: function (event, ui) {
            valueElement.val(ui.item.value);
            labelElement.text(ui.item.label);
            labelElement.show();
            changeButton.show();
            inputElement.hide();
        },
        focus: function (event, ui) {
            return false;
        }
    });
}

function changenavdepartment1() {
    var navDepartmentSelected = $("#navdepartment1Selected");
    restoreNavUnitTextInput(navDepartmentSelected, true);
}
function changeexcaseNAVKontor() {
    var excaseNAVKontorSelected = $("#excaseNAVKontorSelected");
    restoreNavUnitTextInput(excaseNAVKontorSelected, true);
}

function changeSelectedNavUnitOrg() {
    var navUnitOrgSelected = $("#navUnitOrgSelected");
    restoreNavUnitTextInput(navUnitOrgSelected, true);
}
function changeSelectedNavUnitMultiple() {
    var navUnitMultipleSelected = $("#navUnitMultipleSelected");
    restoreNavUnitTextInput(navUnitMultipleSelected, true);
}

function goBack() {
    history.go(-1); // TODO: under
    $("#NAVvedleggsveilederContainer").show();
    $("#NAVvedleggsveilederDownloadContainer").hide();
    $("#navdepartment1Selected").show();
    $("#navUnitOrgSelected").show();
    $("#navUnitMultipleSelected").show();
    $("#excaseNAVKontorSelected").show();
}

function isNotUndefined(el) {
    if (typeof el !== 'undefined') {
        return true;
    }
    return false;
}

function onBlur(el) {
    if (el.value === '') {
        el.value = el.defaultValue;
    }
}

function onFocus(el) {
    if (el.value == el.defaultValue) {
        el.value = '';
    }
}