import fieldset from "../views/fieldset";
import {remove, create} from "../webix/html";
import {protoUI} from "../ui/core";
import {$active} from "../webix/skin";
import {isUndefined} from "../webix/helpers";


const api = {
	name:"forminput",
	defaults:{
		$cssName:"webix_forminput",
		labelWidth: 80,
		labelAlign : "left",
		// remove fieldset sizing
		paddingY:0, paddingX:0
	},
	setValue:function(value){
		if(this._body_view.setValue)
			this._body_view.setValue(value);
		else if (this._body_view.setValues)
			this._body_view.setValues(value);
	},
	focus:function(){
		if (this._body_view.focus){
			return this._body_view.focus();
		}
		return false;
	},
	getValue:function(){
		if(this._body_view.getValue)
			return this._body_view.getValue();
		else if (this._body_view.getValues)
			return this._body_view.getValues();
	},
	getBody:function(){
		return this._body_view;
	},
	$skin:function(){
		this._inputPadding = $active.inputPadding;
		this._inputSpacing = $active.inputSpacing;
		this._labelTopHeight = $active.labelTopHeight;
	},
	$init:function(obj){
		this.$ready.push(function(){
			let label = this._viewobj.firstChild.childNodes[0];
			let body = this._viewobj.firstChild.childNodes[1];

			if (!this._settings.label || (!this._settings.labelWidth && this._settings.labelPosition != "top")){
				label.style.display = "none";
				body.style.padding = "0 " + this._inputSpacing/2 + "px";
				this._settings.paddingX = this._inputSpacing;
				this._settings.paddingY = 0;
				return;
			}

			if (this._settings.labelPosition == "top"){
				label.style.lineHeight = this._labelTopHeight - this._inputPadding + "px";
				label.className += " "+this.defaults.$cssName+"_label_top";
				body.style.padding = "0 " + this._inputSpacing/2 + "px";
			}
			else label.style.width = this._settings.paddingX - this._inputSpacing/2 + "px";

			label.style.textAlign = this._settings.labelAlign;

			if(this._settings.value) this.setValue(this._settings.value);
		});

		if (obj.labelPosition != "top"){
			var lw = isUndefined(obj.labelWidth) ? this.defaults.labelWidth : obj.labelWidth;
			obj.paddingX = lw + this._inputSpacing;
		} else {
			obj.paddingY = this._labelTopHeight;
			obj.paddingX = this._inputSpacing;
		}
	},
	labelWidth_setter:function(value){
		return value ? Math.max(value, $active.dataPadding) : 0;
	},
	setBottomText: function(text) {
		var config = this._settings;
		if (typeof text != "undefined"){
			if (config.bottomLabel == text) return;
			config.bottomLabel = text;
		}
		var message = (config.invalid ? config.invalidMessage : "") || config.bottomLabel;
		if(this._invalidMessage) {
			remove(this._invalidMessage);
		}
		if(message) {
			this.$view.style.position = "relative";
			this._invalidMessage = create("div", { "class":"webix_inp_bottom_label", role:config.invalid?"alert":"", "aria-relevant":"all", style:"position:absolute; bottom:0px; padding:2px 0; background: white; left:"+(this._inputSpacing/2+(config.label?config.labelWidth:0))+"px; " }, message);
			this._viewobj.appendChild(this._invalidMessage);
		}
	}
};


const view = protoUI(api,  fieldset.view);
export default {api, view};