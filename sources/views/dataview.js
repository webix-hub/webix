import {create, remove, createCss} from "../webix/html";
import {protoUI} from "../ui/core";
import {extend, bind, delay} from "../webix/helpers";

import template from "../webix/template";
import env from "../webix/env";

import base from "../views/view";
import proto from "../views/proto";

import DataMove from "../core/datamove";
import DragItem from "../core/dragitem";
import MouseEvents from "../core/mouseevents";
import KeysNavigation from "../core/keysnavigation";
import SelectionModel from "../core/selectionmodel";
import Scrollable from "../core/scrollable";
import CustomPrint from "../core/customprint";
import VirtualRenderStack from "../core/virtualrenderstack";


/*
	UI:DataView
*/

// #include ui/component.js
// #include core/mouse.js 	
// #include core/edit.js 
// #include core/selection.js 

// #include core/drag.js
// #include core/move.js
// #include core/virtual_render.js
// #include core/keynav.js
// #include core/print.js

const api = {
	name:"dataview",
	$init:function(config){
		if (config.sizeToContent)
			//method need to be called before data-loaders
			//so we are using unshift to place it at start
			this.$ready.unshift(this._after_init_call);
		
		var type = config.type || config.item;
		var prerender = config.prerender || this.defaults.prerender || (type && type.width =="auto");
		
		if (!prerender && !config.autoheight)
			extend(this, VirtualRenderStack, true);
		if (config.autoheight)
			config.scroll = false;

		if(type && type.type =="tiles"){
			this._viewobj.firstChild.style.padding = "8px";
			this._tilesPadding = 8;
		}

		this._contentobj.className+=" webix_dataview";

		this._viewobj.setAttribute("role", "listbox");
	},
	_after_init_call:function(){
		var test = create("DIV",0,this.type.template({}));
		test.style.position="absolute";
		document.body.appendChild(test);
		this.type.width = test.offsetWidth;
		this.type.height = test.offsetHeight;
		
		remove(test);
	},
	defaults:{
		scroll:true,
		datafetch:50,
		navigation:true
	},
	_id:"webix_l_id",
	_itemClassName:"webix_dataview_item",
	_tilesPadding:0,
	on_click:{
		webix_dataview_item:function(e,id){ 
			if (this._settings.select){
				if (this._settings.select=="multiselect" || this._settings.multiselect)
					this.select(id, false, ((this._settings.multiselect == "touch") || e.ctrlKey || e.metaKey), e.shiftKey); 	//multiselection
				else
					this.select(id);
			}
		}		
	},
	on_dblclick:{
	},
	on_mouse_move:{
	},
	type:{
		//normal state of item
		template:template("#value#"),
		//in case of dyn. loading - temporary spacer
		templateLoading:template("Loading..."),
		width:160,
		height:50,
		classname:function(obj, common, marks){
			var css = "webix_dataview_item ";

			if (common.css) css +=common.css+" ";
			if (common.type && common.type.toString() == "tiles")
				css += "tiles ";
			if (obj.$css){
				if (typeof obj.$css == "object")
					obj.$css = createCss(obj.$css);
				css +=obj.$css+" ";
			}
			if (marks && marks.$css) css +=marks.$css+" ";
			
			return css;
		},
		tilesStart:function(obj, common){
			if (common.type == "tiles")
				return "<div class=\"webix_dataview_inner_item\" style=\"box-sizing:border-box; overflow:hidden;\">";
			return "";
		},
		tilesEnd:function(obj, common){
			if (common.type == "tiles")
				return "</div>";
			return "";
		},
		aria:function(obj, common, marks){
			return "role=\"option\""+(marks && marks.webix_selected?" aria-selected=\"true\" tabindex=\"0\"":" tabindex=\"-1\"");
		},
		templateStart:template("<div webix_l_id=\"#id#\" class=\"{common.classname()}\" {common.aria()} style=\"width:{common.width}px; height:{common.height}px; float:left; overflow:hidden;\">{common.tilesStart()}"),
		templateEnd:template("{common.tilesEnd()}</div>")
		
	},
	_calck_autoheight:function(width){
		return (this._settings.height = this.type.height * Math.ceil( this.data.count() / Math.floor(width / this.type.width)));
	},
	autoheight_setter:function(mode){
		if (mode){
			this.data.attachEvent("onStoreLoad", bind(this.resize, this));
			this._contentobj.style.overflowY = "hidden";
		}
		return mode;
	},
	$getSize:function(dx, dy){
		if ((this._settings.xCount >0) && this.type.width != "auto" && !this._autowidth)
			this._settings.width = this.type.width*this._settings.xCount + (this._scroll_y?env.scrollSize:0);
		if (this._settings.yCount && this.type.height != "auto")
			this._settings.height = this.type.height*this._settings.yCount;

		var width = this._settings.width || this._content_width;
		if (this._settings.autoheight && width){
			this._calck_autoheight(width);
			this.scroll_setter(false);	
		}
		return base.api.$getSize.call(this, dx, dy);		
	},
	_recalk_counts:function(){
		var render = false;
		if (this._settings.yCount && this.type.height == "auto"){
			this.type.height = Math.floor((this._content_height-this._tilesPadding)/this._settings.yCount);
			render = true;
		}
		if (this._settings.xCount && (this.type.width == "auto"||this._autowidth)){
			this._autowidth = true; //flag marks that width was set to "auto" initially
			this.type.width = Math.floor((this._content_width-this._tilesPadding*2)/this._settings.xCount);
			render = true;
		} else 
			this._autowidth = false;

		return render;
	},
	$setSize:function(x,y){
		if (base.api.$setSize.call(this, x, y)){
			if (this._settings.autoheight && this._calck_autoheight() != this._content_height)
				return delay(this.resize, this);

			if (this._recalk_counts() || this._render_visible_rows)
				this.render();
		}
	}
};


const view = protoUI(api,  DataMove, DragItem, MouseEvents, KeysNavigation, SelectionModel, Scrollable, CustomPrint, proto.view);
export default {api, view};