import Touch from "../core/touch";
import env  from "../webix/env";
import ready from "../webix/ready";
import {set as setSkin} from "../webix/skin";
import {create, addStyle} from "../webix/html";
import {define} from "../services";

if (env.mobile || env.$customScroll)
	env.scrollSize = 0;

ready(function(){
	env.scrollSize = _detectScrollSize();
});


function _detectScrollSize(){
	var div = create("div");
	div.className = "webix_skin_mark";
	div.style.cssText="position:absolute;left:-1000px;width:100px;padding:0px;margin:0px;min-height:100px;overflow-y:scroll;";

	document.body.appendChild(div);
	var width = div.offsetWidth-div.clientWidth;
	var name = { 200:"flat", 210:"compact", 220:"contrast", 230:"material", 240:"mini", 250:"willow", 260:"dark" }[Math.floor(div.offsetHeight/10)*10];
	document.body.removeChild(div);

	if (name)
		setSkin(name);

	if (env.$customScroll) return 0;
	return width;
}


let fixed = false;
function _fixHeight(){
	if (fixed) return;

	addStyle("html, body{ height:100%; }");
	document.body.className += " webix_full_screen";
	Touch.limit(false);
	fixed = true;
}

define("fixHeight", _fixHeight);