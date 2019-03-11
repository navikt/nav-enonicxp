Effect.OpenUp = function(element, parent) {
     element = $(element);
     parent = $(parent);
     new Effect.BlindDown(element, arguments[2] || {});
     parent.className = "drilldownSelected";
 }

 Effect.CloseDown = function(element, parent) {
     element = $(element);
     parent = $(parent);
     new Effect.BlindUp(element, arguments[2] || {});
     parent.className = "drilldown";

 }

 Effect.Combo = function(element, parent) {
     element = $(element);
     parent = $(parent);
     if(element.style.display == 'none') { 
          new Effect.OpenUp(element, parent, arguments[2] || {}); 
     }else { 
          new Effect.CloseDown(element, parent, arguments[2] || {}); 
     }
 }
 
 function rullgardin(element, parent) {
	element = $(element);
	parent = $(parent);
	Effect.Combo(element, parent, { duration: .2 }); 
 }