var currentContrast = ''+getCookie( 'CONTRAST');

function switchContrast(){

	if( currentContrast == 'contrast' ){
		currentContrast = 'main';
	}
	else {
		currentContrast = 'contrast';
	}

	gifUrl = 'pGif.jsp?cmd=setCookie&cName=CONTRAST&cValue='+currentContrast+'&rnd='+Math.random();
	document.getElementById( 'contrastStylesheet' ).href ='resources/styles/'+currentContrast+'.css';
	document.getElementById('cookieGif').src = gifUrl;
}



var currentFontsize = ''+getCookie( 'FONTSIZE');

function switchFont(){
	if( currentFontsize == 'largest' ){
		currentFontsize = 'normal';
	}
	else if( currentFontsize == 'large' ){
		currentFontsize = 'largest';
	}
	else {
		currentFontsize = 'large';
	}


	gifUrl = 'pGif.jsp?cmd=setCookie&cName=FONTSIZE&cValue='+currentFontsize+'&rnd='+Math.random();
	document.getElementById( 'fontsizeStylesheet' ).href ='resources/styles/font_'+currentFontsize+'.css';
	document.getElementById('cookieGif').src = gifUrl;
}



function setFontsize(size){
	currentFontsize = size;
	gifUrl = 'pGif.jsp?cmd=setCookie&cName=FONTSIZE&cValue='+currentFontsize+'&rnd='+Math.random();
	document.getElementById( 'fontsizeStylesheet' ).href ='resources/styles/font_'+currentFontsize+'.css';
	document.getElementById('cookieGif').src = gifUrl;
}




function andreasDebug(){
	alert( document.getElementById( 'andreasDebugDiv').innerHtml );
	var ting = document.getElementById( 'fontsizeStylesheet' ).href+ '<br/>';
	ting = ting + document.getElementById( 'contrastStylesheet' ).href+ '<br/>';
	document.getElementById( 'andreasDebugDiv').innerHtml = ting;
}


