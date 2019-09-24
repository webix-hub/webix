import state from "../core/state";
import i18n from "../webix/i18n";
import rules from "../webix/rules";

import {toNode, isUndefined} from "../webix/helpers";
import { event } from "../webix/htmlevents";
import {define} from "../services";
import Promise from "../thirdparty/promiz";
import {_uid} from "../ui/helpers";
import {create} from "../webix/html";

function callback(config, result){
	(config.type.indexOf("confirm") != -1 && result === false) ? config._promise.reject() : config._promise.resolve(result);

	var usercall = config.callback;
	if (usercall)
		usercall(result, config.details);

	modalbox.hide(config.id);
}
function modal_key(e){
	var count = modalbox.order.length;
	if (count > 0 && message.keyboard){
		e = e||window.event;
		var code = e.which||e.keyCode;
		var lastModalbox = modalbox.pull[modalbox.order[count-1]];

		if (code == 13 || code == 32)
			callback(lastModalbox, true);
		if (code == 27)
			callback(lastModalbox, false);

		if (e.preventDefault)
			e.preventDefault();
		return !(e.cancelBubble = true);
	}
}

event(document, "keydown", modal_key, { capture: true });
	
function modality(mode, container){
	var node = container || document.body;
	var cover;
	if(isUndefined(node.modality)){
		cover = create("DIV", {
			"class":"webix_modal_cover",
			style:"position:"+(container ? "absolute" : "fixed")+";"
		});
		cover.onkeydown = modal_key;

		if(container){
			var position = window.getComputedStyle(container).position;
			if(position != "fixed" && position != "absolute" && position != "sticky" && position != "relative")
				node.style.position = "relative";
		}
		node.appendChild(cover);
		node.modality = 1;
	}
	else
		mode ? node.modality ++ : node.modality --;

	//trigger visibility only if necessary
	if((mode && node.modality === 1) || node.modality === 0){
		if(cover)
			cover.style.display = "inline-block";
		else{
			cover = node.querySelectorAll(".webix_modal_cover");
			for(var i = 0; i < cover.length; i++){
				if(cover[i].parentNode == node){
					cover[i].style.display = node.modality == 1 ? "inline-block" : "none";
					break;
				}
			}
		}	
	}
}

function button(text, result, className){
	return "<div role='button' tabindex='0' aria-label='"+text+"' class='webix_popup_button"+(className?(" "+className):"")+"' result='"+result+"' ><div>"+text+"</div></div>";
}

function info(text){
	if (!t.area){
		t.area = document.createElement("DIV");
		t.area.className = "webix_message_area";
		t.area.style[t.position]="5px";
		
		document.body.appendChild(t.area);
	}
	t.area.setAttribute("role", "alert");
	t.area.setAttribute("aria-atomic", true);
	t.hide(text.id);
	var message = document.createElement("DIV");
	message.innerHTML = "<div>"+text.text+"</div>";
	message.className = "webix_message webix_" + text.type;
	message.onclick = function(){
		if (text) t.hide(text.id);
		text = null;
	};

	if (state.$testmode)
		message.className += " webix_no_transition";

	if (t.position == "bottom" && t.area.firstChild)
		t.area.insertBefore(message,t.area.firstChild);
	else
		t.area.appendChild(message);
	
	if (text.expire > 0)
		t.timers[text.id]=window.setTimeout(function(){
			t.hide(text.id);
		}, text.expire);

	//styling for animation
	message.style.height = message.offsetHeight-2+"px";

	t.pull[text.id] = message;
	message = null;

	return text.id;
}
function _boxStructure(config, ok, cancel){
	var box = document.createElement("DIV");
	var css = config.css ? " "+config.css : "";
	box.className = "webix_modal_box webix_"+config.type+css;
	box.setAttribute("webixbox", 1);
	box.setAttribute("role", "alertdialog");
	box.setAttribute("aria-label", config.title || "");
	box.setAttribute("tabindex", "0");

	var inner = "";
	if (config.width)
		box.style.width = config.width+(rules.isNumber(config.width)?"px":"");
	if (config.height)
		box.style.height = config.height+(rules.isNumber(config.height)?"px":"");
	if (config.title)
		inner+="<div class=\"webix_popup_title\">"+config.title+"</div>";
	inner+="<div class=\"webix_popup_text\"><span>"+(config.content?"":config.text)+"</span></div><div  class=\"webix_popup_controls\">";
	if (cancel)
		inner += button(config.cancel || i18n.message.cancel, false);
	if (ok)
		inner += button(config.ok || i18n.message.ok, true,"confirm");
	if (config.buttons && !ok && !cancel){
		for (var i=0; i<config.buttons.length; i++)
			inner += button(config.buttons[i],i);
	}
	inner += "</div>";
	box.innerHTML = inner;

	if (config.content){
		var node = config.content;
		if (typeof node == "string") 
			node = document.getElementById(node);
		if (node.style.display == "none")
			node.style.display = "";
		box.childNodes[config.title?1:0].appendChild(node);
	}

	box.onclick = function(e){
		e = e ||window.event;
		var source = e.target || e.srcElement;
		if (!source.className) source = source.parentNode;
		if (source.className.indexOf("webix_popup_button")!=-1){
			var result = source.getAttribute("result");
			result = (result == "true")||(result == "false"?false:result);
			callback(config, result);
		}
		e.cancelBubble = true;
	};
	config._box = box;
	return box;
}

