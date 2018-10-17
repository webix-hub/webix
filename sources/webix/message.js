import state from "../core/state";
import i18n from "../webix/i18n";
import rules from "../webix/rules";

import {toNode} from "../webix/helpers";
import { event } from "../webix/htmlevents";
import {define} from "../services";

var _webix_msg_cfg = null;
function callback(config, result){
	var usercall = config.callback;
	modality(false);
	config.box.parentNode.removeChild(config.box);
	_webix_msg_cfg = config.box = null;
	if (usercall)
		usercall(result,config.details);
}
function modal_key(e){
	if (_webix_msg_cfg){
		e = e||event;
		var code = e.which||event.keyCode;
		if (message.keyboard){
			if (code == 13 || code == 32)
				callback(_webix_msg_cfg, true);
			if (code == 27)
				callback(_webix_msg_cfg, false);
		
			if (e.preventDefault)
				e.preventDefault();
			return !(e.cancelBubble = true);
		}
	}
}

event(document, "keydown", modal_key, { capture: true });
	
function modality(mode){
	if(!modality.cover || !modality.cover.parentNode){
		modality.cover = document.createElement("DIV");
		//necessary for IE only
		modality.cover.onkeydown = modal_key;
		modality.cover.className = "webix_modal_cover";
		document.body.appendChild(modality.cover);
	}
	modality.cover.style.display = mode?"inline-block":"none";
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
	message.className = "webix_info webix_" + text.type;
	message.onclick = function(){
		t.hide(text.id);
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
	box.className = " webix_modal_box webix_"+config.type;
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
	if (ok || config.ok)
		inner += button(config.ok || i18n.message.ok, true,"confirm");
	if (cancel || config.cancel)
		inner += button(config.cancel || i18n.message.cancel, false);
	if (config.buttons){
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
		e = e ||event;
		var source = e.target || e.srcElement;
		if (!source.className) source = source.parentNode;
		if (source.className.indexOf("webix_popup_button")!=-1){
			var result = source.getAttribute("result");
			result = (result == "true")||(result == "false"?false:result);
			callback(config, result);
		}
		e.cancelBubble = true;
	};
	config.box = box;
	if (ok||cancel||config.buttons)
		_webix_msg_cfg = config;

	return box;
}
function _createBox(config, ok, cancel){
	var box = config.tagName ? config : _boxStructure(config, ok, cancel);
	
	if (!config.hidden)
		modality(true);

	toNode(config.container || document.body).appendChild(box);
		
	var x = config.left||Math.abs(Math.floor(((window.innerWidth||document.documentElement.offsetWidth) - box.offsetWidth)/2));
	var y = config.top||Math.abs(Math.floor(((window.innerHeight||document.documentElement.offsetHeight) - box.offsetHeight)/2));
	if (config.position == "top")
		box.style.top = "-3px";
	else
		box.style.top = y+"px";
	box.style.left = x+"px";
	//necessary for IE only
	box.onkeydown = modal_key;

	box.focus();
	if (config.hidden)
		modalbox.hide(box);

	return box;
}

function alertPopup(config){
	return _createBox(config, true, false);
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
	text.id = text.id||t.uid();
	text.expire = text.expire||t.expire;
	return text;
}
export function alert(){
	var text = box_params.apply(this, arguments);
	text.type = text.type || "confirm";
	return alertPopup(text);
}
export function confirm(){
	var text = box_params.apply(this, arguments);
	text.type = text.type || "alert";
	return confirmPopup(text);
}

export function modalbox(){
	var text = box_params.apply(this, arguments);
	text.type = text.type || "alert";
	return boxPopup(text);
}

modalbox.hide = function(node){
	if(node){
		while (node && node.getAttribute && !node.getAttribute("webixbox"))
			node = node.parentNode;
		if (node){
			node.parentNode.removeChild(node);
		}
	}

	modality(false);
	_webix_msg_cfg = null;
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
t.seed = (new Date()).valueOf();
t.uid = function(){return t.seed++;};
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