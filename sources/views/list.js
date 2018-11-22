import {addCss, createCss} from "../webix/html";
import {protoUI} from "../ui/core";
import {$active} from "../webix/skin";
import {bind, extend} from "../webix/helpers";
import template from "../webix/template";

import env from "../webix/env";

import base from "../views/view";
import proto from "../views/proto";
import VRenderStack from "../core/vrenderstack";
import CustomPrint from "../core/customprint";
import KeysNavigation from "../core/keysnavigation";
import DataMove from "../core/datamove";
import DragItem from "../core/dragitem";
import MouseEvents from "../core/mouseevents";
import SelectionModel from "../core/selectionmodel";
import Scrollable from "../core/scrollable";
import CopyPaste from "../core/copypaste";

const api = {
	name:"list",
	_listClassName : "webix_list",
	_itemClassName:"webix_list_item",
	$init:function(config){
		addCss(this._viewobj, this._listClassName + (((config.layout||this.defaults.layout) == "x")?"-x":"") );
		this.data.provideApi(this,true);

		this._auto_resize = bind(this._auto_resize, this);
		this.data.attachEvent("onStoreUpdated", this._auto_resize);
		this.data.attachEvent("onSyncApply", this._auto_resize);
		this.attachEvent("onAfterRender", this._correct_width_scroll);

		this._viewobj.setAttribute("role", "listbox");
	},
	dynamic_setter:function(value){
		if (value)
			extend(this, VRenderStack, true);
		return value;
	},
	$dragHTML:function(obj){
		if (this._settings.layout == "y" && this.type.width == "auto"){
			this.type.width = this._content_width;
			var node = this._toHTML(obj);
			this.type.width = "auto";
			return node;
		}
		return this._toHTML(obj);
	},
	defaults:{
		select:false,
		scroll:true,
		layout:"y",
		navigation:true,
		datafetch:50
	},
	_id:"webix_l_id",
	on_click:{
		webix_list_item:function(e,id){
			if (this._settings.select){
				this._no_animation = true;
				if (this._settings.select=="multiselect"  || this._settings.multiselect)
					this.select(id, false, (e.ctrlKey || e.metaKey || (this._settings.multiselect == "touch")), e.shiftKey); 	//multiselection
				else
					this.select(id);
				this._no_animation = false;
			}
		}
	},
	on_dblclick:{
	},
	getVisibleCount:function(){
		return Math.floor(this._content_height / this._one_height());
	},
	_auto_resize:function(){
		if (this._settings.autoheight || this._settings.autowidth)
			this.resize();
	},
	_auto_height_calc:function(count){
		var value = this.data.$pagesize||this.count();

		this._onoff_scroll(count && count < value, "y");
		if (this._settings.autoheight && value < (count||Infinity) ) 
			count = value;
		var height = this._one_height() * count + (this.type.margin||0);
		//unitlist
		if(this.getUnits)
			height += this.getUnits().length*this.type.headerHeight;

		return Math.max(height,this._settings.minHeight||0);
	},
	_one_height:function(){
		return this.type.height + (this.type.margin||0);
	},
	_auto_width_calc:function(count){
		var value = this.data.$pagesize||this.count();

		this._onoff_scroll(count && count < value, "x");
		if (this._settings.autowidth && value < (count||Infinity) ) 
			count = value;

		return (this.type.width * count); 
	},
	_correct_width_scroll:function(){
		if (this._settings.layout == "x")
			this._dataobj.style.width = (this.type.width != "auto") ? (this.type.width * this.count() + "px") : "auto";
	},
	$getSize:function(dx,dy){
		if (this._settings.layout == "y"){
			if (this.type.width!="auto")
				this._settings.width = this.type.width + (this._scroll_y?env.scrollSize:0);
			if (this._settings.yCount || this._settings.autoheight)
				this._settings.height = this._auto_height_calc(this._settings.yCount)||1;
		}
		else {
			if (this.type.height!="auto")
				this._settings.height = this._one_height() + (this._scroll_x?env.scrollSize:0);
			if (this._settings.xCount || this._settings.autowidth)
				this._settings.width = this._auto_width_calc(this._settings.xCount)||1;
		}
		return base.api.$getSize.call(this, dx, dy);
	},
	$setSize:function(){
		base.api.$setSize.apply(this, arguments);
	},
	type:{
		css:"",
		widthSize:function(obj, common){
			return common.width+(common.width>-1?"px":"");
		},
		heightSize:function(obj, common){
			return common.height+(common.height>-1?"px":"");
		},
		classname:function(obj, common, marks){
			var css = "webix_list_item";
			if (obj.$css){
				if (typeof obj.$css == "object")
					obj.$css = createCss(obj.$css);
				css += " "+obj.$css;
			}
			if (marks && marks.$css)
				css += " "+marks.$css;

			return css;
		},
		aria:function(obj, common, marks){
			return "role=\"option\""+(marks && marks.webix_selected?" aria-selected=\"true\" tabindex=\"0\"":" tabindex=\"-1\"")+(obj.$count && obj.$template?"aria-expanded=\"true\"":"");
		},
		template:function(obj){
			return (obj.icon?("<span class='webix_list_icon webix_icon "+obj.icon+"'></span>"):"") + obj.value + (obj.badge?("<div class='webix_badge'>"+obj.badge+"</div>"):"");
		},
		width:"auto",
		templateStart:template("<div webix_l_id=\"#id#\" class=\"{common.classname()}\" style=\"width:{common.widthSize()}; height:{common.heightSize()}; overflow:hidden;\" {common.aria()}>"),
		templateEnd:template("</div>")
	},
	$skin:function(){
		this.type.height = $active.listItemHeight;
	}
};


const view = protoUI(api,  CustomPrint, KeysNavigation, DataMove, DragItem, MouseEvents, SelectionModel, Scrollable, proto.view, CopyPaste);
export default {api, view};