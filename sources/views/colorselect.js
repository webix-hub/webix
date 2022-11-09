import {pos as getPos, addCss, removeCss, offset, preventEvent} from "../webix/html";
import {protoUI} from "../ui/core";
import {_event, event, eventRemove} from "../webix/htmlevents";
import {$active} from "../webix/skin";
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
	$init:function(){
		this._hValue = this._sValue = this._vValue = 0;

		_event(this.$view, "keydown", (e) => this._handle_move_keyboard(e));
		this.attachEvent("onAfterRender", function(){
			_event(this._colorBlock, env.mouse.down, (e) => this._handle_dnd(e, "mouse"));
			_event(this._colorLine, env.mouse.down, (e) => this._handle_dnd(e, "mouse", true));
			if (env.touch) {
				_event(this._colorBlock, env.touch.down, (e) => this._handle_dnd(e, "touch"));
				_event(this._colorLine, env.touch.down, (e) => this._handle_dnd(e, "touch", true));
			}
			_event(this._colorOutText, "change", () => this.setValue(this._colorOutText.value, "user"));
			if (this._settings.button)
				_event(this._viewobj.querySelector(".webix_button"), "click", () => {
					this.callEvent("onColorSelect", [this.getValue()]);
				});
		});
		this.attachEvent("onDestruct", function(){
			this._colorCircle = this._colorLineCircle = this._colorBlock = null;
			this._colorLine = this._colorOutText = this._colorOutBlock = this._offset = null;
		});
	},
	$skin:function(){
		this._inpHeight = $active.inputHeight - 2*$active.inputPadding;
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
	setValue:function(value, config){
		value = this.$prepareValue(value);
		const oldvalue = this._settings.value;

		if (oldvalue != value){
			this._settings.value = value;
			this.$setValue(value);
			this.callEvent("onChange", [value, oldvalue, config]);
		}
	},
	$setValue:function(value){
		if(this.isVisible(this._settings.id)){
			const rgb = color.toRgb(value);

			if(value !==this._current_value){//set by API
				const hsv = color.rgbToHsv(...rgb);
				this._hValue = hsv[0];
				this._sValue = hsv[1];
				this._vValue = hsv[2];
			}

			const left = (this._hValue*this._offset.width)/359;
			this._colorLineCircle.style.left = left+"px";

			const x = this._sValue*(this._offset.width);
			const y = Math.abs((this._offset.height)*(this._vValue-1));

			this._colorCircle.style.left = Math.max(Math.min(x, this._offset.width), 0)+"px";
			this._colorCircle.style.top = Math.max(Math.min(y, this._offset.height), 0)+"px";

			this._colorCircle.setAttribute("aria-valuetext", value);
			this._colorLineCircle.setAttribute("aria-valuetext", value);

			this._setOutColors(rgb, value);
			this._setBlockColors();
		}
	},
	_setOutColors:function(rgb, hex){
		if(!rgb) rgb = color.hsvToRgb(this._hValue, this._sValue, this._vValue);
		if(!hex) hex = "#"+color.rgbToHex(rgb);

		const bgColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
		this._colorCircle.style.backgroundColor = bgColor;
		this._colorOutBlock.style.backgroundColor = bgColor;
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
	_move_block:function(e){
		const pos = getPos(e);

		let x = pos.x - this._offset.x;
		let y = pos.y - this._offset.y;

		x = Math.max(Math.min(x, this._offset.width), 0);
		y = Math.max(Math.min(y, this._offset.height), 0);

		this._colorCircle.style.left = x+"px";
		this._colorCircle.style.top = y+"px";

		const pxX = (this._offset.width)/100;
		const pxY = (this._offset.height)/100;

		const s = Math.ceil(x/pxX)/100;
		const v = Math.ceil(Math.abs(y/pxY-100))/100;

		this._sValue = s;
		this._vValue = v;

		this._setOutColors();
	},
	_move_line:function(e){
		const pos = getPos(e);

		let x = pos.x - this._offset.x;
		x = Math.max(Math.min(x, this._offset.width), 0);

		this._colorLineCircle.style.left = x+"px";

		const h =  Math.round(x*359/this._offset.width);
		this._hValue = Math.max(Math.min(h, 359), 0);

		this._setOutColors();
		this._setBlockColors();
	},
	_handle_dnd:function(e, pointer, line){
		this._offset = offset(this._colorBlock);

		if (line){
			addCss(this._colorLine, "webix_color_area_active");
			this._move_line(e);
		} else {
			addCss(this._colorBlock, "webix_color_area_active");
			this._move_block(e);
		}

		const passive = (pointer === "touch") ? { passive:false } : null;
		this._handle_drag_events = [
			event(document.body, env[pointer].move, e => this._handle_move_process(e, pointer, line), passive),
			event(document, env[pointer].up, () => this._handle_move_stop(line))
		];
		addCss(document.body,"webix_noselect");
	},
	_handle_move_process:function(e, pointer, line){
		if (line) this._move_line(e);
		else this._move_block(e);

		if (pointer === "touch") preventEvent(e);
	},
	_handle_move_stop:function(line){
		//detach event handlers
		eventRemove(this._handle_drag_events[0]);
		eventRemove(this._handle_drag_events[1]);
		this._handle_drag_events = null;

		this.setValue(this._current_value, "user");

		if (line){
			removeCss(this._colorLine, "webix_color_area_active");
			this._colorLineCircle.focus();
		} else {
			removeCss(this._colorBlock, "webix_color_area_active");
			this._colorCircle.focus();
		}
		removeCss(document.body, "webix_noselect");
	},
	_move_block_value(val, inc){
		return Math.min(Math.max(val+inc/100, 0), 1);
	},
	_move_line_value(val, inc){
		return Math.min(Math.max(val+inc, 0), 359);
	},
	_handle_move_keyboard:function(e){
		const code = e.which || e.keyCode;

		if(code>32 && code <41){
			const match =  /webix_color_(\w*)circle/.exec(e.target.className);
			if(!match) return;
			preventEvent(e);

			if(match[1].length){ //line
				if(code === 36) this._hValue = 0;
				else if(code === 35) this._hValue = 359;
				else{
					let inc = (code === 37 || code === 40 || code === 34) ? -1 : 1;
					this._hValue = this._move_line_value(this._hValue, inc);
				}
				this._setBlockColors();
			} else {
				if(code === 36){
					this._sValue = 0;
					this._vValue = 1;
				}
				else if(code === 35) 
					this._sValue = this._vValue = 1;
				else if(code === 39 || code === 37){
					let inc = code === 39 ? 1: -1;
					this._sValue = this._move_block_value(this._sValue, inc);
				}
				else{
					let inc = (code === 33 || code === 38) ? 1 : -1;
					this._vValue = this._move_block_value(this._vValue, inc);
				}
			}
			this._setOutColors();

			//paint value, black colors may have a bigger step
			if(this._settings.value == this._current_value)
				this.$setValue(this._current_value);
			else
				this.setValue(this._current_value, "user");
		}
	},
	moveSelection:function(mode){
		if(mode == "pgup" || mode == "pgdown"){ //line
			let inc = mode === "pgup" ? -1 : 1;
			this._hValue = this._move_line_value(this._hValue, inc);
			this._setBlockColors();
		}
		else if(mode !="top" && mode !=="bottom"){
			let inc = (mode == "up" || mode == "right") ? 1 : -1;
			if(mode == "down" || mode == "up")
				this._vValue = this._move_block_value(this._vValue, inc);
			else
				this._sValue = this._move_block_value(this._sValue, inc);
		}
		this._setOutColors();
		this.setValue(this._current_value, "auto");
	},
	render:function(){
		if(!this.isVisible(this._settings.id))
			return;

		this.callEvent("onBeforeRender",[]);

		const inpWidth = (this.$width - $active.dataPadding*3)/2;
		//8+14 color line, 3(or 4) data paddings 
		const bHeight = this.$height - 3*$active.dataPadding - 22 - this._inpHeight - (this._settings.button ? (this._inpHeight+$active.dataPadding) : 0);

		let html = "<div class=\"webix_color_area\">";
		html += `
			<div ${/*@attr*/"webix_disable_drag"}="true" class="webix_color_block" style="height:${bHeight}px;">
				<div class="webix_color_circle" tabindex="0" role="slider"></div>
			</div>
			<div ${/*@attr*/"webix_disable_drag"}="true" class="webix_color_line">
				<div class="webix_color_line_circle" tabindex="0" role="slider"></div>
			</div>
			<div class="webix_color_out">
				<div style="width:${inpWidth}px" class="webix_color_out_block"></div>
				<input type="text" style="width:${inpWidth}px" class="webix_color_out_text"></input>
			</div>
		`;

		if(this._settings.button)
			html += `<div class='webix_secondary'><button class="webix_button">${i18n.combo.select}</button></div>`;
		html += "</div>";

		this._viewobj.innerHTML = html;

		this._collect_vars();
		this.$setValue(this._settings.value);

		this._fix_cover();
		this.callEvent("onAfterRender",[]);
	},
	_collect_vars:function(){
		this._colorCircle = this._viewobj.querySelector(".webix_color_circle");
		this._colorLineCircle = this._viewobj.querySelector(".webix_color_line_circle");
		this._colorBlock = this._viewobj.querySelector(".webix_color_block");
		this._colorLine = this._viewobj.querySelector(".webix_color_line");
		this._colorOutText = this._viewobj.querySelector(".webix_color_out_text");
		this._colorOutBlock = this._viewobj.querySelector(".webix_color_out_block");

		this._offset = offset(this._colorBlock);
	},
	refresh:function(){ this.render(); }
};

const view = protoUI(api, base.view, EventSystem);
export default {api, view};