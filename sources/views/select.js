import {protoUI, $$} from "../ui/core";
import {uid} from "../webix/helpers";
import {_event} from "../webix/htmlevents";
import {preventEvent} from "../webix/html";
import env from "../webix/env";

import text from "./text";
import DataCollection from "../core/datacollection";

const api = {
	name:"select",
	defaults:{
		template:function(obj,common){
			const id = "x"+uid();
			let html = common._baseInputHTML("select")+"id='"+id+"' style='width:"+common._get_input_width(obj)+"px;'>";

			const optview = $$(obj.options);
			if (optview && optview.data && optview.data.each){
				optview.data.each(function(option){
					html+="<option"+((option.id == obj.value)?" selected='true'":"")+" value='"+option.id+"'>"+option.value+"</option>";
				});
			} else {
				const options = common._check_options(obj.options);
				for (let i=0; i<options.length; i++)
					html+="<option"+((options[i].id == obj.value)?" selected='true'":"")+" value='"+options[i].id+"'>"+options[i].value+"</option>";
			}
			html += "</select>";
			return common.$renderInput(obj, html, id);
		}
	},
	$init:function(){
		this.attachEvent("onAfterRender", function(){
			const input = this.getInputNode();
			_event(input, env.mouse.down, e => this._checkReadOnly(e));
			_event(input, "keydown", e => this._checkReadOnly(e, (e.which || e.keyCode) == 9));
			if (env.touch)
				_event(input, env.touch.down, e => this._checkReadOnly(e));
		});
	},
	_checkReadOnly:function(e, tab){
		if(!tab && this._settings.readonly)
			preventEvent(e);
	},
	options_setter:function(value){
		if (value){
			if (typeof value == "string"){
				this._loading_data = true;
				value = new DataCollection({url:value});
				value.data.attachEvent("onStoreLoad", ()=>{
					delete this._loading_data;
					this.refresh();
				});
			}
			return value;
		}
	},
	getValue:function(){
		return this._loading_data ? this._settings.value : text.api.getValue.call(this);
	},
	$renderIcon:function(){
		return "";
	},
	//get input element
	getInputNode: function() {
		return this._dataobj.getElementsByTagName("select")[0];
	}
};

const view = protoUI(api, text.view);
export default {api, view};