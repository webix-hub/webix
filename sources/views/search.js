import {protoUI} from "../ui/core";
import {$active} from "../webix/skin";

import text from "./text";


const api = {
	name:"search",
	on_click:{
		"webix_input_icon":function(e){
			this.getInputNode().focus();
			this.callEvent("onSearchIconClick", [e]);
		}
	},
	$skin:function(){
		this.defaults.inputPadding = $active.inputPadding;
	},
	defaults:{
		type:"text",
		icon:"wxi-search"
	}
};

const view = protoUI(api, text.view);
export default {api, view};