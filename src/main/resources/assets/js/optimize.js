// Google Optimize Page-Hiding snippet. Terminate instantly if call to GTM fails
(function(a,s,y,n,c,h,i,d,e){s.className+=' '+y;h.start=1*new Date;
    h.end=i=function(){s.className=s.className.replace(RegExp(' ?'+y),'')};
    (a[n]=a[n]||[]).hide=h;setTimeout(function(){i();h.end=null},c);h.timeout=c;
    window.addEventListener('error',function(e){if (e.target.src.indexOf('googletagmanager') !== -1) i()},true);
})(window,document.documentElement,'async-hide','dataLayer',3000,{'GTM-PM9RP3':true});
[]