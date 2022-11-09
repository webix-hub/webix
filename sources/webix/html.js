import {delay, uid, toNode, extend, isUndefined} from "./helpers.js";

let _native_on_selectstart = 0;
const _style_element = {};
const _style_cache = {};

export function denySelect(){
	if (!_native_on_selectstart)
		_native_on_selectstart = document.onselectstart;
	document.onselectstart = stopEvent;
}

export function allowSelect(){
	if (_native_on_selectstart !== 0){
		document.onselectstart = _native_on_selectstart||null;
	}
	_native_on_selectstart = 0;

}

export function index(node){
	var k=0;
	//must be =, it is not a comparation!
	while ((node = node.previousSibling)) k++;
	return k;
}

export function createCss(rule, sufix){
	var text = "";
	sufix = sufix || "";

	for (var key in rule)
		text+= key+":"+rule[key]+";";

	var name = _style_cache[text+sufix];
	if (!name){
		name = "s"+uid();
		addStyle("."+name+(sufix||"")+"{"+text+"}");
		_style_cache[text+sufix] = name;
	}
	return name;
}

export function addStyle(rule, group){
	var style = group ? _style_element[group] :_style_element["default"];
	if(!style){
		style = document.createElement("style");
		style.setAttribute("type", "text/css");
		style.setAttribute("media", "screen,print");
		document.getElementsByTagName("head")[0].appendChild(style);

		if (group)
			_style_element[group] = style;
		else
			_style_element["default"] = style;
	}

	style.appendChild(document.createTextNode(rule));
}

export function removeStyle(group){
	var box = _style_element[group||"default"];
	if (box)
		box.innerHTML = "";
}

export function create(name,attrs,html){
	attrs = attrs || {};
	var node = document.createElement(name);
	for (var attr_name in attrs)
		node.setAttribute(attr_name, attrs[attr_name]);
	if (attrs.style)
		node.style.cssText = attrs.style;
	if (attrs["class"])
		node.className = attrs["class"];
	if (html)
		node.innerHTML = html;
	return node;
}

//return node value, different logic for different html elements
export function getValue(node){
	node = toNode(node);
	if (!node) return "";
	return isUndefined(node.value) ? node.innerHTML : node.value;
}

//remove html node, can process an array of nodes at once
export function remove(node){
	if (node instanceof Array)
		for (var i=0; i < node.length; i++)
			remove(node[i]);
	else if (node && node.parentNode)
		node.parentNode.removeChild(node);
}

//insert new node before sibling, or at the end if sibling doesn't exist
export function insertBefore(node,before,rescue){
	if (!node) return;
	if (before && before.parentNode)
		before.parentNode.insertBefore(node, before);
	else
		rescue.appendChild(node);
}

//return custom ID from html element 
//will check all parents starting from event's target
export function locate(e,id){
	var trg;
	if (e.tagName)
		trg = e;
	else {
		trg = e.target;
	}
    
	while (trg){
		if (trg.getAttribute){	//text nodes has not getAttribute
			var test = trg.getAttribute(id);
			if (test) return test;
		}
		trg=trg.parentNode;
	}	
	return null;
}

//returns position of html element on the page
export function offset(elem) {
	const box = elem.getBoundingClientRect();
	const body = document.body;
	const docElem = document.documentElement;
	const scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
	const scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;
	const clientTop = docElem.clientTop || body.clientTop || 0;
	const clientLeft = docElem.clientLeft || body.clientLeft || 0;
	const top  = box.top +  scrollTop -  clientTop;
	const left = box.left + scrollLeft - clientLeft;
	return { y:Math.round(top), x:Math.round(left), width:elem.offsetWidth, height:elem.offsetHeight };
}

//returns relative position of event
export function posRelative(ev){
	return { x:ev.offsetX, y:ev.offsetY };
}

//returns position of event
export function pos(ev){
	if (!ev.type)	// webix touch event
		return {x:ev.x, y:ev.y};

	if (ev.touches && ev.touches[0])
		ev = ev.touches[0];

	return {x:ev.pageX, y:ev.pageY};
}

//prevent event action
export function preventEvent(e){
	e.preventDefault();
	return stopEvent(e);
}

//stop event bubbling
export function stopEvent(e){
	e.stopPropagation();
	return false;
}

export function triggerEvent(node, type, name, details){
	let event;
	if (typeof(window[type]) === "function") {
		details = extend(details||{}, { bubbles:true, cancelable:true });
		event = new window[type](name, details);
	} else {		//IE 11 support
		event = document.createEvent(type);
		event.initEvent(name, true, true);
	}
	node.dispatchEvent(event);
}

//add css class to the node
export function addCss(node,name,check){
	if (!check || node.className.indexOf(name) === -1)
		node.className += " "+name;
}

//remove css class from the node
export function removeCss(node,name){
	node.className = node.className.replace(RegExp(" "+name,"g"),"");
}

export function getTextSize(text, css, basewidth){
	const d = create("DIV",{"class":"webix_view webix_measure_size "+(css||"")},"");
	d.style.cssText = "height:auto;visibility:hidden; position:absolute; top:0px; left:0px; overflow:hidden;"+(basewidth?("width:"+basewidth+"px;"):"width:auto;white-space:nowrap;");
	document.body.appendChild(d);

	const all = (typeof text !==  "object") ? [text] : text;
	let width = 0, height = 0;

	for (let i=0; i<all.length; i++) {
		d.innerHTML = all[i];

		const rect = d.getBoundingClientRect();
		width = Math.max(width, Math.ceil(rect.width));
		height = Math.max(height, Math.ceil(rect.height));
	}

	remove(d);
	return { width, height };
}

export function download(data, filename){
	var objUrl = false;

	if(typeof data == "object"){//blob
		if(window.navigator.msSaveBlob)
			return window.navigator.msSaveBlob(data, filename);
		else {
			data = window.URL.createObjectURL(data);
			objUrl = true;
		}
	}
	//data url or blob url
	var link = document.createElement("a");
	link.href = data;
	link.download = filename;
	document.body.appendChild(link);
	link.click(); 

	delay(function(){
		if(objUrl) window.URL.revokeObjectURL(data);
		document.body.removeChild(link);
		link.remove();
	});
}

export function _getClassName(node){
	if(!node) return "";

	var className = node.className || "";
	if(className.baseVal)//'className' exist but not a string - IE svg element in DOM
		className = className.baseVal;

	if(!className.indexOf)
		className = "";

	return className;
}

export function setSelectionRange(node, start, end){
	node.focus();

	if(node.setSelectionRange){
		start = start || 0;
		end = end || start;

		node.setSelectionRange(start, end);
	}
}

export function getSelectionRange(node){
	return {start:node.selectionStart || 0, end:node.selectionEnd || 0};
}

export function addMeta(name, value){
	document.getElementsByTagName("head").item(0).appendChild(create("meta",{
		name:name,
		content:value
	}));	
}

