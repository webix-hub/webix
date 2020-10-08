import {pos as htmlPos, addCss, removeCss, offset} from "../webix/html";
import {protoUI} from "../ui/core";
import {_event, event, eventRemove} from "../webix/htmlevents";
import {$active, $name} from "../webix/skin";
import i18n from "../webix/i18n";
import env from "../webix/env";

import color from "../webix/color";

import EventSystem from "../core/eventsystem";
import base from "../views/view";

const api = {
	name:"colorselect",
	defaults:{
		width: 260,
		height: 250,
		value:"#751FE0"
	},
	$init:function(config){
		this._hValue = this._sValue = this._vValue = 0;
		this._cs1 = 10; //small circle
		this._cs2 = 16; //big circle

		this.attachEvent("onAfterRender", function(){
			//nodes and params
			this._colorCircle = this._viewobj.querySelector(".webix_color_circle");
			this._colorLineCircle = this._viewobj.querySelector(".webix_color_line_circle");
			this._colorBlock = this._viewobj.querySelector(".webix_color_block");
			this._colorLine = this._viewobj.querySelector(".webix_color_line");
			this._colorOutText = this._viewobj.querySelector(".webix_color_out_text");
			this._colorOutBlock = this._viewobj.querySelector(".webix_color_out_block");

			this._offset = offset(this._colorBlock);

			//events
			if(env.touch){
				this.attachEvent("onTouchStart", (e, ctx) => {
					const css = e.target.className;
					const parent = e.target.parentNode.className;

					if(css == "webix_color_block" || parent == "webix_color_block")
						this._handle_dnd(ctx||e);
					else if(css.indexOf("webix_color_line") == 0)
						this._handle_dnd(ctx||e, true);
				});
			}
			else{
				_event(this._colorBlock, "mousedown", (e) => this._handle_dnd(e));
				_event(this._colorLine, "mousedown", (e) => this._handle_dnd(e, true));
			}
				
			_event(this._colorOutText, "change", () => this.setValue(this._colorOutText.value));
			if(config.button)
				_event(this._viewobj.querySelector(".webix_button"), "click", () => {
					this.callEvent("onColorSelect", [this.getValue()]);
				});
		});
	},
	$skin:function(){
		if($name == "compact" || $name == "mini")
			this._inpHeight = 24;
		else
			this._inpHeight = 32;
	},
	$setSize:function(x,y){
		if(base.api.$setSize.call(this,x,y)){
			this.render();
		}
	},
	getValue:function(){
		return this._settings.value;
	},
	$prepareValue:function(value){
		value = value ? value.toString(16) : "";
		if (value && value.charAt(0) != "#" && /^[0-9a-fA-F]+$/.test(value))
			value = "#" + value;
		return value;
	},
	value_setter:function(value){
		return this.$prepareValue(value);
	},
	setValue:function(value){
		value = this.$prepareValue(value);
		const oldvalue = this._settings.value;
		if(oldvalue != value){
			this._settings.value = value;
			this.$setValue(value);
			this.callEvent("onChange", [value, oldvalue]);
		}
	},
	$setValue:function(value){
		if(this.isVisible(this._settings.id)){
			const rgb = color.toRgb(value);
			const hsv = color.rgbToHsv(...rgb);

			this._hValue = hsv[0];
			this._sValue = hsv[1];
			this._vValue = hsv[2];

			const left = (this._hValue*this._offset.width)/360;
			this._colorLineCircle.style.left = left-this._cs2/2+"px";

			const x = this._sValue*(this._offset.width-this._cs1);
			const y = Math.abs((this._offset.height-this._cs1)*(this._vValue-1));

			this._colorCircle.style.left = x+"px";
			this._colorCircle.style.top = y+"px";
			this._update_circle_color();

			this._setOutColors(rgb, value);
			this._setBlockColors();
		}
	},
	_setOutColors:function(rgb, hex){
		if(!rgb) rgb = color.hsvToRgb(this._hValue, this._sValue, this._vValue);
		if(!hex) hex = "#"+color.rgbToHex(rgb);
		this._colorOutBlock.style.backgroundColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
		this._colorOutText.value = hex.toUpperCase();

		this._current_value = hex;
	},
	_setBlockColors:function(){
		const rgb = color.hsvToRgb(this._hValue, 1, 1);
		const rgbStr = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
		this._colorLineCircle.style.backgroundColor = rgbStr;
		this._colorBlock.style.backgroundColor = rgbStr;
	},

	// dragging to set value
	_move_block: function (e){
		if(e.target.className == "webix_color_circle" && !env.touch)
			return;

		const pos = env.touch ? {x: e.x - this._cs1/2, y: e.y - this._cs1/2} : htmlPos(e);

		let x = pos.x - this._offset.x;
		let y = pos.y - this._offset.y;

		x = Math.max(Math.min(x, this._offset.width-this._cs1), 0);
		y = Math.max(Math.min(y, this._offset.height-this._cs1), 0);

		this._colorCircle.style.left = x+"px";
		this._colorCircle.style.top = y+"px";

		const pxX = (this._offset.width - this._cs1)/100;
		const pxY = (this._offset.height - this._cs1)/100;

		const s = Math.ceil(x/pxX)/100;
		const v = Math.ceil(Math.abs(y/pxY-100))/100;

		this._sValue = s;
		this._vValue = v;

		this._update_circle_color();

		this._setOutColors();
	},
	_update_circle_color: function(){
		if(this._vValue>0.7 && this._sValue<0.3) this._colorCircle.style.borderColor = "#475466";
		else this._colorCircle.style.borderColor = "#fff";
	},
	_move_line:function (e, move){
		if(e.target.className == "webix_color_line_circle" && !move)
			return;

		const half = this._cs2/2;
		let left =  (env.touch ? e.x : htmlPos(e).x) - this._offset.x;
		left = Math.max(Math.min(left, this._offset.width-half), 0-half);
		this._colorLineCircle.style.left = left+"px";

		const h =  Math.round(left*360/this._offset.width);
		this._hValue = Math.min(Math.max(h,0), 360);
		this._setOutColors();
		this._setBlockColors();
	},
	_handle_dnd:function(e, line){
		if(line) this._move_line(e);
		else this._move_block(e);

		if(env.touch){
			this._handle_drag_events = [
				this.attachEvent("onTouchMove", (e, ctx) => this._handle_move_process(ctx||e, line)),
				this.attachEvent("onTouchEnd", () => this._handle_move_stop())
			];
		}
		else{
			this._handle_drag_events = [
				event(document.body, "mousemove", (e) => this._handle_move_process(e, line)),
				event(window, "mouseup", () => this._handle_move_stop())
			];
		}
		addCss(document.body,"webix_noselect");
	},
	_handle_move_process:function(e, line){
		if(line) this._move_line(e, true);
		else this._move_block(e);
	},
	_handle_move_stop:function(){
		//detach event handlers
		if(this._handle_drag_events){
			if(env.touch){
				this.detachEvent(this._handle_drag_events[0]);
				this.detachEvent(this._handle_drag_events[1]);
			}
			else{
				eventRemove(this._handle_drag_events[0]);
				eventRemove(this._handle_drag_events[1]);
			}
			this._handle_drag_events = null;
			this.setValue(this._current_value);
		}
		removeCss(document.body,"webix_noselect");
	},

	render:function(){
		if(!this.isVisible(this._settings.id))
			return;

		this.callEvent("onBeforeRender",[]);

		const inpWidth = (this.$width - $active.dataPadding*3)/2;
		//24 paddings, 32 color line, 12 padding
		const bHeight = this.$height - 24 - 32 - this._inpHeight - (this._settings.button ? (this._inpHeight+12) : 0);
		let html = "<div class=\"webix_color_area\">";
		html += `
			<div class="webix_color_block" style="height:${bHeight}px;">
				<div class="webix_color_circle" id="circle"></div>
			</div>
			<div class="webix_color_line">
				<div class="webix_color_line_circle"></div>
			</div>
			<div class="webix_color_out">
				<div style="width:${inpWidth}px" class="webix_color_out_block"></div>
				<input type="text" style="width:${inpWidth}px" class="webix_color_out_text"></input>
			</div>
		`;
		if(this._settings.button)
			html += `<div class='webix_secondary'><button class="webix_button webix_secondary">${i18n.combo.select}</button></div>`;

		html += "</div>";

		this._viewobj.innerHTML = html;
		
		this.callEvent("onAfterRender",[]);
		this.$setValue(this._settings.value, true);
	},
	refresh:function(){ this.render(); }
};

const view = protoUI(api, base.view, EventSystem);
export default {api, view};