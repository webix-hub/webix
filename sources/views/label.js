import {getTextSize} from "../webix/html";
import {protoUI} from "../ui/core";
import {$active} from "../webix/skin";

import button from "../views/button";

const api = {
	name:"label",
	defaults:{
		template:"<div style='height:100%;line-height:#cheight#px'>#label#</div>"
	},
	$skin:function(){
		this.defaults.height = $active.inputHeight;
	},
	focus:function(){ return false; },
	_getBox:function(){
		return this._dataobj.firstChild;
	},
	setHTML:function(html){
		this._settings.template = function(){ return html; };
		this.refresh();
	},
	setValue: function(value){
		this._settings.label = value;
		button.api.setValue.apply(this,arguments);
	},
	$setValue:function(value){
		this._dataobj.firstChild.innerHTML = value;
	},
	_set_inner_size:function(){},
	_calc_size:function(config){
		config = config || this._settings;
		if (config.autowidth)
			config.width = getTextSize((config.value||config.label), "webix_el_label").width;
	}
};

const view = protoUI(api, button.view);
export default {api, view};