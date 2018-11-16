import {locate} from "../webix/html";
import {protoUI} from "../ui/core";
import {bind} from "../webix/helpers";
import {_event} from "../webix/htmlevents";
import template from "../webix/template";

import color from "../webix/color";
import KeysNavigation from "../core/keysnavigation";
import EventSystem from "../core/eventsystem";
import base from "../views/view";

const api = {
	name:"colorboard",
	defaults:{
		template:"<div style=\"width:100%;height:100%;background-color:{obj.val}\"></div>",
		palette:null,
		height:220,
		width:220,
		cols:12,
		rows:10,
		minLightness:0.15,
		maxLightness:1,
		navigation:true
	},
	$init:function(){
		_event(this._viewobj, "click", bind(function(e){
			var value = locate(e, "webix_val");
			
			this.setValue(value);
			this.callEvent("onItemClick", [this._settings.value, e]);
			this.callEvent("onSelect", [this._settings.value]);
		}, this));

		this.$view.setAttribute("role", "grid");
		this._viewobj.setAttribute("aria-readonly", "true");
	},
	_set_item_focus:function(){
		if(!this.getValue())
			this.moveSelection("up");
	},
	_findIndex:function(value){
		var pal = this._settings.palette;
		value = (value || "").toUpperCase();
		for(var r= 0, rows= pal.length; r < rows; r++)
			for(var c= 0, cols = pal[r].length; c < cols; c++){
				if(pal[r][c].toUpperCase() == value){
					return {row:r, col:c};
				}
			}
		return null;
	},
	$setSize:function(x,y){
		if(base.api.$setSize.call(this,x,y)){
			this.render();
		}
	},
	getValue:function(){
		return this._settings.value;
	},
	_getBox:function(){
		return this._viewobj.firstChild;
	},
	setValue:function(value){
		if(value && value.toString().charAt(0) != "#")
			value = "#" + value;

		var oldvalue = this._settings.value;

		this._settings.value = value;
		this.$setValue(value, oldvalue);

		return value;
	},
	_selectBox:null,
	_getSelectBox:function(){
		if( this._selectBox && this._selectBox.parentNode ){
			return this._selectBox;
		}else{
			var div = this._selectBox = document.createElement("div");
			div.className = "webix_color_selector";
			this._viewobj.lastChild.appendChild(div);
			return div;
		}
	},
	$setValue:function(value, oldvalue){
		if(this.isVisible(this._settings.id)){
			var cell, div, ind, parent, style,
				left = 0, top = 0;

			//remove tabindex for previous selection
			if(oldvalue) ind = this._findIndex(oldvalue);
			if(!ind) ind = {row:0, col:0};
			this._viewobj.lastChild.childNodes[ind.row].childNodes[ind.col].setAttribute("tabindex", "-1");

			ind = this._findIndex(value);
			if(ind){
				cell = this._viewobj.lastChild.childNodes[ind.row].childNodes[ind.col];
			}

			if(cell && cell.parentNode && cell.parentNode.parentNode){
				parent = cell.parentNode;
				left = cell.offsetLeft - parent.offsetLeft ;
				top = - (this.$height - (cell.offsetTop -parent.parentNode.offsetTop ));

				cell.setAttribute("tabindex", "0");
				cell.setAttribute("aria-selected", "true");
				cell.setAttribute("tabindex", "0");
				cell.setAttribute("aria-selected", "true");
			}else{
				if (this._selectBox)
					this._selectBox.style.left = "-100px";
				this._viewobj.lastChild.childNodes[0].childNodes[0].setAttribute("tabindex", "0");
				return;
			}

			div = this._getSelectBox();
			style =  [
				"left:" + left + "px",
				"top:" + top+"px",
				"width:" + cell.style.width,
				"height:" + cell.style.height
			].join(";");

			if( typeof( div.style.cssText ) !== "undefined" ) {
				div.style.cssText = style;
			} else {
				div.setAttribute("style",style);
			}
		}
	},


	_initPalette:function(config){
		function numToHex(n){
			return color.toHex(n, 2);
		}
		function rgbToHex(r,g,b){
			return "#"+numToHex( Math.floor(r)) +numToHex( Math.floor(g)) + numToHex(Math.floor(b));
		}
		function hslToRgb(h, s, l){
			var r, g, b;
			if(!s){
				r = g = b = l; // achromatic
			}else{
				var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
				var p = 2 * l - q;
				r = hue2rgb(p, q, h + 1/3);
				g = hue2rgb(p, q, h);
				b = hue2rgb(p, q, h - 1/3);
			}

			return {r:r * 255, g:g * 255, b:b * 255};
		}
		function hue2rgb(p, q, t){
			if(t < 0) t += 1;
			if(t > 1) t -= 1;
			if (t < 1/6)
				return p + (q - p) * 6 * t; 
			else if (t <= 1/2)
				return q;
			else if (t < 2/3) 
				return p + (q - p) * (2/3 - t) * 6;
			else
				return p;
		}

		function renderGrayBar(colCount){
			var gray = [],
				val = 255,
				step = val / colCount;

			for(var i=0; i < colCount; i++){
				val = Math.round(val > 0 ? val : 0);
				gray.push(rgbToHex(val, val, val));
				val -= step;
			}
			gray[gray.length - 1] = "#000000";
			return gray;
		}

		var colors = [];
		var colorRows = config.rows - 1;
		var colorStep = 1/config.cols;
		var lightStep = (config.maxLightness - config.minLightness)/colorRows;
		var colorRange = null;

		colors.push(renderGrayBar(config.cols));

		for(var step = 0, lt = config.minLightness; step < colorRows; step++){
			colorRange = [];
			for(var c = 0, col = 0; c < config.cols; c++ ){
				var val = hslToRgb(col, 1, lt );
				colorRange.push(rgbToHex(val.r, val.g, val.b));
				col += colorStep;
			}
			colors.push(colorRange);
			lt+=lightStep;
		}

		this._settings.palette = colors;
	},
	moveSelection:function(mode, details, focus){
		var value = this.getValue(), ind, cell;

		if(value) ind = this._findIndex(value);
		if(!ind) ind = {row:0, col:0};

		if(ind){
			if(mode == "up" || mode == "down")
				ind.row = ind.row + (mode == "up"?-1:1);
			else if(mode == "right" || mode == "left")
				ind.col = ind.col +(mode == "right"?1:-1);
			else if(mode == "top" )
				ind.row = ind.col = 0;
			else if(mode == "bottom"){
				ind.row = this._viewobj.lastChild.querySelectorAll(".webix_color_row").length-1;
				ind.col = this._viewobj.lastChild.childNodes[ind.row].childNodes.length-1;
			}
			ind.row = Math.max(ind.row, 0);
			if(ind.row>=0)
				cell = this._viewobj.lastChild.childNodes[ind.row].childNodes[ind.col];
			if(cell){
				value =  cell.getAttribute("webix_val");
				this.setValue(value);
				this.callEvent("onSelect", [this._settings.value]);

				if(focus !==false){
					var sel = this._viewobj.querySelector("div[tabindex='0']");
					if(sel)  sel.focus();
				}
			}
		}
	},

	render:function(){
		if(!this.isVisible(this._settings.id))
			return;

		if(!this._settings.palette)
			this._initPalette(this._settings);
		var palette = this._settings.palette;

		this.callEvent("onBeforeRender",[]);
		var config = this._settings,
			itemTpl = template("<div role='gridcell' tabindex='-1' aria-label=\"{obj.val}\" style=\"width:{obj.width}px;height:{obj.height}px;\" webix_val=\"{obj.val}\">" + (config.template||"") + "</div>"),
			data = {width: 0, height:0, val:0},
			width = this.$width,
			height =  this.$height,
			widths = [];

		var html = "<div class=\"webix_color_palette\"role=\"rowgroup\">";

		var firstRow = (typeof palette[0] == "object") ? palette[0] : palette;
		for(var i=0; i < firstRow.length; i++){
			widths[i] = Math.floor(width/(firstRow.length - i));
			width -= widths[i];
		}

		if(typeof palette[0] == "object"){
			for(var r=0; r < palette.length; r++){
				var cellHeight = Math.floor(height/(palette.length - r));
				height -= cellHeight;
				var row = palette[r];
				html += renderRow(row, widths, cellHeight);
			}
		}else{
			html+= renderRow(palette, widths, height);
		}

		html += "</div>";
		this._viewobj.innerHTML = html;

		function renderRow(row, widths, height){
			var rowHtml = "<div class=\"webix_color_row\" role=\"row\">";
			for(var cell = 0; cell < row.length; cell++){
				data.width = widths[cell];
				data.height = height;
				data.val = row[cell];
				rowHtml += itemTpl(data);
			}
			rowHtml += "</div>";
			return rowHtml;
		}
		this._selectBox = null;
		if(this._settings.value)
			this.$setValue(this._settings.value);
		else
			this._viewobj.lastChild.childNodes[0].childNodes[0].setAttribute("tabindex", "0");
		this.callEvent("onAfterRender",[]);
	},
	refresh:function(){ this.render(); }
};

const view = protoUI(api, KeysNavigation, base.view, EventSystem);
export default {api, view};