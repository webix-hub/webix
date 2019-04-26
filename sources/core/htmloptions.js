import {preventEvent} from "../webix/html";
import {$active} from "../webix/skin";
import {isUndefined} from "../webix/helpers";
import {_event} from "../webix/htmlevents";
import UIManager from "./uimanager";


/*aria-style handling for options of multiple-value controls (radio, segmented, tabbar)*/

const HTMLOptions = {
	$init:function(){
		if($active.customRadio || this.addOption)
			this.$ready.push(()=>{
				_event( this.$view, "keydown", this._moveSelection, {bind:this});
			});
	},
	_focus: function(){
		if(!UIManager.canFocus(this))
			return false;

		var input = this._getInputNode();
		if(input){
			for(var i=0; i<input.length; i++){
				if(input[i].getAttribute("tabindex") == "0"){
					input[i].focus();
				}
			}
		}
	},
	_blur: function(){
		var input = this._getInputNode();
		if(input)
			for(var i=0; i<input.length; i++){
				if(input[i].getAttribute("tabindex") == "0") input[i].blur();
			}
	},
	_moveSelection:function(e){
		var code = e.which || e.keyCode;

		var startCode = this.addOption?34:36;

		if(code>startCode && code <41){
			preventEvent(e);
			var index;
			var inp = this._getInputNode();

			if(code == 35) index = inp.length-1;
			else if(code === 36 ) index = 0;
			else{
				var dir = (code === 37 || code ===38)?-1:1;
				for(var i =0; i<inp.length; i++){
					if(inp[i].getAttribute("tabindex") == "0"){
						index = i + dir;
						if(index<0) index = inp.length-1;
						else if(index>=inp.length) index = 0;
						break;
					}
				}
			}
			if(!isUndefined(index)){
				var id = inp[index].getAttribute(/*@attr*/"button_id");
				this.setValue(id);
				inp[index].focus();
			}
		}
	},
	_get_tooltip_data:function(t,e){
		let node = e.target || e.srcElement;
		while (node && !node.webix_tooltip){
			let id = node.getAttribute("webix_t_id");
			if (id)
				return this.getOption(id);
			node = node.parentNode;
		}
		return null;
	},
	getOption:function(id){
		let options = this._check_options(this._settings.options);
		for (let i=0; i<options.length; i++)
			if (options[i].id == id)
				return options[i];
		return null;
	}
};

export default HTMLOptions;