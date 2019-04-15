// Inntektskalkulator
// Redigert av Frode Dahl, Aetat forvaltning Oslo og Akershus.
var inntekt ;
var bruttoVl ;
var tjenestetid;
var trekk ;
var utbetaltVl ;
var grense;
// feilmelding ved ugyldig kronebeløp ( bokstaver eller mellemrom kan skape problemer ) 
msg1="Ugyldig verdi for kronebeløp!  Skriv en verdi mellom 0 og 100 000,00.\nEks: 18457,75";
// feilmelding ved  ugyldig tjenestetid
msg2="Oppgi minimum 2, maksimalt 30 års tjenestetid.";
// feilmelding ved tomme felter i skjemaet
var msgTommeFelt = "Du må fylle ut alle felt i øverste del av skjemaet før du beregner.";

// returnerer beloep paa formen 0000.00000, hvis beloep er et tall >= 0,
// ellers returneres -1 (stripper evt. bokstaver i slutten)
function sjekkVerdiI(beloep){
beloep=beloep.replace(",",".")
beloep=beloep.replace(" ","")
 if (parseFloat(beloep) >= 0 && beloep >= 0 ){
 
  beloep=parseFloat(beloep);
 
  return beloep ;
 
 }else {
  return -1;
 
 }
}
// dersom noen "inn"-felter er tomme returneres true, ellers false
function erFelterTommeI(){
var felt = document.ventelonn.elements;
 for (var i = 0 ; i < felt.length ; i++ ){
 
  if (! (felt[i].name.substring(0,2) == "ut") && felt[i].value == ""){
   return true;
  }
  
 }
return false;
}
//  omformaterer en gitt verdi til valutaformat, med ',' som desimalskille tegn. Returnerer en streng
function valutaFormatI(verdi){
 
 verdi = parseInt((verdi + 0.005)*100, 10);
 verdi = verdi + "";
 if ( verdi.length ==1 ){
  
  verdi = "0,0" + verdi;
 
 }else if ( verdi.length == 2 ){
 
  verdi = "0," + verdi;
  
 }else{
 
  verdi = verdi.substring( 0, verdi.length - 2 ) + "," + verdi.substring( verdi.length - 2, verdi.length);
  
 }
  
 return verdi;
}
function regnUtI(){
grense = 0.825*bruttoVl*30/tjenestetid/0.66;
trekk = inntekt + bruttoVl - grense;
 if ( trekk < 0 ){
  trekk = 0;
  utbetaltVl = bruttoVl;
 }else if ( trekk > bruttoVl ){
  trekk = bruttoVl;
  utbetaltVl = 0;
 }else{
  utbetaltVl = bruttoVl - trekk;
 }
 
 document.ventelonn.utTrekk.value = valutaFormat(trekk);
 document.ventelonn.utUtbetaltVl.value = valutaFormat(utbetaltVl);
}
function validateFormI(){
 if (erFelterTommeI()){
 
  alert(msgTommeFelt);
 
 }else{
 
  bruttoVl = sjekkVerdiI(document.ventelonn.txtBruttoVl.value);
  inntekt = sjekkVerdiI(document.ventelonn.txtInntekt.value);
  tjenestetid =  parseInt(document.ventelonn.txtTjenestetid.value, 10);
 
  regnUtI();
  
 } 
 
}





