import {errorMessage, getExportScheme, getExportData} from "./common";

import csv from "../../webix/csv";
import promise from "../../thirdparty/promiz";

import {download} from "../../webix/html";
import {$$} from "../../ui/core";
import {assert} from "../../webix/debug";

export const toCSV = function(id, options){
	options = options || {};

	var view = $$(id);
	if (view && view.$exportView)
		view = view.$exportView(options);
	assert(view, errorMessage);
	if(!view) return promise.reject(errorMessage);

	options.export_mode = "csv";
	options.filterHTML = true;

	var scheme = getExportScheme(view, options);
	var result = getExportData(view, options, scheme);

	var data = getCsvData(result, scheme);
	var filename =  (options.filename || "Data")+".csv";

	var blob = new Blob(["\uFEFF" + data], { type: "text/csv" });
	if(options.download !== false)
		download(blob, filename);

	return promise.resolve(blob);
};

function getCsvData(data) {
	return csv.stringify(data);
}