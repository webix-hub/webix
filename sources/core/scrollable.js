import {create} from "../webix/html";
import {delay} from "../webix/helpers";
import env from "../webix/env";
import {_event} from "../webix/htmlevents";

import CustomScroll from "../core/customscroll";

const Scrollable = {
	$init:function(config){
		//do not spam unwanted scroll containers for templates 
		if (config && !config.scroll && this._one_time_scroll) 
			return (this._dataobj = (this._dataobj||this._contentobj));

		(this._dataobj||this._contentobj).appendChild(create("DIV",{ "class" : "webix_scroll_cont" },""));
		this._dataobj = (this._dataobj||this._contentobj).firstChild;

		if (this.callEvent && !this.$hasYScroll)
			_event(this._viewobj, "scroll", function(){
				delay(function(){
					this.callEvent("onAfterScroll", []);
				}, this);
			}, { bind:this });
	},
	scroll_setter:function(value){
		if (!value) return false;

		const auto = value === "auto";
		const marker = (value=="x"?"x":(value=="xy"?"xy":(auto?"xy":"y")));

		if (env.$customScroll)
			CustomScroll.enable(this, marker);

		const style = this._dataobj.parentNode.style;
		if (auto && !env.$customScroll){
			style.overflowX = style.overflowY = "auto";
		} else {
			if (marker.indexOf("x") !== -1){
				this._scroll_x = true;
				style.overflowX = "scroll";
			}
			if (marker.indexOf("y") !== -1){
				this._scroll_y = true;
				style.overflowY = "scroll";
			}
		}
		return marker;
	},
	_onoff_scroll:function(mode, dir){
		if (!!this._settings.scroll == !!mode) return;

		if (!env.$customScroll){
			var style = this._dataobj.parentNode.style;
			style[dir === "x" ? "overflowX" : "overflowY"] = mode ? "auto" : "hidden";
		}

		if (dir === "x"){
			this._scroll_x = mode;
		} else {
			this._scroll_y = mode;
		}
		this._settings.scroll = mode?dir:false;
	},
	getScrollState:function(){
		return { x: this._dataobj.parentNode.scrollLeft, y: this._dataobj.parentNode.scrollTop };
	},
	scrollTo:function(x,y){
		this._dataobj.parentNode.scrollLeft = x;
		this._dataobj.parentNode.scrollTop = y;
	}
};

export default Scrollable;