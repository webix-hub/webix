import {protoUI} from "../ui/core";
import {$active} from "../webix/skin";

import button from "./button";


const api = {
	name:"icon",
	$skin:function(){
		this.defaults.height = $active.inputHeight;
		this.defaults.width = $active.inputHeight;
	},
	defaults:{
		template:function(obj){
			return "<button type='button' "+" style='height:100%;width:100%;' class='webix_icon_button'><span class='webix_icon "+obj.icon+" '></span>"+
				(obj.badge ? "<span class='webix_badge'>"+obj.badge+"</span>":"")+
				"</button>";
		}
	},
	_set_inner_size:function(){},
	$setValue:function(){}
};

const view = protoUI(api, button.view);
export default {api, view};