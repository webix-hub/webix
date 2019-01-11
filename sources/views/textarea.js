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
	_getLabelHeight:function(top){
		return top ? this._labelTopHeight-this._settings.inputPadding : "";
	},
	//get input element
	getInputNode: function() {
		return this._dataobj.getElementsByTagName("textarea")[0];
	}
};

const view = protoUI(api, text.view);
export default {api, view};