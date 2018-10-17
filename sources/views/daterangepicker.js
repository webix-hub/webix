import datepicker from "../views/datepicker";
import {protoUI, $$} from "../ui/core";
import {copy} from "../webix/helpers";
import i18n from "../webix/i18n";


const api = {
	$cssName:"datepicker",
	name:"daterangepicker",
	$init:function(config){
		//set non-empty initial value
		this._settings.value = {};
		// other types are not implemented
		delete config.type;
	},
	_init_popup:function(){
		var obj = this._settings;
		if (obj.suggest)
			obj.popup = obj.suggest;
		else if (!obj.popup){
			obj.popup = obj.suggest = this.suggest_setter({
				view:"daterangesuggest", body:{
					timepicker:obj.timepicker, calendarCount:obj.calendarCount, height:250+(obj.button || obj.icons?30:0)
				}
			});
		}
		this._init_once = function(){};
	},
	$prepareValue:function(value){
		value = value || {};
		value.start = datepicker.api.$prepareValue.call(this, value.start?value.start:null);
		value.end = datepicker.api.$prepareValue.call(this, value.end?value.end:null);

		var daterange = $$(this._settings.popup).getRange();
		return copy(daterange._correct_value(value));
	},
	$compareValue:function(oldvalue, value){
		var compare = datepicker.api.$compareValue;
		var start = compare.call(this, oldvalue.start, value.start);
		var end = compare.call(this, oldvalue.end, value.end);

		return (start && end);
	},
	$setValue:function(value){
		value = value || {};

		this._settings.text = (value.start?this._get_visible_text(value.start):"")+(value.end?(" - "+ this._get_visible_text(value.end)):"");
		this._set_visible_text();
	},
	$render:function(obj){
		obj.value = this.$prepareValue(obj.value);
		this.$setValue(obj.value);
	},
	getValue:function(){

		var value = this._settings.value;

		if(this._settings.stringResult){
			var formatStr =i18n.parseFormatStr;
			return this._formatValue(formatStr, value);
		}
		
		return value||null;
	},
	_formatValue:function(format, value){
		if(value.start) value.start = format(value.start);
		if(value.end) value.end = format(value.end);
		return value;
	}
};


const view = protoUI(api,  datepicker.view);
export default {api, view};