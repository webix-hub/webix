import {preventEvent, create, remove, pos as getPos} from "../webix/html";
import {protoUI} from "../ui/core";
import {toNode} from "../webix/helpers";
import env from "../webix/env";
import EventSystem from "../core/eventsystem";
import {event, eventRemove} from "../webix/htmlevents";
import Settings from "../core/settings";


const api = {
	name:"resizearea",
	defaults:{
		dir:"x"
	},
	$init:function(config){
		var dir = config.dir||"x";
		var node = toNode(config.container);
		var size = (dir=="x"?"width":"height");
		var margin = (config.margin? config.margin+"px":0);

		this._key_property = (dir == "x"?"left":"top");

		this._viewobj = create("DIV",{
			"class"	: "webix_resize_area webix_dir_"+dir
		});

		if(margin){
			if(dir=="x")
				margin = margin+" 0 "+margin;
			else
				margin = "0 "+margin+" 0 "+margin;
		}
		this._dragobj = create("DIV",{
			"class"	: "webix_resize_handle_"+dir,
			"style" : (margin?"padding:"+margin:"")
		},"<div class='webix_handle_content'></div>");

		this._originobj = create("DIV",{
			"class"	: "webix_resize_origin_"+dir
		});

		if(config[size]){
			this._originobj.style[size] = config[size]+(config.border?1:0)+"px";
			this._dragobj.style[size] = config[size]+"px";
		}
		if (config.cursor)
			this._dragobj.style.cursor = this._originobj.style.cursor = this._viewobj.style.cursor = config.cursor;

		this._moveev =	event(node, env.mouse.move, this._onmove, {bind:this});
		this._upev =	event(document, env.mouse.up, this._onup, {bind:this});
		if (env.touch) {
			this._moveev_t =	event(node, env.touch.move, e => this._onmove(e, "touch"), { passive:false });
			this._upev_t =		event(document, env.touch.up, this._onup, {bind:this});
		}

		this._dragobj.style[this._key_property] = this._originobj.style[this._key_property] = config.start+"px";

		node.appendChild(this._viewobj);
		node.appendChild(this._dragobj);
		node.appendChild(this._originobj);
	},
	_onup:function(){
		this.callEvent("onResizeEnd", [this._last_result]);

		eventRemove(this._moveev);
		eventRemove(this._upev);
		if (env.touch) {
			eventRemove(this._moveev_t);
			eventRemove(this._upev_t);
		}

		remove(this._viewobj);
		remove(this._dragobj);
		remove(this._originobj);
		this._viewobj = this._dragobj = this._originobj = null;
	},
	_onmove:function(e, pointer){
		var eventPos = getPos(e);
		this._last_result = (this._settings.dir == "x" ? eventPos.x : eventPos.y)+this._settings.start-this._settings.eventPos;
		this._dragobj.style[this._key_property] = this._last_result+"px";
		this.callEvent("onResize", [this._last_result]);

		if (pointer === "touch") preventEvent(e);
	}
};

const view = protoUI(api, EventSystem, Settings);
export default {api, view};