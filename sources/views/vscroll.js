import EventSystem from "../core/eventsystem";
import Settings from "../core/settings";
import {preventEvent} from "../webix/html";
import {protoUI} from "../ui/core";
import env from "../webix/env";
import {toNode, delay} from "../webix/helpers";
import {_event} from "../webix/htmlevents";
import {$active} from "../webix/skin";


const api = {
	name:"vscroll",
	$apiOnly:true,
	defaults:{
		scroll:"x",
		scrollPos:0,
		scrollSize:18,
		scrollVisible:true,
		zoom:1
	},
	$init:function(config){
		var dir = config.scroll||"x";
		var node = this._viewobj = toNode(config.container);
		node.className += " webix_vscroll_"+dir;
		node.innerHTML = "<div class='webix_vscroll_body'></div>";
		_event(node, "scroll", () => this._onscroll_delay());

		this._last_set_size = 0;
	},
	$skin:function(){
		this.defaults.scrollStep = $active.rowHeight;
	},
	reset:function(){
		this.config.scrollPos = 0;
		this._viewobj[this.config.scroll == "x"?"scrollLeft":"scrollTop"] = 0;

		if (this._scroll_delay)
			clearTimeout(this._scroll_delay[0]);
	},
	_check_quantum:function(value){
		if (value>1500000){
			this._settings.zoom = value/1000000;
			value = 1000000;
		} else {
			this._settings.zoom = 1;
		}
		return value;
	},	
	scrollWidth_setter:function(value){
		value = this._check_quantum(value);
		this._viewobj.firstChild.style.width = value+"px";
		return value;		
	},
	scrollHeight_setter:function(value){
		value = this._check_quantum(value);
		this._viewobj.firstChild.style.height = value+"px";
		return value;
	},
	sizeTo:function(value, top, bottom){
		value = value-(top||0)-(bottom||0);

		var width = this._settings.scrollSize;
		if (!width && this._settings.scrollVisible && !env.$customScroll){
			this._viewobj.style.pointerEvents = "none";
			width = 14;
		}

		if (!width){
			this._viewobj.style.display = "none";
		} else {
			this._viewobj.style.display = "block";
			if (top)
				this._viewobj.style.marginTop = top+ "px";
			this._viewobj.style[this._settings.scroll == "x"?"width":"height"] = Math.max(0,value)+"px";
			this._viewobj.style[this._settings.scroll == "x"?"height":"width"] = width+"px";
		}

		this._last_set_size = value;
	},
	getScroll:function(){
		return Math.round(this._settings.scrollPos*this._settings.zoom);
	},
	getSize:function(){
		return Math.round((this._settings.scrollWidth||this._settings.scrollHeight)*this._settings.zoom);
	},
	_fixSize(){
		const pos = this.getScroll();
		const max = Math.max(this.getSize() - this._last_set_size, 0);
		if (pos > max)
			this.scrollTo(max);
	},
	_sync(value, smooth){
		const config = this._settings;

		value = Math.round(value / config.zoom);
		//safety check for negative values
		if (value < 0) value = 0;

		if (smooth && this._viewobj.scrollTo) {
			const options = { top:0, left:0, behavior:"smooth" };
			options[config.scroll == "x"?"left":"top"] = value;

			this._viewobj.scrollTo(options);
		} else {
			this._viewobj[config.scroll == "x"?"scrollLeft":"scrollTop"] = value;
		}
		this._onscroll_delay(150);
		this._settings.scrollPos = value || 0;
	},
	scrollTo:function(value){
		const config = this._settings;

		value = Math.round(value / config.zoom);
		//safety check for negative values
		if (value < 0) value = 0;

		//apply new position
		if (value != this._settings.scrollPos){
			this._viewobj[config.scroll == "x"?"scrollLeft":"scrollTop"] = value;
			this._onscroll_inner(value, true);
		}
	},
	_onscroll_delay:function(time){
		if (this._scroll_delay) {
			time = time || this._scroll_delay[1];
			clearTimeout(this._scroll_delay[0]);
		}
		this._scroll_delay = [delay(this._onscroll, this, [!!time], time), time];
	},
	_onscroll:function(sync){
		this._scroll_delay = null;
		if (sync) return;

		const v = Math.round( this._viewobj[this._settings.scroll == "x"?"scrollLeft":"scrollTop"] );
		if (v != this._settings.scrollPos)
			this._onscroll_inner(v, false);
	},
	_onscroll_inner:function(value, api){
		//size of scroll area
		var height = (this._settings.scrollWidth||this._settings.scrollHeight);
		//if we scrolled to the end of the area
		if (value >= height - this._last_set_size/(api?this._settings.zoom:1)) {
			//set value so the last row is visible
			value = Math.max(0, height - this._last_set_size/this._settings.zoom);
		}
		
		this._settings.scrollPos = value || 0;
		this.callEvent("onScroll", [this.getScroll()]);
	},
	activeArea:function(area, x_mode){
		this._x_scroll_mode = x_mode;
		_event(area, "wheel", this._on_wheel, {bind:this, passive:false});
	},
	_on_wheel:function(e){
		if (e.ctrlKey) return false;

		let dir = 0;
		const step = e.deltaMode === 0 ? 30 : 1;
		if ((e.deltaX && Math.abs(e.deltaX) > Math.abs(e.deltaY)) || e.shiftKey){
			//x-scroll
			if (this._x_scroll_mode && this._settings.scrollVisible)
				dir = (e.shiftKey ? e.deltaY : e.deltaX) / step;
		} else {
			//y-scroll
			if (!this._x_scroll_mode && this._settings.scrollVisible)
				dir = e.deltaY / step;
		}

		// Safari requires target preserving
		// (used in _check_rendered_cols of DataTable)
		if (env.isSafari)
			this._scroll_trg = e.target;

		if (dir){
			const old = this.getScroll();
			this.scrollTo(old + dir*this._settings.scrollStep);
			if (old !== this.getScroll())
				preventEvent(e);
		}
	}
};


const view = protoUI(api, EventSystem, Settings);
export default {api, view};