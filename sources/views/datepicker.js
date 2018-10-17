import {protoUI, $$} from "../ui/core";
import {$active} from "../webix/skin";
import {isUndefined, isArray} from "../webix/helpers";

import i18n from "../webix/i18n";
import wDate from "../core/date";

import text from "./text";


const api = {
	name:"datepicker",
	$init:function(){
		this.$ready.push(this._init_popup);
	},
	defaults:{
		template:function(obj, common){
			if(common._settings.type == "time"){
				common._settings.icon = common._settings.timeIcon;
			}
			//temporary remove obj.type [[DIRTY]]
			var t = obj.type; obj.type = "";
			var res = obj.editable?common.$renderInput(obj):common._render_div_block(obj, common);
			obj.type = t;
			return res;
		},
		stringResult:false,
		timepicker:false,
		icon:"wxi-calendar",
		icons: true,
		timeIcon: "wxi-clock",
		separator:", "
	},
	_onBlur:function(){
		if (this._settings.text == this.getText() || (isUndefined(this._settings.text) && !this.getText()))
			return;

		var value = this.getPopup().getValue();
		if (value)
			this.setValue(value);
	},
	$skin:function(){
		this.defaults.inputPadding = $active.inputPadding;
		this.defaults.point = !$active.popupNoPoint;
	},
	getPopup: function(){
		return $$(this._settings.popup);
	},
	_init_popup:function(){ 
		var obj = this._settings;
		if (obj.suggest)
			obj.popup = obj.suggest;
		else if (!obj.popup){
			var timepicker = this._settings.timepicker;
			obj.popup = obj.suggest = this.suggest_setter({
				type:"calendar", point:this._settings.point===false?false:true, padding:0,
				body: {
					height:240+(timepicker||this._settings.icons?30:0),
					width:250,
					multiselect: this._settings.multiselect, 
					timepicker: timepicker,
					type: this._settings.type,
					icons: this._settings.icons,
					timeIcon: this._settings.timeIcon
				}
			});
		}

		this._init_once = function(){};
	},
	$render:function(obj){
		if (isUndefined(obj.value)) return;
		obj.value = this.$prepareValue(obj.value);
		this.$setValue(obj.value);
	},
	$prepareValue:function(value){
		if (this._settings.multiselect){
			if (typeof value === "string")
				value = value.split(this._settings.separator);
			else if (value instanceof Date){
				value = [value];
			} else if (!value){
				value = [];
			}

			for (var i = 0; i < value.length; i++){
				value[i] = this._prepareSingleValue(value[i]);
			}

			return value;
		} else{ 
			return this._prepareSingleValue(value);
		}
	},
	_prepareSingleValue:function(value){
		var type = this._settings.type;
		var timeMode = type == "time";

		//setValue("1980-12-25")
		if(!isNaN(parseFloat(value)))
			value = ""+value;

		if (typeof value=="string" && value){
			var formatDate = null;
			if((type == "month" || type == "year") && this._formatDate){
				formatDate = this._formatDate;
			}
			else
				formatDate = (timeMode?i18n.parseTimeFormatDate:i18n.parseFormatDate);
			value = formatDate(value);
		}

		if (value){
			//time mode
			if(timeMode){
				//setValue([16,24])
				if(isArray(value)){
					var time = new Date();
					time.setHours(value[0]);
					time.setMinutes(value[1]);
					value = time;
				}
			}
			//setValue(invalid date)
			if(isNaN(value.getTime()))
				value = "";
		}

		return value;
	},
	_get_visible_text:function(value){
		if (this._settings.multiselect){
			return []
				.concat(value)
				.map((function(a){ return this._get_visible_text_single(a); }).bind(this))
				.join(this.config.separator);
		} else
			return this._get_visible_text_single(value);
	},
	_get_visible_text_single:function(value){
		var timeMode = this._settings.type == "time";
		var timepicker = this.config.timepicker;
		var formatStr = this._formatStr||(timeMode?i18n.timeFormatStr:(timepicker?i18n.fullDateFormatStr:i18n.dateFormatStr));
		return formatStr(value);
	},
	_set_visible_text:function(){
		var node = this.getInputNode();
		if(node.value == undefined){
			node.innerHTML = this._settings.text || this._get_div_placeholder();
		}
		else{
			node.value = this._settings.text || "";
		}
	},
	$compareValue:function(oldvalue, value){
		if(!oldvalue && !value) return true;
		return wDate.equal(oldvalue, value);
	},
	$setValue:function(value){
		this._settings.text = (value?this._get_visible_text(value):"");
		this._set_visible_text();
	},
	format_setter:function(value){
		if(value){
			if (typeof value === "function")
				this._formatStr = value;
			else {
				this._formatStr = wDate.dateToStr(value);
				this._formatDate = wDate.strToDate(value);
			}
		}
		else
			this._formatStr = this._formatDate = null;
		return value;
	},
	getInputNode: function(){
		return this._settings.editable?this._dataobj.getElementsByTagName("input")[0]:this._dataobj.getElementsByTagName("DIV")[1];
	},
	getValue:function(){
		if (this._settings.multiselect){
			var value = this._settings.value;
			if (!value) return [];

			var result = []
				.concat(value)
				.map((function(a){ return this._get_value_single(a); }).bind(this));

			if (this._settings.stringResult)
				return result.join(this._settings.separator);

			return result;
		}

		return this._get_value_single(this._settings.value);
	},
	_get_value_single:function(value){
		var type = this._settings.type;
		//time mode
		var timeMode = (type == "time");
		//date and time mode
		var timepicker = this.config.timepicker;

		//input was not rendered, we need to parse value from setValue method
		if (!this._rendered_input)
			value = this.$prepareValue(value) || null;
		//rendere and in edit mode
		else if (this._settings.editable){
			var formatDate = this._formatDate||(timeMode?i18n.timeFormatDate:(timepicker?i18n.fullDateFormatDate:i18n.dateFormatDate));
			value = formatDate(this.getInputNode().value);
		}

		//return string from getValue
		if(this._settings.stringResult){
			var formatStr =i18n.parseFormatStr;
			if(timeMode)
				formatStr = i18n.parseTimeFormatStr;
			if(this._formatStr && (type == "month" || type == "year")){
				formatStr = this._formatStr;
			}

			if(this._settings.multiselect)
				return [].concat(value).map((function(a){ return a?formatStr(a):""; }));
			return (value?formatStr(value):"");
		}
		
		return value||null;
	},
	getText:function(){
		var node = this.getInputNode();
		return (node?(typeof node.value == "undefined" ? (this.getValue()?node.innerHTML:"") : node.value):"");
	}
};

const view = protoUI(api, text.view);
export default {api, view};