import {protoUI} from "../ui/core";
import {$active} from "../webix/skin";
import {uid} from "../webix/helpers";

import text from "./text";


const api = {
	name:"textarea",
	defaults:{
		template:function(obj, common){ 
			var name = obj.name || obj.id;
			var id = "x"+uid();

			var html = common._baseInputHTML("textarea")+"style='width:"+common._get_input_width(obj)+"px;'";
			html +=" id='"+id+"' name='"+name+"' class='webix_inp_textarea'>"+common._pattern(obj.value)+"</textarea>";

			return common.$renderInput(obj, html, id);
		},
		height:0,
		minHeight:60
	},
	$skin:function(){
		this.defaults.inputPadding = $active.inputPadding;
		this._inputSpacing = $active.inputSpacing;
	},
	_skipSubmit: true,
	$renderLabel: function(config, id){
		var labelAlign = (config.labelAlign||"left");
		var top = this._settings.labelPosition == "top";
		var labelTop =  top?"display:block;":("width: " + this._settings.labelWidth + "px;");
		var label = "";
		if (config.label)
			label = "<label style='"+labelTop+"text-align: " + labelAlign + ";' onclick='' for='"+id+"' class='webix_inp_"+(top?"top_":"")+"label "+(config.required?"webix_required":"")+"'>" + (config.label||"") + "</label>";
		return label;
	},
	//get input element
	getInputNode: function() {
		return this._dataobj.getElementsByTagName("textarea")[0];
	}
};

const view = protoUI(api, text.view);
export default {api, view};