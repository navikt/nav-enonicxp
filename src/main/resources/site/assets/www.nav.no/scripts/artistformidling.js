$(function(){
$('.resultsection li').click(function(){
location.href = $(this).find('a:first').attr('href');
}).mouseover(function(){
$(this).addClass('hover');
}).mouseout(function(){
$(this).removeClass('hover');
});

$("a[rel='external']").click(function() {window.open( $(this).attr('href') ); return false; });

$('.artist .navigate').has('a.selected').each(function(){ 
// Scroll to selected menu item if outside viewport
var scrollable = $('div:first', this);
var height = scrollable.height();
var position = $('a.selected', scrollable).position().top;
//console.log('Parent height: ' +height);
//console.log('Selected: ' +position);

if (position > height) {
//console.log('Do scroll!');
$(scrollable).scrollTop(position);
}

});

}); // document ready
