import base from "../views/view";
import SingleRender from "../core/singlerender";
import Settings from "../core/settings";
import EventSystem from "../core/eventsystem";
import {create, insertBefore} from "../webix/html";
import {protoUI, $$} from "../ui/core";
import {extend, bind} from "../webix/helpers";
import {attachEvent, detachEvent} from "../webix/customevents";
import template from "../webix/template";


/*
	UI: Tooltip
	
	@export
		show
		hide
*/

// #include core/template.js
// #include core/single_render.js

const api = {
	name:"tooltip",
	defaults:{
		dy:0,
		dx:20
	},
	$init:function(container){
		if (typeof container == "string"){
			container = { template:container };
		}

		this.type = extend({}, this.type);

		//create  container for future tooltip
		this.$view = this._viewobj = this._contentobj = this._dataobj = create("DIV", {role:"alert", "aria-atomic":"true"});
		this._contentobj.className = "webix_tooltip";
		insertBefore(this._contentobj,document.body.firstChild,document.body);
		this._hideHandler = attachEvent("onClick", bind(function(e){
			if (this._visible && $$(e) != this)
				this.hide();
		}, this));
		
		//detach global event handler on destruction
		this.attachEvent("onDestruct", function(){
			detachEvent(this._hideHandler);
		});
	},
	adjust:function(){  },
	//show tooptip
	//pos - object, pos.x - left, pox.y - top
	isVisible:function(){
		return true;
	},
	show:function(data,pos){
		if (this._disabled) return;
		//render sefl only if new data was provided
		if (this.data!=data){
			this.data=extend({},data);
			this.render(data);
		}

		if (this._dataobj.firstChild){
			//show at specified position
			var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
			var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
			var positionX = w - pos.x;
			var positionY = h - pos.y;

			this._contentobj.style.display="block";
			
			if(positionX - this._settings.dx > this._contentobj.offsetWidth)
				positionX = pos.x;
			else {
				positionX = (pos.x - (this._settings.dx * 2)) - this._contentobj.offsetWidth;
				if(positionX <= 0) positionX = 0;
			}

			if(positionY - this._settings.dy > this._contentobj.offsetHeight)
				positionY = pos.y;
			else 
				positionY = (pos.y - this._settings.dy) - this._contentobj.offsetHeight;
			this._contentobj.style.left = positionX+this._settings.dx+"px";
			this._contentobj.style.top = positionY+this._settings.dy+"px";
		}
		this._visible = true;
	},
	//hide tooltip
	hide:function(){
		this.data=null; //nulify, to be sure that on next show it will be fresh-rendered
		this._contentobj.style.display="none";
		this._visible = false;
	},
	disable:function(){
		this._disabled = true;
	},
	enable:function(){
		this._disabled = false;
	},
	type:{
		template:template("{obj.id}"),
		templateStart:template.empty,
		templateEnd:template.empty
	}

};


const view = protoUI(api,  SingleRender, Settings, EventSystem, base.view);
export default {api, view};