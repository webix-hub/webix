import {preventEvent} from "../webix/html";
import {bind, toNode} from "../webix/helpers";
import window from "../views/window";
import {$$} from "../ui/core";
import {event, eventRemove} from "../webix/htmlevents";
import {assert} from "../webix/debug";
import {callEvent} from "../webix/customevents";


const ContextHelper = {
	defaults:{
		padding:"4",
		hidden:true
	},
	body_setter:function(value){
		value = window.api.body_setter.call(this, value);
		this._body_cell._viewobj.style.borderWidth = "0px";
		return value;
	},
	attachTo:function(obj){
		assert(obj, "Invalid target for Context::attach");
		var id;
		if (obj.on_context)
			id = obj.attachEvent("onAfterContextMenu", bind(this._show_at_ui, this));
		else 
			id = event(obj, "contextmenu", this._show_at_node, {bind:this});

		this.attachEvent("onDestruct", function(){
			if (obj.callEvent)
				obj.detachEvent(id);
			else
				eventRemove(id);
			obj = null;			
		});
	},
	getContext:function(){
		return this._area;
	},
	setContext:function(area){
		this._area = area;
	},
	_show_at_node:function(e){
		this._area = toNode(e||event);
		return this._show_at(e);
	},
	_show_at_ui:function(id, e){
		this._area = { obj:$$(e), id:id };
		return this._show_at(e);
	},
	_show_at:function(e){
		var result = this.show(e, null, true);
		if (result === false) return result;

		//event forced to close other popups|context menus
		callEvent("onClick", []);		
		return preventEvent(e);
	},
	_show_on_mouse_out:true,
	master_setter:function(value){
		this.attachTo(value);
		return null;
	}
};

export default ContextHelper;