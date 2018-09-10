function displayErrorMessageInContext(element, errorMessage){
	var errorMessageHTML;
	if(element.width() > 80) {
		errorMessageHTML = '<div class="NAVEDIErrorBox" style="width:'+ element.width() +'px">' + errorMessage + '</div>';
	} else {
		errorMessageHTML = '<div class="NAVEDIErrorBox">' + errorMessage + '</div>';
	}
	element.parent().prepend(errorMessageHTML);		
}

function clearMessages() {
	clearErrors();	
	return true;
}

function clearErrors() { 
	var errorMsg = ""; 
	$("#errorBox").html(errorMsg);
	$("#errorBox").hide();	
	$(".NAVEDIErrorBox").remove();
	
	return true;
}

function displayHelpText(text, topElement){	
	if ($("#EDIHelpText_" + text).length > 0 ){		
		$("#NAVhelpTxt").html($("#EDIHelpText_" + text).html());		
		$("#NAVhelp").show();
		$("#NAVhelp").css("top", $("#"+topElement).position().top+"px");
		var offsetLeft = $("#"+topElement).position().left + 440;
		$("#NAVhelp").css("left", offsetLeft+"px");		
	}
	return true;
}

function hideHelp() {
	$("#NAVhelp").hide();
	return true;
}