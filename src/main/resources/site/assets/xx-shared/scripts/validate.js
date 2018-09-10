var validateInput = new Array;

function validate(form){
	var status = true;
	for (var i=0; i < form.length; i++) {
		if (validateInput[form.elements[i].name]) {
			if (!validateInput[form.elements[i].name].pattern.test(Trim(form.elements[i].value))) {
				document.getElementById("msg_" + form.elements[i].name).innerHTML = validateInput[form.elements[i].name].error;
				document.getElementById("row_" + form.elements[i].name).style.display = "inline";
				form.elements[i].className = form.elements[i].className + " error";
				status = false;
			} else {
				var cls = form.elements[i].className;
    			if(cls.indexOf('error') > 0) {
    				cls = cls.substring(0, cls.indexOf(' error'));
    			}
    			form.elements[i].className = cls;
				document.getElementById("row_" + form.elements[i].name).style.display = "none";
			}
		}
	}
	return status;
}

function Trim(strValue){
	return LTrim(RTrim(strValue));
}

function LTrim(strValue){
	var LTRIMrgExp = /^\s*/;
	return strValue.replace(LTRIMrgExp, '');
}

function RTrim(strValue){
	var RTRIMrgExp = /\s*$/;
	return strValue.replace(RTRIMrgExp, '');
}

function validateFnr(fodselsNummer) {
    var numArray =[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var checksum = 0;
    var rest = 0;
    var WEIGHTS1 =[3, 7, 6, 1, 8, 9, 4, 5, 2];
    var WEIGHTS2 =[5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    
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

    if (checksum == 0 ) 
    {
        validfnr = true;

    }
    return checksum == 0;
}