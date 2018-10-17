import {protoUI, ui, $$} from "../ui/core";
import {$active} from "../webix/skin";
import {isUndefined, isArray, extend, uid} from "../webix/helpers";
import {_event} from "../webix/htmlevents";
import {assert} from "../webix/debug";
import template from "../webix/template";

import i18n from "../webix/i18n";
import rules from "../webix/rules";
import button from "./button";
import base from "../views/view";

import TextPattern from "../core/textpattern";

const api = {
	name:"text",
	$allowsClear:true,
	_init_onchange:function(){
		if (this.$allowsClear){
			//attach onChange handler only for controls which do not manage blur on their own
			//for example - combo
			if (!this._onBlur)
				_event(this.getInputNode(), "change", this._applyChanges, {bind:this});
			if (this._settings.suggest)
				$$(this._settings.suggest).linkInput(this);
		}
	},
	_applyChanges: function(){
		var newvalue = this.getValue();

		if (newvalue != this._settings.value)
			this.setValue(newvalue, true);
		else if (this._custom_format){
			//controls with post formating, we need to repaint value
			this.$setValue(newvalue);
		}
	},
	$skin:function(){
		this.defaults.height = $active.inputHeight;
		this.defaults.inputPadding = $active.inputPadding;
		this._inputSpacing = $active.inputSpacing;
	},
	$init:function(config){
		if (config.labelPosition == "top")
			if (isUndefined(config.height) && this.defaults.height)  // textarea
				config.height = this.defaults.height + this._labelTopHeight;

		//suggest reference for destructor
		this._destroy_with_me = [];

		this.attachEvent("onAfterRender", this._init_onchange);
		this.attachEvent("onBlur", function(){
			if(this._onBlur) this._onBlur();
		});
	},
	$renderIcon:function(){
		var config = this._settings;
		if (config.icon){
			var height = config.aheight - 2*config.inputPadding,
				padding = (height - 18)/2 -1,
				aria = this.addSection ? "role='button' tabindex='0' aria-label='"+(i18n.aria["multitext"+(config.mode || "")+"Section"])+"'": "";
			return "<span style='height:"+(height-padding)+"px;padding-top:"+padding+"px;' class='webix_input_icon "+config.icon+"' "+aria+"></span>";
		}
		return "";
	},
	relatedView_setter:function(value){
		this.attachEvent("onChange", function(){
			var value = this.getValue();
			var mode = this._settings.relatedAction;
			var viewid = this._settings.relatedView;
			var view = $$(viewid);
			if (!view){
				var top = this.getTopParentView();
				if (top && top.$$)
					view = top.$$(viewid);
			}

			assert(view, "Invalid relatedView: "+viewid);

			if (mode == "enable"){
				if (value) view.enable(); else view.disable();
			} else {
				if (value) view.show(); else view.hide();
			}
		});
		return value;
	},
	validateEvent_setter:function(value){
		if (value == "blur")
			this.attachEvent("onBlur", this.validate);

		if (value == "key")
			this.attachEvent("onTimedKeyPress", this.validate);

		return value;
	},
	validate:function(){
		var rule = this._settings.validate;
		if (!rule && this._settings.required)
			rule = rules.isNotEmpty;

		var form =this.getFormView();
		var name = this._settings.name;
		var value = this.getValue();
		var data = {}; data[name] = value;

		assert(form, "Validation works only for fields in the form");
		assert(name, "Validation works only for fields with name");

		if (rule && !form._validate(rule, value, data, name))
			return false;
		return true;
	},
	bottomLabel_setter: function(value){
		if(!this._settings.bottomPadding)
			this._settings.bottomPadding = 18;
		return value;
	},
	_getInvalidText: function(){
		var text = this._settings.invalidMessage;
		if(typeof text == "function"){
			text.call(this);
		}
		return text;
	},
	setBottomText: function(text, height){
		var config = this._settings;
		if (typeof text != "undefined"){
			if (config.bottomLabel == text) return;
			config.bottomLabel = text;
		}

		var message = (config.invalid ? config.invalidMessage : "" ) || config.bottomLabel;
		if (!message && !config.bottomPadding)
			config.inputHeight = 0;
		if (message && !config.bottomPadding){
			this._restorePadding = 1;
			config.bottomPadding = config.bottomPadding || height || 18;	
			this.render();
			this.resize();
		} else if (!message && this._restorePadding){
			config.bottomPadding = this._restorePadding = 0;
			//textarea
			if (!config.height)
				this.render();
			this.resize();
		} else
			this.render();
	},
	$getSize: function(){
		var sizes = base.api.$getSize.apply(this,arguments);
		var heightInc = this.config.bottomPadding;
		if(heightInc){
			sizes[2] += heightInc;
			sizes[3] += heightInc;
		}
		return sizes;
	},
	$setSize:function(x,y){
		var config = this._settings;

		if(base.api.$setSize.call(this,x,y)){
			if (!x || !y) return;

			if (config.labelPosition == "top"){
				// textarea
				if (!config.inputHeight)
					this._inputHeight = this._content_height - this._labelTopHeight - (this.config.bottomPadding||0);
				config.labelWidth = 0;
			} else if (config.bottomPadding){
				config.inputHeight = this._content_height - this.config.bottomPadding;
			}
			this.render();
		}
	},
	_get_input_width: function(config){
		var width = (this._input_width||0)-(config.label?this._settings.labelWidth:0) - this._inputSpacing - (config.iconWidth || 0);

		//prevent js error in IE
		return (width < 0)?0:width;
	},
	_render_div_block:function(obj, common){
		var id = "x"+uid();
		var width = common._get_input_width(obj);
		var inputAlign = obj.inputAlign || "left";
		var height = this._settings.aheight - 2*$active.inputPadding -2*this._borderWidth;
		var text = (obj.text||obj.value||this._get_div_placeholder(obj));
		var html = "<div class='webix_inp_static' role='combobox' aria-label='"+template.escape(obj.label)+"' tabindex='0'"+(obj.readonly?" aria-readonly='true'":"")+(obj.invalid?"aria-invalid='true'":"")+" onclick='' style='line-height:"+height+"px;width: " + width + "px; text-align: " + inputAlign + ";' >"+ text +"</div>";
		return common.$renderInput(obj, html, id);
	},
	_baseInputHTML:function(tag){
		var html = "<"+tag+(this._settings.placeholder?" placeholder='"+this._settings.placeholder+"' ":" ");
		if (this._settings.readonly)
			html += "readonly='true' aria-readonly=''";
		if(this._settings.required)
			html += "aria-required='true'";
		if(this._settings.invalid)
			html += "aria-invalid='true'";

		var attrs = this._settings.attributes;
		if (attrs)
			for(var prop in attrs)
				html += prop+"='"+attrs[prop]+"' ";
		return html;
	},
	$renderLabel: function(config, id){
		var labelAlign = (config.labelAlign||"left");
		var top = this._settings.labelPosition == "top";
		var labelTop =  top?"display:block;":("width: " + this._settings.labelWidth + "px;");
		var label = "";
		var labelHeight = top?this._labelTopHeight-2*this._borderWidth:( this._settings.aheight - 2*this._settings.inputPadding);
		if (config.label)
			label = "<label style='"+labelTop+"text-align: " + labelAlign + ";line-height:"+labelHeight+"px;' onclick='' for='"+id+"' class='webix_inp_"+(top?"top_":"")+"label "+(config.required?"webix_required":"")+"'>" + (config.label||"") + "</label>";
		return label;
	},
	$renderInput: function(config, div_start, id) {
		var inputAlign = (config.inputAlign||"left");
		var top = (config.labelPosition == "top");
		var inputWidth = this._get_input_width(config);

		id = id||uid();

		var label = this.$renderLabel(config,id);

		var html = "";
		if(div_start){
			html += div_start;
		} else {
			var value =  template.escape(config.text || this._pattern(config.value) );
			html += this._baseInputHTML("input")+"id='" + id + "' type='"+(config.type||this.name)+"'"+(config.editable?" role='combobox'":"")+" value='" + value + "' style='width: " + inputWidth + "px; text-align: " + inputAlign + ";'";
			var attrs = config.attributes;
			if (attrs)
				for(var prop in attrs)
					html += " "+prop+"='"+attrs[prop]+"'";
			html += " />";
		}
		var icon = this.$renderIcon?this.$renderIcon(config):"";
		html += icon;

		var result = "";
		//label position, top or left
		if (top)
			result = label+"<div class='webix_el_box' style='width:"+config.awidth+"px; height:"+config.aheight+"px'>"+html+"</div>";
		else
			result = "<div class='webix_el_box' style='width:"+config.awidth+"px; height:"+config.aheight+"px'>"+label+html+"</div>";


		//bottom message width
		var padding = config.awidth-inputWidth-$active.inputPadding*2;
		//bottom message text
		var message = (config.invalid ? config.invalidMessage : "") || config.bottomLabel;
		if (message)
			result +=  "<div class='webix_inp_bottom_label'"+(config.invalid?"role='alert' aria-relevant='all'":"")+" style='width:"+(inputWidth||config.awidth)+"px;margin-left:"+Math.max(padding,$active.inputPadding)+"px;'>"+message+"</div>";

		return result;
	},
	defaults:{
		template:function(obj, common){
			return common.$renderInput(obj);
		},
		label:"",
		labelWidth:80
	},
	type_setter:function(value){ return value; },
	_set_inner_size:false,
	$setValue:function(value){
		this.getInputNode().value = this._pattern(value);
	},
	$getValue:function(){
		return this._pattern(this.getInputNode().value, false);
	},
	suggest_setter:function(value){
		if (value){
			assert(value !== true, "suggest options can't be set as true, data need to be provided instead");

			if (typeof value == "string"){
				var attempt = $$(value);
				if (attempt) 
					return $$(value)._settings.id;

				value = { body: { url:value , dataFeed :value } };
			} else if(value.getItem)
				value = { body: {data:value}};
			else if (isArray(value))
				value = { body: { data: this._check_options(value) } };
			else if (!value.body)
				value.body = {};

			extend(value, { view:"suggest" });

			var view = ui(value);
			this._destroy_with_me.push(view);
			return view._settings.id;
		}
		return false;
	}
};

const view = protoUI(api, TextPattern, button.view);
export default {api, view};