import datepicker from "../views/datepicker";
import daterange from "../views/daterange";
import {protoUI} from "../ui/core";
import i18n from "../webix/i18n";


const api = {
	$cssName:"datepicker",
	name:"daterangepicker",
	$init:function(config){
		// other types are not implemented
		delete config.type;
		// only start/end values can be selected
		delete config.multiselect;
		delete this._settings.multiselect;
	},
	defaults:{
		value:{ },
		separator:" - "
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
	$prepareValue:function(){
		return daterange.api.$prepareValue.apply(this, arguments);
	},
	_string_to_date:function(date){
		if(typeof date == "string"){
			date = i18n.parseFormatDate(date);
		}
		return isNaN(date*1) ? null : date;
	},
	$compareValue:function(oldvalue, value){
		var compare = datepicker.api.$compareValue;
		var start = compare.call(this, oldvalue.start, value.start);
		var end = compare.call(this, oldvalue.end, value.end);

		return (start && end);
	},
	$setValue:function(value){
		value = value || {};

		this._settings.text = (value.start?this._get_visible_text(value.start):"")+(value.end?(this._settings.separator + this._get_visible_text(value.end)):"");
		this._set_visible_text();
	},
	getValue:function(){
		var value = this._settings.value;

		if (!this._rendered_input)
			value = this.$prepareValue(value) || null;
		else if (this._settings.editable){
			var formatDate = this._formatDate||i18n.dateFormatDate;
			let iValue = (this.getInputNode().value||"").split(this._settings.separator);
			value = this._formatValue(formatDate, {start:iValue[0], end:iValue[1]});
		}

		if (this._settings.stringResult){
			var formatStr = i18n.parseFormatStr;
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