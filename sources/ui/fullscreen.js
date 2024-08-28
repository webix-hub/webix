import {addMeta, addStyle} from "../webix/html";
import env from "../webix/env";
import state from "../core/state";

import {delay} from "../webix/helpers";
import {resize} from "../ui/helpers";
import {event} from "../webix/htmlevents";
import {callEvent, attachEvent} from "../webix/customevents";

function get_orientation(){
	const orientation = window.screen.orientation ? window.screen.orientation.angle : window.orientation;
	return !!(orientation % 180);
}

function orientation_handler(){
	const new_orientation = get_orientation();
	if (state.orientation === new_orientation) return;
	state.orientation = new_orientation;
	callEvent("onRotate", [new_orientation]);
}

if (env.mobile){
	state.orientation = get_orientation();
	if (window.screen.orientation) {
		event(window.screen.orientation, "change", orientation_handler);
	} else event(window, "orientationchange", orientation_handler);
}

export default function fullScreen(){
	if (!env.mobile) return;

	addMeta("viewport","initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no");
	env.fastClick = true;

	if (env.isMac) {
		addMeta("apple-mobile-web-app-capable", "yes");
		if (env.isIOS) addStyle("body.webix_full_screen{ touch-action: pan-x pan-y; }");
	} else {
		addMeta("mobile-web-app-capable", "yes");
		addStyle("body.webix_full_screen{ overflow-y: auto; }");
	}

	var fix = function(){
		// some browsers (e.g., Samsung Internet) return incorrect inner sizes, regardless of the delay we use
		// innerWidth/innerHeight should always be lower than outerWidth/outerHeight respectively (in regular cases), so it's a fairly safe assumption to detect the correct screen sizes 
		// if outerWidth/outerHeight is lower than innerWidth/innerHeight, then it most likely returns the correct screen width/height
		var x = Math.min(window.innerWidth, window.outerWidth);
		var y = Math.min(window.innerHeight, window.outerHeight);

		if (y){
			document.body.style.height = y+"px";
			document.body.style.width = x+"px";
		}

		state._freeze_resize = false;
		resize();
	};

	var onrotate = function(){
		state._freeze_resize = true;
		delay(fix, null, [], 100);
	};

	attachEvent("onRotate", onrotate);
	orientation_handler();
	delay(onrotate);
}