import {protoUI} from "../ui/core";
import {uid} from "../webix/helpers";
import {_event} from "../webix/htmlevents";
import template from "../webix/template";

import text from "./text";
import button from "./button";

import i18n from "../webix/i18n";


const api = {
	name:"counter",
	defaults:{
		template:function(config, common){
			var value = config.value;

			var id = "x"+uid();
			var html = "<div role='spinbutton' aria-label='"+template.escape(config.label)+"' aria-valuemin='"+config.min+"' aria-valuemax='"+config.max+"' aria-valuenow='"+config.value+"' class='webix_el_group' style='width:"+common._get_input_width(config)+"px'>";
			html +=  "<button type='button' class='webix_inp_counter_prev' tabindex='-1' aria-label='"+i18n.aria.decreaseValue+"'>-</button>";
			html += common._baseInputHTML("input")+" id='"+id+"' type='text' class='webix_inp_counter_value' aria-live='assertive'"+" value='"+value+"'></input>";
			html += "<button type='button' class='webix_inp_counter_next' tabindex='-1' aria-label='"+i18n.aria.increaseValue+"'>+</button></div>";
			return common.$renderInput(config, html, id);
		},
		min:0,
		max:Infinity,
		value:0,
		step:1
	},
	$init:function(){
		_event(this.$view, "keydown", this._keyshift, {bind:this});
	},
	_keyshift:function(e){
		var code = e.which || e.keyCode, c = this._settings, value = this.getValue();

		if(code>32 && code <41){
			if(code === 36) value = c.min;
			else if(code === 35) value = c.max === Infinity? 1000000 :c.max;
			else if(code === 33) this.next();
			else if(code === 34) this.prev();
			else value = value+(code === 37 || code ===40?-1:1);
			
			if(code>34 && value>=c.min && value<=c.max)
				this.setValue(value);
		}
	},
	$setValue:function(value){
		this.getInputNode().value = value;
	},
	$prepareValue:function(value){
		value = parseFloat(value);
		return isNaN(value)?0:value;
	},
	value_setter:function(value){
		return this.$prepareValue(value);
	},
	getInputNode:function(){
		return this._dataobj.getElementsByTagName("input")[0];
	},
	getValue:function(){
		return  button.api.getValue.apply(this,arguments)*1;
	},
	next:function(step){
		step = 1*( step || this._settings.step );
		this.shift(step);
	},
	prev:function(step){
		step = (-1)*( step || this._settings.step );
		this.shift(step);
	},
	shift:function(step){
		var min = this._settings.min;
		var max = this._settings.max;

		var new_value = this.getValue() + step;
		if (new_value >= min && new_value <= max)
			this.setValue(new_value);
	}
};

const view = protoUI(api, text.view);
export default {api, view};