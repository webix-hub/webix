import {protoUI} from "../ui/core";
import {insertBefore, remove, createCss} from "../webix/html";
import {$active} from "../webix/skin";

import base from "../views/baseview";
import template from "../webix/template";

import AutoTooltip from "../core/autotooltip";
import DataLoader from "../core/dataloader";
import EventSystem from "../core/eventsystem";
import MouseEvents from "../core/mouseevents";
import Scrollable from "../core/scrollable";
import RenderStack from "../core/renderstack";

import env from "../webix/env";
import DateHelper from "../core/date";


const api = {
	name:"timeline",
	defaults:{
		scroll:"auto"
	},
	$init:function(){
		this._viewobj.className += " webix_timeline";
		this.$blockRender = true;

		this.data.provideApi(this,true);
		this.data.attachEvent("onStoreUpdated", (id,data,type) => this.render(id,data,type));
	},
	_id:/*@attr*/"webix_tl_id",
	on_click:{},
	$setSize: function(x, y) {
		this.$blockRender = false;
		if (base.api.$setSize.call(this, x, y)){
			this.refresh();
		}
	},
	render:function(id,data,type){
		if (!this.isVisible(this._settings.id) || this.$blockRender)
			return;

		if(type == "update"){
			const node = this.getItemNode(id); //get html element of updated item

			const t = this._htmlmap[id] = this._toHTMLObject(data);
			insertBefore(t, node);
			remove(node);
			return true;
		}
		else{
			//full reset
			if (this.callEvent("onBeforeRender",[this.data])){
				this._htmlmap = null;
				this._dataobj.innerHTML = this.data.getRange().map(this._toHTML,this).join("");
				this.callEvent("onAfterRender",[]);
			}
		}
		return true;
	},
	_toHTML:function(obj){
		this.callEvent("onItemRender",[obj]);
		const index = this.getIndexById(obj.id);
		return this.type.templateStart.call(this,obj,this.type, index)+this.type.template.call(this, obj,this.type, index)+this.type.templateEnd.call(this);
	},
	type:{
		type:"left",
		classname:function(obj, common, index){
			let css = "webix_timeline_item";

			if(common.type !== "alternate")
				css += "  webix_timeline_"+common.type;
			else
				css += " webix_timeline_"+(index%2?"right":"left");

			if (common.css) css += " "+common.css;
			if (obj.$css){
				if (typeof obj.$css == "object")
					obj.$css = createCss(obj.$css);
				css += " "+obj.$css;
			}

			return css;
		},
		lineColor:(obj) => obj.color,
		templateValue:template("#value#"),
		templateDetails:(obj) => obj.details || "",
		templateDate:(obj) => {
			const format = DateHelper.dateToStr("%d %M, %Y");
			return format(obj.date);
		},
		template:function(obj, common, index) {
			const lineColor = typeof common.lineColor == "string" ? common.lineColor : common.lineColor(obj, common);
			const color = lineColor || $active.timelineColor;
			const scrollSize = this._settings.scroll ? env.scrollSize : 0;
			const width = this.$width - ($active.dataPadding*2)-scrollSize;
			const height = Math.ceil(this.type.height*1.1);
			const type = common.type;
			const last = index+1 == this.count();
			const offset = 9;

			let left = 0, right = Math.floor(width*0.35), rwidth = Math.floor(width*0.65);
			let lwidth = right, center = right;

			if(type == "right"){
				left = width - right;
				right = 0;
				center = left;
			}
			else if(type == "alternate"){
				right = center = lwidth = rwidth = Math.floor(width*0.5);
				if(index%2){
					left = right;
					right = 0;
				}
			}

			return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${common.height+offset}px">
				<foreignObject x="${left}px" y="0" width="${lwidth}px" height="100%">
					<div class="webix_timeline_date">${common.templateDate(obj,common)}</div>
				</foreignObject>
				<circle cx="${center}px" cy="${offset}" r="6" class="webix_timeline_node webix_timeline_point" style="stroke:${color}" />
				${(!last) ? `<line x1="${center}px" y1="14" x2="${center}px" y2="${height}" class="webix_timeline_node" style="stroke:${color}" />` : ""}
				<foreignObject x="${right}px" y="0" width="${rwidth}px" height="${common.height-10}px">
					<div class="webix_timeline_value">${common.templateValue(obj,common)}</div>
					<div class="webix_timeline_details">${common.templateDetails(obj,common)}</div>
			</foreignObject>
			</svg>`;
		},	
		templateStart:function(obj, common, index){
			return `<div ${/*@attr*/"webix_tl_id"}="${obj.id}" class="${common.classname.call(this,obj,common,index)}" style="height:${common.height}px;">`;
		},
		templateEnd:template("</div>")
	},
	templateValue_setter:function(config){
		this.type.templateValue = template(config);
	},
	templateDetails_setter:function(config){
		this.type.templateDetails = template(config);
	},
	templateDate_setter:function(config){
		this.type.templateDate = template(config);
	},
	$skin:function(){
		this.type.height = $active.timelineItemHeight;
	}
};

const view = protoUI(api, Scrollable, RenderStack, DataLoader, MouseEvents, EventSystem, AutoTooltip, base.view);
export default {api, view};