import {protoUI, $$} from "../ui/core";
import {$active} from "../webix/skin";
import {isUndefined, bind} from "../webix/helpers";
import {assert} from "../webix/debug";

import text from "./text";


const api = {
	name:"richselect",
	defaults:{
		template:function(obj,common){
			return common._render_div_block(obj, common);
		},
		popupWidth:200,
		icon: "wxi-menu-down"
	},
	_onBlur:function(){
		if (this._settings.text == this.getText() || (isUndefined(this._settings.text) && !this.getText()))
			return;

		var suggest = this.getPopup(),
			nodeValue = this.getInputNode().value,
			value = suggest.getSuggestion(nodeValue),
			oldvalue = this.getValue();

		//non-empty value that differs from old value and matches filtering rule
		if (value && value !=oldvalue && !(nodeValue==="" && suggest.getItemText(value)!==""))
			this.setValue(value);
		else if(nodeValue==="")
			this.setValue("");
		else if(this._revertValue)
			this._revertValue();
	},
	suggest_setter:function(value){
		return this.options_setter(value);
	},
	options_setter:function(value){
		value = this._suggest_config ? this._suggest_config(value) : value;
		var suggest = (this._settings.popup = this._settings.suggest = text.api.suggest_setter.call(this, value));
		var list = $$(suggest).getList();
		if (list)
			list.attachEvent("onAfterLoad", bind(this._reset_value, this));

		return suggest;
	},
	getList: function(){
		var suggest = $$(this._settings.suggest);
		assert(suggest, "Input doesn't have a list");
		return suggest.getList();
	},
	_pattern :function(value){ return value; },
	_reset_value:function(){
		var value = this._settings.value;
		//this._dataobj.firstChild - check that input is already rendered, as in IE11 it can be destroy during parent repainting
		if(!isUndefined(value) && !this.getPopup().isVisible() && !this._settings.text && this._dataobj.firstChild)
			this.$setValue(value);
	},
	$skin:function(){
		this.defaults.inputPadding = $active.inputPadding;
	},
	$render:function(obj){
		if (isUndefined(obj.value)) return;
		this.$setValue(obj.value);
	},
	getInputNode: function(){
		return this._dataobj.getElementsByTagName("DIV")[1];
	},
	getPopup: function(){
		return $$(this._settings.popup);
	},
	getText:function(){
		var value = this._settings.value,
			node = this.getInputNode();
		if(!node)
			return value?this.getPopup().getItemText(value):"";
		if (typeof node.value == "undefined"){
			if (node.firstChild && node.firstChild.className === "webix_placeholder")
				return "";
			return node.innerHTML;
		}
		return node.value;
	},
	$setValue:function(value){
		if (!this._rendered_input) return;

		var text = value;
		var popup = this.getPopup();

		if (popup)
			text = this.getPopup().getItemText(value);

		if (!text && value && value.id){ //add new value
			const popup = this.getPopup();
			const list = popup.getList();

			// add new item only when item with such id doesn't exists yet
			const exists = list.exists(value.id);
			if (!exists) list.add(value);

			text = popup.getItemText(value.id);

			// in case of dynamic list, we can't add extra items
			// to not interfere with dynamic loading
			if (list._settings.dynamic && !exists)
				list.remove(value.id);

			this._settings.value = value.id;
		}

		var node = this.getInputNode();

		if (isUndefined(node.value))
			node.innerHTML = text || this._get_div_placeholder();
		else 
			node.value = text = text.replace(/<[^>]*>/g,"");

		this._settings.text = text;
	},
	getValue:function(){
		return this._settings.value||"";
	}
};

const view = protoUI(api, text.view);
export default {api, view};