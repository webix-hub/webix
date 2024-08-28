import en from "../i18n/en";
import i18n from "./i18n";

import wDate from "../core/date";
import Number from "../core/number";

import {copy, isArray} from "../webix/helpers";

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

	i18n.intFormat = Number.numToStr({
		groupSize: i18n.groupSize,
		groupDelimiter: i18n.groupDelimiter,
		decimalSize: 0,
		minusPosition: i18n.minusPosition,
		minusSign: i18n.minusSign
	});

	const _price_settings = copy(i18n.priceSettings || i18n);
	_price_settings.priceTemplate = i18n.price;

	i18n.priceFormat = Number.numToStr(_price_settings);
	i18n.numberFormat = Number.format;
};

i18n.locales={ "en-US" : en };
i18n.setLocale("en-US");

export default i18n;