// Ventelønnskalkulator
// Redigert av Frode Dahl, Aetat forvaltning Oslo og Akershus.
// feilmelding ved ugyldigt beloep i tidl. lønn
var msgFeilLoenn = "Ugyldigt beløp: det er brutto månedelig beløp som skal fylles ut.\nEks: 18500,75"; 
// feilmelding ved ugyldig stillingsprosent
var msgFeilProsent = "Ugyldig stillingsprosent! Skriv en verdi mellom 0 og 100,00."; 
// feilmelding ved tomme felter i skjemaet
var msgTommeFelt = "Du må fylle ut alle felt i øverste del av skjemaet før du beregner.";
// feilmelding ved feil dato format
var msgFeilDato = "Ugyldig dato! Husk punktum og 4 siffer i årstallet.";
// feilmelding ved feil i tjenetstetids dage ( >= 0 og <= 31 )
var msgFeilDag = "Ugyldig antall dager i tjenestetid!\nSkriv en verdi mellom 0 og 31 (ikke blank).";
// feilmelding ved feil i tjenetstetids måneder ( >= 0 og <= 12 )
var msgFeilMnd = "Ugyldig antall måneder i tjenestetid!\nSkriv en verdi mellom 0 og 12 (ikke blank).";
// feilmelding ved feil i tjenetstetids år ( >= 2 og < 51 )
var msgFeilAar = "Ugyldig antall år i tjenestetid!\nSkriv en verdi mellom 2 og 50 (ikke blank).";
var fnr;
var loenn;
var stillingsProsent;
var aldersGrense;
var tjenesteDag; // dagers faktisk tjenestetid i staten
var tjenesteMnd; // maaneder
var tjenesteAar; // aar
var tjenesteTid; // tjenestetid som inngaar i tjenestetidsbroek
var startDatoVl; // startdato for venteloenn
var alder = new Array(3); // alder ved start Vl
var tidTilAldersGrense = new Array(3); // tid fra start Vl til aldersgrense
var bruttoVl; // brutto venteloenn
var maksAlder = new Array(0, 0, 0);
var maksTjenesteTid = new Array(3);
var maksPensjon = new Array(3);
var stopDato;
// returnerer dagen, som int, fra en dato paa formen 00.00.0000 eller 0.0.0000
function faaDag( dato ){
var dag
 dag = dato.substring( 0, dato.indexOf("."));
 
 if ( dag.length == 2 && dag.indexOf("0") == 0){
 
  dag = dag.substring(1,2);
 
 }
 
 dag = parseInt(dag, 10);
return dag;
}
// returnerer maaneden, som int, fra en dato paa formen 00.00.0000 eller 0.0.0000
function faaMnd( dato ){
var mnd
 mnd = dato.substring( dato.indexOf(".") + 1, 6);
 mnd = mnd.substring( 0, mnd.indexOf("."));
 
 if ( mnd.length == 2 && mnd.indexOf("0") == 0){
 
  mnd = mnd.substring(1,2);
 
 }
 
 mnd = parseInt(mnd, 10);
return mnd;
}
// returnerer aaret, som int, fra en dato paa formen 00.00.0000 eller 0.0.0000
function faaAar( dato ){
var Aar
 Aar = dato.substring( dato.length - 4, dato.length );
 Aar = parseInt(Aar, 10);
return Aar;
}
// beregner antall dage,maaneder og aar, mellom 2 datoer paa formen 00.00.0000
// eller 0.0.0000.
// returnerer enn array: ( aar, mnd, dag )
function datoDiff( fraDato, tilDato){
var fraDag, tilDag;
var fraMnd, tilMnd;
var fraAar, tilAar;
var difDag, difMnd, difAar;
var difDato = new Array(3);
 fraDag = faaDag(fraDato); // leser tall inntil første punktum
 tilDag = faaDag(tilDato);
 
 fraMnd = faaMnd(fraDato);
 tilMnd = faaMnd(tilDato);
 
 fraAar = faaAar(fraDato);
 tilAar = faaAar(tilDato);
 
 if ( tilDag < fraDag ){
 
  tilDag += 30;
  fraMnd++;
  
 }
 
 if ( (tilDag - fraDag) == 30 ){
 
  tilDag = fraDag;
  tilMnd++;
 
 }
 
 if ( tilMnd < fraMnd ){
 
  tilMnd += 12;
  fraAar++;
 
 }
 
 difDag = tilDag - fraDag;
 difMnd = tilMnd - fraMnd;
 difAar = tilAar - fraAar;
 
 if ( difDag > 29 ){
 
  difDag -= 30;
  difMnd++;
 
 }
 
 if ( difMnd > 11 ){
 
  difMnd -= 12;
  difAar++;
 
 }
 
 difDato[2] = difDag;
 difDato[1] = difMnd;
 difDato[0] = difAar; 
return difDato;
}
// omformaterer et gitt tall til valutaformat, med ',' som desimalskille tegn. 
// Returnerer en streng 
function valutaFormat(verdi){
 
 verdi = parseInt((verdi + 0.005)*100, 10);
 verdi = verdi + "";
 if ( verdi.length ==1 ){
  
  verdi = "0,0" + verdi;
 
 }else if ( verdi.length == 2 ){
 
  verdi = "0," + verdi;
  
 }else{
 
  verdi = verdi.substring( 0, verdi.length - 2 ) + "," + verdi.substring( verdi.length - 2, verdi.length);
  
 }
  
 return verdi;
}
// omformaterer til datoformat. Returnerer en streng paa formen 01.05.1945
function datoFormat( dato ){
var datoStreng;
var dag = faaDag(dato);
var mnd = faaMnd(dato);
var aar = faaAar(dato);
 datoStreng = mnd + "." + aar;
 
 if ( mnd < 10 ){
 
  datoStreng = "0" + datoStreng;
  
 }
 
 datoStreng = dag + "." + datoStreng;
 
 if ( dag < 10 ){
 
  datoStreng = "0" + datoStreng;
 
 }
return datoStreng;
}
// returnerer beloep paa formen 0000.00000, hvis beloep er et tall >= 0,
// ellers returneres -1 (stripper evt. bokstaver i slutten)
function sjekkVerdi(beloep){
beloep=beloep.replace(",",".")
beloep=beloep.replace(" ","")
 if (parseFloat(beloep) >= 0 && beloep >= 0){
 
  beloep=parseFloat(beloep);
 
  return beloep ;
 
 }else {
  return -1;
 
 }
}
// hvis aaret er skudaar returneres true ellers false
function erSkudAar(aar){
 return ( aar % 4 == 0 && ( aar % 100 != 0 || aar % 400 == 0 ));
}
//Sjekker om dato er på formen 00.00.0000 eller 0.0.0000, 
// og om det er en gyldig dato ( mellom 1920 og 2030 ),
// returnerer da true ellers returneres false 
function erDato(dato){
var maaneder = new Array(0,31,29,31,30,31,30,31,31,30,31,30,31);
var dag;
var mnd;
var aar;
var ok = false;
var datoForm = /^\d{1,2}\.\d{1,2}\.\d{4}$/;
 if ( dato.match(datoForm)){
 dag = faaDag(dato);
 mnd = faaMnd(dato);
 aar = faaAar(dato);
 
  if (aar > 1920 && aar < 2030 && mnd >= 1 && mnd <= 12){
   if ( 0 < dag && dag <= maaneder[mnd]){
    
    ok = true;
    
    if (mnd == 2 && !erSkudAar(aar) && dag == 29){
     ok = false;
    }
     
   }
    
  }
   
 }
 
return ok;
 
}
// regner ut tjenestetid
function regnUtTT(){
var sumDag;
var sumMnd;
var sumAar;
var aldersDato;
 aldersDato = faaDag(fnr) + "." + faaMnd(fnr) + "." + (faaAar(fnr) + aldersGrense);
 tidTilAldersGrense = datoDiff(startDatoVl, aldersDato);
  
 sumDag = tjenesteDag + tidTilAldersGrense[2];
 sumMnd = tjenesteMnd + tidTilAldersGrense[1];
 sumAar = tjenesteAar + tidTilAldersGrense[0];
 
 if (sumDag > 29){
 
  sumDag -= 30;
  sumMnd++;
 
 }
 
 if (sumMnd > 11){
 
  sumMnd -= 12;
  sumAar++;
 
 }
 
 if (sumMnd > 5){
 
  sumAar++;
 
 }
 
 if ( sumAar > 29){
 
  sumAar = 30;
 
 }
tjenesteTid = sumAar;
}
// regner ut maks dato for venteloenn
function regnUtMaksDato(){
var mPensjon;
var mAlder;
var mTjenesteTid;
var stopAar;
var stopMnd;
var stopDag;
var vlAar = faaAar(startDatoVl);
var vlMnd = faaMnd(startDatoVl);
var vlDag = faaDag(startDatoVl);
 alder = datoDiff(fnr, startDatoVl);
 if (alder[0] < 50){
  maksAlder[0] = 3;
 }else if(alder[0] < 55){
  maksAlder[0] = 4;
  
  
 }else{
  maksAlder[0] = 100; 
 }
 maksPensjon[0] = tidTilAldersGrense[0];
 if (aldersGrense > 67){
  maksPensjon[0] -= (aldersGrense - 67);
 }
 maksPensjon[1] = tidTilAldersGrense[1];
 maksPensjon[2] = tidTilAldersGrense[2]; 
 
 
 maksTjenesteTid[0] = tjenesteAar;
 maksTjenesteTid[1] = tjenesteMnd;
 maksTjenesteTid[2] = tjenesteDag;  
 
 if (tjenesteDag > 14){
  maksTjenesteTid[1]++;
 }
 
 if (maksTjenesteTid[1] > 11){
  maksTjenesteTid[1] -= 12;
  maksTjenesteTid[0]++;
 }
 
 maksTjenesteTid[2] = 0;
 mPensjon = maksPensjon[0]*10000 + maksPensjon[1]*100 + maksPensjon[2];
 mAlder = maksAlder[0]*10000 + maksAlder[1]*100 + maksAlder[2];
 mTjenesteTid = maksTjenesteTid[0]*10000 + maksTjenesteTid[1]*100 + maksTjenesteTid[2];
 
 
 // stopp-aarsaken er pensjon
 if ((mPensjon <= mAlder) && (mPensjon <= mTjenesteTid)){
  if (aldersGrense > 67){
   stopAar = faaAar(fnr) + 67;
  }else{
   stopAar = faaAar(fnr) + aldersGrense;
  }
  
  if (faaMnd(fnr) == 12){
   stopMnd = 1;
   stopAar++;
  }else{
   stopMnd = faaMnd(fnr) + 1;
  }
  stopDag = 1;
 
 // stoppaarsaken er alder ved fratredelse
 }else if (mAlder < mTjenesteTid){
  stopDag = vlDag;
  stopMnd = vlMnd;
  stopAar = vlAar + maksAlder[0];
 
 // stoppaarsaken er faktisk tjenestetid
 }else{
  stopDag = vlDag;
  stopMnd = vlMnd + maksTjenesteTid[1];
  stopAar = vlAar + maksTjenesteTid[0];
  
  if (stopMnd > 12){
   stopMnd -= 12;
   stopAar++;
  }
 }
 
 stopDato = stopDag + "." + stopMnd + "." + stopAar;
 
}
// dersom noen "inn"-felter i formen er tomme returneres true, ellers false
function erFelterTomme(){
var felt = document.nytilgang.elements;
 for (var i = 0 ; i < felt.length ; i++ ){
 
  if (! (felt[i].name.substring(0,2) == "ut") && felt[i].value == ""){
   return true;
  }
  
 }
return false;
}
// setter alt i gang
function validateForm(){
 if (erFelterTomme()){
 
  alert(msgTommeFelt);
 
 }else{
 
  fnr = document.nytilgang.txtFnr.value;
  loenn = sjekkVerdi(document.nytilgang.txtLoenn.value);
  stillingsProsent = sjekkVerdi(document.nytilgang.txtStillingsProsent.value);
  aldersGrense = parseInt(document.nytilgang.elements['txtAldersGrense'].value, 10);
  tjenesteDag = parseInt(document.nytilgang.txtTjenesteDag.value, 10);
  tjenesteMnd = parseInt(document.nytilgang.txtTjenesteMnd.value, 10);
  tjenesteAar = parseInt(document.nytilgang.txtTjenesteAar.value, 10);
  startDatoVl = document.nytilgang.txtStartDatoVl.value;
  
  if(tjenesteDag > 29){
   
   tjenesteDag -= 30;
   tjenesteMnd++;
  
  }
  
  if(tjenesteMnd > 12){
   
   tjenesteMnd -= 12;
   tjenesteAar++;
  
  }
  
  regnUtTT();
  
  bruttoVl = valutaFormat(loenn * stillingsProsent * 0.66 * tjenesteTid / 3000);
  
  regnUtMaksDato();
  
  skrivVerdier();
 
 }
}
// skriver variabel verdier til feltene i formen
function skrivVerdier(){
 document.nytilgang.utBruttoVl.value = bruttoVl;
 document.nytilgang.utStopDato.value = datoFormat(stopDato);
 document.nytilgang.utBeregnetTjenestetid.value = tjenesteTid;
 
 document.nytilgang.utStopDato.focus();
}

