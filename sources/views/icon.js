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
		template:function(obj, view){
			let min = Math.min(obj.awidth, obj.aheight);
			let top = Math.round((view._content_height-obj.aheight)/2);
			let inner = "<button type='button' style='height:"+min+"px;width:"+min+"px;' class='webix_icon_button'>"+
                "<span class='webix_icon "+obj.icon+"'></span></button>";

			return "<div class='webix_el_box' style='width:"+obj.awidth+"px;height:"+obj.aheight+"px;line-height:"+obj.aheight+
				"px;margin-top:"+top+"px'>"+inner+(obj.badge ? "<span class='webix_badge'>"+obj.badge+"</span>":"")+
				"</div>";
		}
	},
	_set_inner_size:function(){},
	$setValue:function(){}
};

const view = protoUI(api, button.view);
export default {api, view};