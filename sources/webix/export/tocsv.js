import {errorMessage, getExportScheme, getExportData, getFileName} from "./common";

import csv from "../../webix/csv";
import promise from "../../thirdparty/promiz";

import {download} from "../../webix/html";
import {$$} from "../../ui/core";
import {assert} from "../../webix/debug";
import {extend, isArray} from "../../webix/helpers";

export const toCSV = function(id, options){
	options = options || {};
	options.export_mode = "csv";

	let view = $$(id);
	let result;

	if (view && view.$exportView)
		view = result = view.$exportView(options);

	assert(view, errorMessage);
	if(!view) return promise.reject(errorMessage);

	//$exportView returns array
	if(!isArray(view)){
		extend(options, {
			filterHTML: true
		});
		result = getExportData(view, options, getExportScheme(view, options));
	}

	if(options.dataOnly)
		return result;

	const blob = new Blob(["\uFEFF" + csv.stringify(result)], { type: "text/csv" });
	if(options.download !== false)
		download(blob, getFileName(options.filename, "csv"));

	return promise.resolve(blob);
};