modalbox.pull = {};
modalbox.order = [];

function _createBox(config, ok, cancel){
	var box = config.tagName ? config : _boxStructure(config, ok, cancel);

	var containerWidth = config.container ? config.container.offsetWidth : (window.innerWidth||document.documentElement.offsetWidth);
	var containerHeight = config.container ? config.container.offsetHeight : (window.innerHeight||document.documentElement.offsetHeight);

	if(config.container)
		box.style.position = "absolute";

	toNode((config.container || document.body).appendChild(box));
	modality(true, config.container);

	var x = config.left||Math.abs(Math.floor((containerWidth - box.offsetWidth)/2));
	var y = config.top||Math.abs(Math.floor((containerHeight - box.offsetHeight)/2));
	if (config.position == "top")
		box.style.top = "-3px";
	else
		box.style.top = y+"px";
	box.style.left = x+"px";
	//necessary for IE only
	box.onkeydown = modal_key;

	box.focus();

	if (!config.id)
		config.id = _uid("modalbox");
	else if(modalbox.pull[config.id]){
		modalbox.hide(config.id);
	}

	modalbox.order.push(config.id);
	modalbox.pull[config.id] = config;

	config._promise = Promise.defer();
	return config._promise;
}

function alertPopup(config){
	return _createBox(config, true);
}
function confirmPopup(config){
	return _createBox(config, true, true);
}
function boxPopup(config){
	return _createBox(config);
}
function box_params(text, type, callback){
	if (typeof text != "object"){
		if (typeof type == "function"){
			callback = type;
			type = "";
		}
		text = {text:text, type:type, callback:callback };
	}
	return text;
}
function params(text, type, expire, id){
	if (typeof text != "object")
		text = {text:text, type:type, expire:expire, id:id};
	text.id = text.id||_uid("message");
	text.expire = text.expire||t.expire;
	return text;
}
export function alert(){
	var text = box_params.apply(this, arguments);
	text.type = text.type || "alert";
	return alertPopup(text);
}
export function confirm(){
	var text = box_params.apply(this, arguments);
	text.type = text.type || "confirm";
	return confirmPopup(text);
}

export function modalbox(){
	var text = box_params.apply(this, arguments);
	text.type = text.type || "alert";
	return boxPopup(text);
}

modalbox.hide = function(id){
	if(id && modalbox.pull[id]){
		var node = modalbox.pull[id]._box;
		if(node){
			node.parentNode.removeChild(node);
			modalbox.order.splice(modalbox.order.indexOf(id), 1);
			modality(false, modalbox.pull[id].container);
			delete modalbox.pull[id];
		}
	}
};

modalbox.hideAll = function(){
	for (var id in modalbox.pull){
		this.hide(id);
	}
};

export function message(text, type, expire, id){ //eslint-disable-line
	text = params.apply(this, arguments);
	text.type = text.type||"info";

	var subtype = text.type.split("-")[0];
	switch (subtype){
		case "alert":
			return alertPopup(text);
		case "confirm":
			return confirmPopup(text);
		case "modalbox":
			return boxPopup(text);
		default:
			return info(text);
	}
}

var t = message;
t.expire = 4000;
t.keyboard = true;
t.position = "top";
t.pull = {};
t.timers = {};

t.hideAll = function(){
	for (var key in t.pull)
		t.hide(key);
};
t.hide = function(id){
	var obj = t.pull[id];
	if (obj && obj.parentNode){
		window.setTimeout(function(){
			obj.parentNode.removeChild(obj);
			obj = null;
		},2000);
		//styling for animation
		obj.style.height = 0;
		obj.className+=" hidden";
		t.area.removeAttribute("role");
		
		if(t.timers[id])
			window.clearTimeout(t.timers[id]);
		delete t.pull[id];
	}
};

//override circualr dependencies
define("message", message);
export default modalbox;