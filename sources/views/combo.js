import {protoUI} from "../ui/core";
import {isUndefined} from "../webix/helpers";

import richselect from "./richselect";


const api = {
	name:"combo",
	getInputNode:function(){
		return this._dataobj.getElementsByTagName("input")[0];
	},
	$render:function(obj){
		if (isUndefined(obj.value)) return;
		this.$setValue(obj.value);
	},
	_revertValue:function(){
		if(!this._settings.editable){
			var value = this.getValue();
			this.$setValue(isUndefined(value)?"":value);
		}
	},
	_applyChanges:function(){
		var input = this.getInputNode(),
			value = "",
			suggest =  this.getPopup();

		if (input.value){
			value = this._settings.value;
			if(suggest.getItemText(value) != this.getText())
				value = suggest.getSuggestion()||value;
		}
		if (value != this._settings.value)
			this.setValue(value, true);
		else
			this.$setValue(value);
	},
	defaults:{
		template:function(config, common){
			return common.$renderInput(config).replace(/(<input)\s*(?=\w)/, "$1"+" role='combobox'");
		},
		icon: "wxi-menu-down"
	}
};

const view = protoUI(api, richselect.view);
export default {api, view};