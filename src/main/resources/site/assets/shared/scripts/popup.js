var newWin = null;
function popUp(strURL, strType, strHeight, strWidth) {
	if (newWin != null && !newWin.closed)
		newWin.close();
		var strOptions="";
	if (strType=="popup")
		strOptions="location=0,menubar=1,resizable=1,scrollbars=1,status=0,titlebar=0,toolbar=0,height="+strHeight+",width="+strWidth;
	newWin = window.open(strURL, 'newWin', strOptions);
	newWin.focus();
}

function changeLocation(elmId) {
	var location = document.getElementById(elmId).value;
	if (location.indexOf('|new') != -1) {
		popUp(location.substring(0, location.indexOf('|new')), 'full', 600, 800);
	} else if (location != '') {
		document.location = location;
	}
}