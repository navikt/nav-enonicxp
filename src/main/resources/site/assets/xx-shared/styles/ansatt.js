function changeShortcut(){
	if(document.getElementById('shortcut').value){
	window.location = "http://anouwc01.aetat.no:8311/ansatt/page?id=41&amp;localmenu=" + document.getElementById("shortcut").value;
	}
}