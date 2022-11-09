import text from "../views/text";
import {preventEvent, addCss, removeCss, pos as getPos, offset} from "../webix/html";
import {protoUI} from "../ui/core";
import {$active} from "../webix/skin";
import env from "../webix/env";
import {uid, bind, isArray, copy} from "../webix/helpers";
import {_event, event, eventRemove} from "../webix/htmlevents";
import template from "../webix/template";

const api = {
	name:"slider",
	defaults:{
		min:0,
		max:100,
		value:50,
		step:1,
		title:false,
		moveTitle:true,
		template:function(obj, common){
			const id = common._handle_id = "x" +uid();
			let html = "";
			const title = "<div class='webix_slider_title"+(obj.moveTitle?" webix_slider_move":"")+"'"+(!obj.moveTitle && obj.vertical?(" style='line-height:"+(obj.aheight-obj.inputPadding*2)+"px;'"):"")+">&nbsp;</div>";
			const left = "<div class='webix_slider_left'>&nbsp;</div>";
			const right = "<div class='webix_slider_right'></div>";
			const handle = "<div class='webix_slider_handle' "+/*@attr*/"webix_disable_drag"+"='true' role='slider' aria-label='"+obj.label+(obj.title?(" "+obj.title(obj)):"")+"' aria-valuemax='"+obj.max+"' aria-valuemin='"+obj.min+"' aria-valuenow='"+obj.value+"' tabindex='0' id='"+id+"'>&nbsp;</div>";

			if(obj.vertical) html = "<div class='webix_slider_box'>"+right+left+handle+"</div>"+title;
			else html = title+"<div class='webix_slider_box'>"+left+right+handle+"</div>";
			return common.$renderInput(obj, html, id);
		}
	},
	type_setter:function(type){
		this._viewobj.className += " webix_slider_"+type;
	},
	title_setter:function(value){
		if (typeof value == "string")
			return template(value);
		return value;
	},
	_get_slider_handle:function(){
		return this.$view.querySelector(".webix_slider_handle");
	},
	_set_inner_size:function(){
		const handle = this._get_slider_handle();
		const config = this._settings;

		if(handle){ //view is rendered for sure
			const size = config.vertical?this._content_height:this._get_input_width(config); //width or height
			let value = config.value%config.step?(Math.round(config.value/config.step)*config.step):config.value;
			const max = config.max - config.min;

			value = this._safeValue(value);
			value = config.vertical?(max-(value-config.min)):(value-config.min);

			//top or left
			let corner1 = Math.ceil((size - 2 * this._sliderPadding) * value / max);
			//bottom or right
			let corner2 = size - 2 * this._sliderPadding - corner1;

			const cornerStr = config.vertical?"top":"left";
			const sizeStr = config.vertical?"height":"width";

			handle.style[cornerStr] = this._sliderPadding + corner1 - this._sliderHandleWidth / 2 + "px";
			handle.parentNode.style[sizeStr] = size+"px";

			//1px border
			corner2 = this._safeValue(corner2, 2 * this._sliderBorder, size - this._sliderPadding * 2 - 2 * this._sliderBorder);
			corner1 = this._safeValue(corner1, 2 * this._sliderBorder, size - this._sliderPadding * 2 - 2 * this._sliderBorder);

			//width for left/top and right/bottom bars
			const part = handle.previousSibling;
			part.style[sizeStr] = corner2 + "px";
			const last = part.previousSibling;
			last.style[sizeStr] = corner1 + "px";

			this._set_title(handle, corner1, corner2, cornerStr);
		}
	},
	_set_title:function(handle, corner1, corner2, cornerStr){
		const config = this._settings;
		if (this._settings.title){
			const title = handle.parentNode[config.vertical?"nextSibling":"previousSibling"];
			title.innerHTML = this._settings.title(this._settings, this);

			if(this._settings.moveTitle){
				let pos = 0;
				if(config.vertical) pos = corner1+2 * this._sliderBorder-this._sliderHandleWidth/2;
				else{
					const half = title.clientWidth/2;
					const pos1 = half>corner1 ? (half-corner1-2*this._sliderBorder): 0;//left/top text is to large
					const pos2 = half>corner2 ? (half-corner2-2*this._sliderBorder-this._sliderHandleWidth/2): 0;//right/bottom text is too large
					pos = this._sliderPadding + corner1 - half + pos1 - pos2;
				}
				title.style[cornerStr] = pos+ "px";
			}
		}
	},
	_set_value_now:function(){
		this._get_slider_handle().setAttribute("aria-valuenow", this._settings.value);
	},
	_safeValue: function(value, min, max){
		min = min ? min : this._settings.min;
		max = max ? max : this._settings.max;
		
		return Math.min(Math.max(value, min), max);
	},
	refresh:function(){
		const handle = this._get_slider_handle();
		if (handle){
			this._set_value_now();
			if (this._settings.title)
				handle.setAttribute("aria-label", this._settings.label+" "+this._settings.title(this._settings, this));

			this._set_inner_size();
		}
	},
	$setValue:function(){
		this.refresh();
	},
	$getValue:function(){
		return this._settings.value;
	},
	$prepareValue:function(value){
		value = parseFloat(value);

		if(isNaN(value))
			value = this._settings.min;

		return this._safeValue(value);
	},
	$init:function(config){
		_event(this._viewobj, env.mouse.down, e => this._on_mouse_down_start(e, "mouse"));
		if (env.touch)
			_event(this._viewobj, env.touch.down, e => this._on_mouse_down_start(e, "touch"));

		_event( this.$view, "keydown", bind(this._handle_move_keyboard, this));
		if (config.vertical){
			config.height = config.height || $active.vSliderHeight;
			this._viewobj.className += " webix_slider_vertical";
			this._sliderPadding = $active.vSliderPadding;
		}
	},
	$skin: function(){
		text.api.$skin.call(this);

		this._sliderHandleWidth = $active.sliderHandleWidth; //8 - width of handle / 2
		this._sliderPadding = $active.sliderPadding;//10 - padding of webix_slider_box ( 20 = 10*2 )
		this._sliderBorder = $active.sliderBorder;//1px border
	},
	_handle_move_keyboard:function(e){
		const code = e.which || e.keyCode;
		const c = this._settings;
		let value = c.value;

		if(code>32 && code <41){
			preventEvent(e);

			const trg = e.target;
			const match = /webix_slider_handle_(\d)/.exec(trg.className);
			this._activeIndex = match?parseInt(match[1],10):-1;
			if(match)
				value = c.value[this._activeIndex];

			value = value<c.min ? c.min:(value>c.max ? c.max : value);
			
			if(code === 36) value = c.min;
			else if(code === 35) value = c.max;
			else{
				let inc = (code === 37 || code === 40 || code === 34) ? -1 : 1;
				if(code === 33 || code === 34 || c.step > 1)
					inc = inc * c.step;
				value = value*1 + inc;
			}

			if(match){
				const other = c.value[this._activeIndex?0:1];
				value = ((this._activeIndex && value <= other) || (!this._activeIndex && value >= other )) ? other : value;
			}

			if(value >= c.min && value <= c.max){
				if(match){
					const temp =[];
					for(let i = 0; i < c.value.length; i++)
						temp[i] = i === this._activeIndex ? value : c.value[i];
					value = temp;
				}
				this.setValue(value, "user");
				this._activeIndex = -1;
			}
		}
	},
	_on_mouse_down_start:function(e, pointer){
		const config = this._settings;
		if (config.disabled || config.readonly) return;

		const trg = e.target;
		if (this._mouse_down_process)
			this._mouse_down_process(e);

		let value = config.value;
		if (isArray(value)) value = copy(value);

		this._start_value = value;
		if (trg.className.indexOf("webix_slider") !== -1)
			config.value = this._get_value_from_event(e);

		const passive = (pointer === "touch") ? { passive:false } : null;
		this._handle_drag_events = [
			event(document.body, env[pointer].move, e => this._handle_move_process(e, pointer), passive),
			event(document, env[pointer].up, () => this._handle_move_stop()),
		];
		addCss(document.body,"webix_noselect");
	},
	_handle_move_stop:function(){
		//detach event handlers
		eventRemove(this._handle_drag_events[0]);
		eventRemove(this._handle_drag_events[1]);
		this._handle_drag_events = null;

		let value = this._settings.value;
		if (isArray(value)) value = copy(value);

		this._settings.value = this._start_value;
		this.setValue(value, "user");

		this._get_slider_handle(this._activeIndex).focus();
		this._activeIndex = -1;

		removeCss(document.body, "webix_noselect");
	},
	_handle_move_process:function(e, pointer){
		this._settings.value = this._get_value_from_event(e);
		this.refresh();
		this.callEvent("onSliderDrag", []);

		if (pointer === "touch") preventEvent(e);
	},
	_get_value_from_event:function(e){
		const ax = this._settings.vertical ? "y" : "x";
		const pos = getPos(e)[ax];
		return this._get_value_from_pos(pos);
	},
	_get_value_from_pos:function(pos){
		const config = this._settings;
		const max = config.max - config.min;
		const ax = config.vertical ? "y" : "x";

		//top or left depending on slider type
		const corner = offset(this._get_slider_handle().parentNode)[ax] + this._sliderPadding;
		//height or width depending on slider type
		const size = (config.vertical?this._content_height:this._get_input_width(config))-2*this._sliderPadding;

		let newvalue = (size ? (pos-corner) * max / size : 0);
		if(config.vertical)
			newvalue = max-newvalue;
		newvalue = Math.round((newvalue + 1*config.min) / config.step) * config.step;
		return this._safeValue(newvalue);
	},
	_init_onchange:function(){} //need not ui.text logic
};

const view = protoUI(api, text.view);
export default {api, view};
