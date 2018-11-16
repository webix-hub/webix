import {addCss, removeCss} from "../webix/html";
import {protoUI} from "../ui/core";

import button from "./button";


const api = {
	name:"toggle",
	$allowsClear:true,
	$init:function(){
		this.attachEvent("onItemClick", function(){
			this.toggle();
		});
	},
	$setValue:function(value){
		var input = this.getInputNode();
		var obj = this._settings;
		var isPressed = (value && value != "0");
		var text = (isPressed ? obj.onLabel : obj.offLabel) || obj.label;
		var textNode = input.lastChild;
		
		input.setAttribute("aria-pressed", isPressed?"true":false);
		input.value = text;
		if (textNode)
			(textNode.firstChild || textNode).nodeValue = text;

		//icon or image button
		if(input.firstChild && input.firstChild.nodeName ==="SPAN" && obj.onIcon && obj.offIcon && obj.onIcon !==obj.offIcon)
			input.firstChild.className = input.firstChild.className.replace((isPressed?obj.offIcon:obj.onIcon),  (isPressed?obj.onIcon:obj.offIcon));
		
		var parent = input.parentNode;
		if(isPressed)
			addCss(parent, "webix_pressed");
		else
			removeCss(parent, "webix_pressed");
	},
	toggle:function(){
		this.setValue(!this.getValue());
	},
	getValue:function(){
		var value = this._settings.value;
		return  (!value||value=="0")?0:1;
	},
	defaults:{
		template:function(obj, common){
			var isPressed = (obj.value && obj.value != "0");
			var css = isPressed ? " webix_pressed" : "";

			obj.label = (isPressed ? obj.onLabel : obj.offLabel) || obj.label;
			obj.icon = (isPressed ? obj.onIcon : obj.offIcon) || obj.icon;
			
			var html =  "<div class='webix_el_box"+css+"' style='width:"+obj.awidth+"px; height:"+obj.aheight+"px'>"+common.$renderInput(obj, common)+"</div>";
			html = html.replace(/(button)\s*(?=\w)/, "$1"+(" aria-pressed='"+(isPressed?"true":"false")+"' "));
			if (obj.badge)
				html = html.replace(/<\/div>$/, "<span class='webix_badge'>"+obj.badge+"</span></div>");
			
			return html;
		}
	},
	_set_inner_size:false
};


const view = protoUI(api, button.view);
export default {api, view};