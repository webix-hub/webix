import en from "../i18n/en";
import i18n from "./i18n";

import wDate from "../core/date";
import Number from "../core/number";

import {copy, isArray} from "../webix/helpers";
import template from "./template";


function extend(base,source){
	for (let method in source){
		if(typeof(source[method]) == "object" && !isArray(source[method])){
			if(!base[method]){
				base[method] = {};
			}
			extend(base[method],source[method]);
		}
		else
			base[method] = source[method];
	}
}

const helpers = ["fullDateFormat", "timeFormat", "dateFormat", "longDateFormat", "parseFormat", "parseTimeFormat"];

i18n.setLocale = function(locale){
	if (typeof locale == "string"){
		i18n.locale = locale;
		locale = i18n.locales[locale];
	}
	if (locale){
		const origin = copy(en);
		locale.priceSettings  = copy(locale.priceSettings || locale);
		extend(origin, locale);
		extend(i18n, origin);
		delete i18n.calendar.monthShort_hash;
		delete i18n.calendar.monthFull_hash;
	}
	for( let i=0; i<helpers.length; i++){
		const key = helpers[i];
		const utc = i18n[key+"UTC"];
		i18n[key+"Str"] = wDate.dateToStr(i18n[key], utc);
		i18n[key+"Date"] = wDate.strToDate(i18n[key], utc);
	}

	const _price_format = template(i18n.price);
	const _price_settings = i18n.priceSettings || i18n;

	i18n.intFormat = Number.numToStr({
		groupSize: i18n.groupSize,
		groupDelimiter: i18n.groupDelimiter,
		decimalSize: 0,
		minusPosition: i18n.minusPosition,
		minusSign: i18n.minusSign
	});

	i18n.priceFormat = function(value){
		const sign = value < 0;
		if(sign)
			value = Math.abs(value);

		value = Number.format(value, _price_settings);

		if(sign){
			switch(_price_settings.minusPosition){
				case "before":
					return _price_settings.minusSign + _price_format(value);
				case "parentheses":
					return _price_settings.minusSign[0] + _price_format(value) + _price_settings.minusSign[1];
				case "after":
					value += _price_settings.minusSign;
					break;
				case "inside":
					value = _price_settings.minusSign + value;
					break;
			}
		}

		return _price_format(value);
	};

	i18n.numberFormat = Number.format;
};

i18n.locales={ "en-US" : en };
i18n.setLocale("en-US");

export default i18n;