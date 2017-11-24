var InputEl = function(el, errorEl, options) {
	this.el = el;
	this.errorEl = errorEl;
	this.emptyMessage = this.el.getAttribute("data-required-error");
	this.el.addEventListener("error", this.displayError.bind(this));
	this.initErrorEvent(); 
};

InputEl.prototype.enableBlurValidation = function() {
	if(!this.blurValidationIsEnabled) {
		this.el.addEventListener("blur", this.validate.bind(this));		
		this.blurValidationIsEnabled = true; 
	}
};

InputEl.prototype.initErrorEvent = function () {
	var evt = document.createEvent("Event");
	evt.initEvent("error", true, true);
	this.errorEvent = evt;
};

InputEl.prototype.displayError = function() {
	this.errorEl.innerHTML = this.errorMessage;
};

InputEl.prototype.validate = function() {
	if(this.el.value === "" || this.el.value.trim() === "") {
		this.errorMessage = this.emptyMessage;
	} else {
		this.errorMessage = "";
	}
	this.isError = this.errorMessage !== "";
	this.el.dispatchEvent(this.errorEvent);
	return this; 
};

var CheckboxGroup = function(el, errorEl, inputfields) {
	this.el = el;
	this.errorEl = errorEl;
	this.inputfields = inputfields;
	for(var i = 0; i < this.inputfields.length; i++) {
		this.inputfields[i].addEventListener("change", this.validate.bind(this));
	}
	this.requiredErrorMessage = this.el.getAttribute("data-required-error");
	InputEl.prototype.initErrorEvent.call(this);
	this.el.addEventListener("error", InputEl.prototype.displayError.bind(this));
};

CheckboxGroup.prototype.validate = function() {
	var checked = false;
	for(var i = 0; i < this.inputfields.length; i++) {
		if(this.inputfields[i].checked) {
			checked = true; 
		}
	}
	if(checked === false) {
		this.errorMessage = this.requiredErrorMessage; 
	} else {
		this.errorMessage = "";
	}
	this.isError = this.errorMessage !== "";
	InputEl.prototype.displayError.call(this);
	this.el.dispatchEvent(this.errorEvent);
};

var Form = function(el, errorSummaryEl, fields, successFeedback) {
	this.el = el;
	this.errorSummaryEl = errorSummaryEl;
	this.fields = fields;
	this.successFeedback = successFeedback;
	this.el.addEventListener("submit", this.handleSubmit.bind(this));
	this.errorSummaryEl.addEventListener("click", this.handleErrorClick.bind(this)); 
	this.isSubmitted = false; 
	this.listenToFields(); 
};

Form.prototype.handleErrorClick = function (e) {
	e.preventDefault(); 
	if(e.target.tagName.toLowerCase() === "a") {
		var href = e.target.getAttribute("href");
		var el = document.getElementById(href.replace("#", ""));
		el.focus(); 
	}
};

Form.prototype.listenToFields = function() {
	for(var i = 0; i < this.fields.length; i++) {
		this.fields[i].el.addEventListener("error", this.handleFieldChange.bind(this));
	}
};

Form.prototype.submitForm = function(data) {
	var url = this.el.getAttribute("action").split("&amp;").join("&");
	var that = this; 
	// jQuery should be loaded at this point
	return $.ajax({
		url: url, 
		type: "POST",
		data: data
	}).done(function() {
		that.el.innerHTML = that.successFeedback; 
	}).fail(function() {
		for(var i = 0; i < that.fields.length; i++) {
			that.fields[i].el.removeAttribute("disabled");
		}
		that.renderErrorSummary('<h3>' + CONVERSATION_FORM_PHRASES.SERVER_ERROR_TITLE +  '</h3><p>' + CONVERSATION_FORM_PHRASES.SERVER_ERROR_MESSAGE + '</p>');
		that.errorSummaryEl.focus();
	});
};

Form.prototype.displayErrors = function(shouldFocus) {
	var errorList = "";
	this.errors = this.fields.filter(function(field) {
		return field.isError
	});	
	if(this.errors.length === 0) {
		this.isSubmitted = false; 
		this.renderErrorSummary(errorList);
	} else {
		errorList = this.errors.map(function(field) {
			var id = field.el.getAttribute("id");
			return '<li><a href="#' + id + '">' + field.errorMessage + '</a></li>';
		});
		errorList = "<h3>" + CONVERSATION_FORM_PHRASES.FORM_ERRORS_TITLE.replace('%N', this.errors.length) + "</h3><ul>" + errorList.join("") + "</ul>";
		this.renderErrorSummary(errorList, shouldFocus);
	}
};

Form.prototype.renderErrorSummary = function(html, shouldFocus) {
	this.errorSummaryEl.innerHTML = "<div id='js-summary' class='error-summary' tabIndex='-1'>" + html + "</div>";
	if(shouldFocus) {
		document.getElementById("js-summary").focus(); 
	}
	if(html !== "") {
		this.errorSummaryEl.style.display = "block"; 
	} else {
		this.errorSummaryEl.style.display = "none";
	}
};

Form.prototype.validate = function() {
	for(var i = 0; i < this.fields.length; i++) {
		if(typeof this.fields[i].enableBlurValidation === "function") {
			this.fields[i].enableBlurValidation(); 
		}
		this.fields[i].validate(); 
	}
};

Form.prototype.handleFieldChange = function () {
	if(this.isSubmitted) {
		this.displayErrors(false); 
	}
};

Form.prototype.handleSubmit = function(e) {
	e.preventDefault(); 
	this.validate();
	this.isSubmitted = true;
	this.displayErrors(true);
	if(this.errors.length === 0) {
		var data = $(this.el).serialize(); // jQuery should be loaded at this point
		this.submitForm(data); 
		for(var i = 0; i < this.fields.length; i++) {
			this.fields[i].el.disabled = true; 
		}
	}
}; 

var formEl = document.getElementById("form-samtale-bestilling");
var messageContainerEl = document.getElementById("form-samtale-bestilling-messages");

var firstName = new InputEl(document.getElementById("first-name"), document.getElementById("first-name-error"), {
	isRequired: true
});

var lastName = new InputEl(document.getElementById("last-name"), document.getElementById("last-name-error"), {
	isRequired: true
});

var telephone = new InputEl(document.getElementById("telephone"), document.getElementById("telephone-error"), {
	isRequired: true
});

var timeslots = new CheckboxGroup(document.getElementById("timeslots-group"), document.getElementById("timeslot-error"), document.getElementsByClassName("js-timeslot"));

new Form(formEl, messageContainerEl, [firstName, lastName, telephone, timeslots], document.getElementById("js-success-message-html").innerHTML);