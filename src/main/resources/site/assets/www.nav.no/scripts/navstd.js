/*
* Nav standard js. jQuery depended.
*/
if (typeof jQuery !== 'undefined') {
$(function () {
$('.newsarchive .newsitems li').hover(function(){$(this).addClass('hover');},function(){$(this).removeClass('hover');})
});
}