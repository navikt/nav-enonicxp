function createNavigator(contentType, county, navigator)
{	
	var ret = "";

	if(county){
		var radioLength = county.length;		
		
		ret += "%20%2b%28"; // write start of navigator " +("
		if(radioLength == undefined){
			if(county.checked){
				ret += county.value;
				county.value = "";				
			}
		}
		else{
			for(var i = 0; i < radioLength; i++) {
				if(county[i].checked) {
					ret += "%20" + county[i].value;
				}
			}
		}
		ret += "%29"; // write end of navigator ")"
	}	
	
	if(contentType){		
		var radioLength = contentType.length;
		
		ret += "%20%2b%28" // write start of navigator " +("
		if(radioLength == undefined){
			if(contentType.checked)
				ret += contentType.value;
		}
		else{
			for(var i = 0; i < radioLength; i++) {
				if(contentType[i].checked) {
					ret += "%20" + contentType[i].value;
				}
			}
		}
		ret += "%29"; // write end of navigator ")"
	}
	navigator.value = ret;
}