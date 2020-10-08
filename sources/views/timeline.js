import {protoUI} from "../ui/core";
import {insertBefore, remove, createCss} from "../webix/html";
import {$active} from "../webix/skin";
import {isUndefined} from "../webix/helpers";

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
	$init:function(config){
		const isHorizontal = config.layout === "x";

		if(isHorizontal){
			const common = config.type;
			this.type.type = common && common.type || "top";
			if (isUndefined(config.scroll)) config.scroll = "x";
		}

		this._viewobj.className += isHorizontal ? " webix_timeline_horizontal" : " webix_timeline";
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
			else {
				if (this._settings.layout == "x")
					css += " webix_timeline_"+(index%2?"bottom":"top");
				else
					css += " webix_timeline_"+(index%2?"right":"left");
			}

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
			const padding = $active.dataPadding;
			const radius = 6, stroke = 2, paddingTop = 2;

			const lineColor = typeof common.lineColor == "string" ? common.lineColor : common.lineColor(obj, common);
			const commonStyle = `stroke-width:${stroke}px; stroke:${lineColor || $active.timelineColor};`;
			const scrollSize = this._settings.scroll ? env.scrollSize : 0;

			const width = this.$width - (padding*2)-scrollSize;
			const height = this.$height - (padding*2)-scrollSize;

			const type = common.type;
			const last = index+1 == this.count();
			const circleCenter = paddingTop + radius + stroke/2;
			const circleSize = radius*2+stroke;
			const innerPadding = circleSize/2 + 7;

			let center = 0;

			// common properties for HTML markup, values are different for layouts
			let dateStyle = "",
				eventStyle = "",
				svgWidth, svgHeight,
				x1, y1, x2, y2,
				cx, cy;

			const details = common.templateDetails(obj, common);
			const value = common.templateValue(obj, common);

			if(this._settings.layout == "x"){

				center = $active.listItemHeight;

				let dateHeight = center,
					dateOffset = center-padding*2,
					eventHeight = height-center,
					eventOffset = center+innerPadding+padding,
					eventPos = "top";

				const fixDetails = details?innerPadding:0;

				if (type == "bottom"){
					center = height-center;
					eventHeight = center-fixDetails;
					dateOffset = center+innerPadding+padding;
					eventOffset = (height-center)+dateHeight+innerPadding+padding+circleSize/2;
					eventPos = "bottom";
				} else if(type == "alternate"){
					center = Math.floor(height*0.5);
					dateOffset = center-padding*2,
					eventOffset = center+innerPadding+padding;
					eventHeight = center-fixDetails;
					if(index%2){
						dateOffset = eventOffset;
						eventOffset = center+dateHeight+innerPadding+padding+circleSize/2;
						eventPos = "bottom";
					}
				}

				dateStyle = `top:${dateOffset}px; height:${dateHeight}px;`;
				eventStyle = `${eventPos}:${eventOffset}px; height:auto; max-height:${eventHeight}px; width:inherit;`;
				svgWidth = common.width+circleSize;
				svgHeight = center+circleSize;
				x1 = circleCenter+radius; y1 = center; x2 = common.width+circleCenter-radius+padding; y2 = center;
				cx = circleCenter; cy = center;

			} else {

				center = Math.floor(width*0.35);
				let left = padding, rwidth = Math.floor(width*0.65)-innerPadding;
				let right = center+innerPadding+padding, lwidth = center-innerPadding;

				if(type == "right"){
					center = width-right+innerPadding+padding;
					left = center+innerPadding+padding;
					right = padding;
				}
				else if(type == "alternate"){
					center = Math.floor(width*0.5);
					right = center+innerPadding+padding;
					lwidth = rwidth = center-innerPadding;
					if(index%2){
						left = right;
						right = padding;
					}
				}

				dateStyle = `left:${left}px; width:${lwidth}px;`;
				eventStyle = `left:${right}px; width:${rwidth}px; height:${common.height-padding}px;`;
				svgWidth = center+circleSize;
				svgHeight = common.height+circleSize;
				x1 = center; y1 = circleCenter+radius; x2 = center; y2 = common.height+circleCenter-radius;
				cx = center; cy = circleCenter;

			}

			return `<div style="${dateStyle}" class="webix_timeline_date">${common.templateDate(obj,common)}</div>
					<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}px" height="${svgHeight}px">
						${(!last) ? `<line x1="${x1}px" y1="${y1}" x2="${x2}px" y2="${y2}" class="webix_timeline_node" style="${commonStyle}"/>` : ""}
						<circle cx="${cx}px" cy="${cy}" r="${radius}" class="webix_timeline_node webix_timeline_point" style="${commonStyle} fill:transparent;" />
					</svg>
					<div class="webix_timeline_event" style="${eventStyle}">
						<div class="webix_timeline_value">${value}</div>
						${details?`<div class="webix_timeline_details">${details}</div>`:""}
					</div>`;
		},
		templateStart:function(obj, common, index){
			// horizontal layout
			if (this._settings.layout == "x"){
				return `<div ${/*@attr*/"webix_tl_id"}="${obj.id}" class="${common.classname.call(this,obj,common,index)}" style="width:${common.width}px;">`;
			}
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
		this.type.width = $active.timelineItemHeight*3;
	}
};

const view = protoUI(api, Scrollable, RenderStack, DataLoader, MouseEvents, EventSystem, AutoTooltip, base.view);
export default {api, view};