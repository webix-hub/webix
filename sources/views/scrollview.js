import base from "../views/view";
import Scrollable from "../core/scrollable";
import EventSystem from "../core/eventsystem";
import {protoUI, ui, $$} from "../ui/core";
import env from "../webix/env";
import state from "../core/state";
import {callEvent} from "../webix/customevents";


/*scrollable view with another view insize*/
const api = {
	name:"scrollview",
	defaults:{
		scroll:"y",
		scrollSpeed:"0ms"
	},
	$init:function(){
		this._viewobj.className += " webix_scrollview";
	},
	body_setter:function(config){
		config.borderless = true;
		state._parent_cell = this;
		this._body_cell = ui._view(config);
		
		this._dataobj.appendChild(this._body_cell._viewobj);
	},
	getChildViews:function(){
		return [this._body_cell];
	},
	getBody:function(){
		return this._body_cell;
	},
	resizeChildren:function(){
		if (!this._body_cell) return;

		this._desired_size = this._body_cell.$getSize(0, 0);
		this._resizeChildren();
		callEvent("onResize",[]);
	},
	_resizeChildren:function(){
		var cx = Math.max(this._content_width, this._desired_size[0]);
		var cy = Math.max(this._content_height, this._desired_size[2]);
		this._body_cell.$setSize(cx, cy);			
		this._dataobj.style.width = this._body_cell._content_width+"px";
		this._dataobj.style.height = this._body_cell._content_height+"px";
		if (env.touch){
			var scroll = this.getScrollState();
			var top = this._body_cell._content_height - this._content_height;
			if (top < scroll.y)
				this.scrollTo(null, top);
		}
		if (state._responsive_exception){
			state._responsive_exception = false;
			this._desired_size = this._body_cell.$getSize(0, 0);
			this._resizeChildren();
		}
	},
	$getSize:function(dx, dy){
		var desired_size = this._desired_size = this._body_cell.$getSize(0, 0);
		var self_sizes   = base.api.$getSize.call(this, dx, dy);
		var scroll_size = this._native_scroll || env.scrollSize;

		if(this._settings.scroll=="x"){
			self_sizes[2] = Math.max(self_sizes[2], desired_size[2]) + scroll_size;
			self_sizes[3] = Math.min(self_sizes[3], desired_size[3]) + scroll_size;
		} else if(this._settings.scroll=="y"){
			self_sizes[0] = Math.max(self_sizes[0], desired_size[0]) + scroll_size;
			self_sizes[1] = Math.min(self_sizes[1], desired_size[1]) + scroll_size;
		}
		return self_sizes;
	},
	$setSize:function(x,y){
		var temp = env.scrollSize;
		env.scrollSize = this._native_scroll || temp;

		if (base.api.$setSize.call(this,x,y) || state._force_resize)
			this._resizeChildren();
		
		env.scrollSize = temp;
	},
	scroll_setter:function(value){
		var custom = env.$customScroll;
		if (typeof value == "string" && value.indexOf("native-") === 0){
			this._native_scroll = 17;
			value = value.replace("native-");
			env.$customScroll = false;
		}

		value =  Scrollable.scroll_setter.call(this, value);

		env.$customScroll = custom;
		return value;
	},
	_replace:function(new_view){
		this._body_cell.destructor();
		this._body_cell = new_view;
		
		this._bodyobj.appendChild(this._body_cell._viewobj);
		this.resize();
	},
	showView: function(id){
		var topPos = $$(id).$view.offsetTop-$$(id).$view.parentNode.offsetTop;
		this.scrollTo(0, topPos);
	}
};


const view = protoUI(api,  Scrollable, EventSystem, base.view);
export default {api, view};