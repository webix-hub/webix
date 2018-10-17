import {preventEvent} from "../webix/html";
import {$active} from "../webix/skin";
import {isUndefined} from "../webix/helpers";
import {_event} from "../webix/htmlevents";


/*aria-style handling for options of multiple-value controls (radio, segmented, tabbar)*/

const HTMLOptions = {
	$init:function(){
		if($active.customRadio || this.addOption)
			_event( this.$view, "keydown", this._moveSelection, {bind:this});
	},
	_focus: function(){
		if(!this._settings.disabled && !this.queryView({disabled:true}, "parent")){
			var input = this._getInputNode();
			if(input)
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
				var id = inp[index].getAttribute("button_id");
				this.setValue(id);
				inp[index].focus();
			}
		}
	}
};

export default HTMLOptions;