import {errorMessage, getExportScheme, getExportData} from "./common";

import promise from "../../thirdparty/promiz";
import require from "../../load/require";
import env from "../../webix/env";

import {download} from "../../webix/html";
import {isArray} from "../../webix/helpers";
import {$$} from "../../ui/core";
import {assert} from "../../webix/debug";

export const toExcel = function(id, options){
	options = options || {};
	options.export_mode = "excel";

	id = isArray(id)?id:[id];
	var views = [];

	for(var i = 0; i<id.length; i++){
		var view = $$(id[i]);
		if (view && view.$exportView)
			view = view.$exportView(options);
		if(view) views = views.concat(view);
		assert(view, errorMessage);

		//spreadsheet and excelviewer require plain data output first
		if(options.dataOnly){
			var scheme = getExportScheme(view, options);
			views[i] = {
				scheme : scheme,
				exportData:getExportData(view, options, scheme),
				spans:(options.spans ? getSpans(view, options) : [])
			};
		}
	}
	if(options.dataOnly) return views;

	var defer = promise.defer(); 

	return require(env.cdn + "/extras/xlsx.core.styles.min.js").then(function(){
		if(!views.length) return defer.reject(errorMessage);

		var wb = { SheetNames:[], Sheets:{}, Workbook:{ WBProps :{}, Names:[] }};
		var name = isArray(options.sheets) ? options.sheets : [options.name || "Data"];
	
		for(var i = 0; i<views.length; i++){
			var scheme = views[i].scheme || getExportScheme(views[i], options);
			var result = views[i].exportData || getExportData(views[i], options, scheme);
			var spans  = views[i].spans ? views[i].spans: (options.spans ? getSpans(views[i], options) : []);
			var ranges =  views[i].ranges || [];
			var styles = views[i].styles || [];
			var data   = getExcelData(result, scheme, spans, styles, options);
			var sname  = (name[i] || "Data"+i).replace(/[*?:[\]\\/]/g,"").replace(/&/g, "&amp;").substring(0, 31);

			wb.SheetNames.push(sname);
			wb.Sheets[sname] = data;
			wb.Workbook.Names = wb.Workbook.Names.concat(ranges);
		}

		/* global XLSX */
		var xls = XLSX.write(wb, {bookType:"xlsx", bookSST:false, type: "binary"});
		var filename =  (options.filename || name.join(","))+".xlsx";
	
		var blob = new Blob([str2array(xls)], { type: "application/xlsx" });
		if(options.download !== false)
			download(blob, filename);
		defer.resolve(blob);
		return defer;
	});
};

function str2array(s) {
	var buf = new ArrayBuffer(s.length);
	var view = new Uint8Array(buf);
	for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
	return buf;
}

var types = { number:"n", date:"n", string:"s", boolean:"b"};
var table = "_table";
function getExcelData(data, scheme, spans, styles, options) {
	var ws = {};
	var range = {s: {c:10000000, r:10000000}, e: {c:0, r:0 }};
	for(var R = 0; R != data.length; ++R) {
		for(var C = 0; C != data[R].length; ++C) {
			if(range.s.r > R) range.s.r = R;
			if(range.s.c > C) range.s.c = C;
			if(range.e.r < R) range.e.r = R;
			if(range.e.c < C) range.e.c = C;

			var cell = {v: data[R][C] };
			if(cell.v === null) continue;
			var cell_ref = XLSX.utils.encode_cell({c:C,r:R});

			let stringValue = cell.v.toString();
			let isFormula = (stringValue.charAt(0) === "=");

			// set type based on column's config
			// skip headers and formula based cells
			var header = (options.docHeader?2:0)+scheme[0].header.length;
			if(R>=header && !isFormula){
				var column = scheme[C];
				if(column.type) cell.t = (types[column.type] || "");
				if(column.format) cell.z = column.format;
			}

			// set type based on cell's value
			if(cell.v instanceof Date){
				cell.t = cell.t || "n";
				cell.z = cell.z || XLSX.SSF[table][14];
				cell.v = excelDate(cell.v);
			}
			else if(!cell.t){
				if(typeof cell.v === "boolean")
					cell.t = "b";
				else if(typeof cell.v === "number" || parseFloat(cell.v) == cell.v){
					cell.v = cell.v*1;
					cell.t = "n";
				}
				else {
					// convert any other object to a string
					cell.v = stringValue;
					if(isFormula){
						cell.t = "n";
						cell.f = cell.v;
						delete cell.v;
					}
					else cell.t = "s";
				}
			}

			if(styles){
				var cellStyle = getStyles(R, C, styles);
				if(cellStyle.format){
					cell.z = cellStyle.format;
					delete cellStyle.format;
				}
				cell.s = cellStyle;
			}

			ws[cell_ref] = cell;
		}
	}
	if(range.s.c < 10000000) ws["!ref"] = XLSX.utils.encode_range(range);

	ws["!rows"] = getRowHeights(scheme.heights);
	ws["!cols"] = getColumnsWidths(scheme);
	if(spans.length)
		ws["!merges"] = spans;

	return ws;
}

function getRowHeights(heights){
	for(var i in heights)
		heights[i] = {hpx:heights[i], hpt:heights[i]*0.75};
	return heights;
}

function getStyles(r, c, styles){
	//row index, column index, styles array
	if(styles[r] && styles[r][c])
		return styles[r][c];
	return "";
}

function getSpans(view, options){
	var isTable = view.getColumnConfig;
	var pull = view._spans_pull;
	var spans = [];

	if(isTable){
		if(options.header!==false)
			spans = getHeaderSpans(view, options, "header", spans); 

		if(pull){
			var xc = options.xCorrection || 0;
			var yc = options.yCorrection || 0;
			for(var row in pull){
				//{ s:{c:1, r:0}, e:{c:3, r:0} }
				var cols = pull[row];
				for(var col in cols){
					var sc = view.getColumnIndex(col) - xc;
					var sr = view.getIndexById(row) - yc;
					if(sc<0||sr<0) //hidden cols/rows
						continue;
					var ec = sc+cols[col][0]-1;
					var er = sr+(cols[col][1]-1);

					spans.push({ s:{c:sc, r:sr}, e:{c:ec, r:er} });
				}
			}
		}
		if(options.footer!==false)
			spans = getHeaderSpans(view, options, "footer", spans);
	}

	return spans;
}

function getHeaderSpans(view, options, group, spans){
	var columns = view.config.columns;
	var delta = (options.docHeader?2:0)+(group == "header" ? 0 :((options.header!==false?view._headers.length:0)+view.count()));

	for(var i=0; i<columns.length; i++){
		var header = columns[i][group];
		for(var h = 0; h<header.length; h++){
			if(header[h] && (header[h].colspan || header[h].rowspan)){
				spans.push({
					s:{ c:i, r:h+delta},
					e:{ c:i+(header[h].colspan||1)-1, r:h+(header[h].rowspan ||1)-1+delta }
				});
			}
		}  
	}
	return spans;
}

function excelDate(date) {
	return Math.round(25569 + date / (24 * 60 * 60 * 1000));
}

function getColumnsWidths(scheme){
	var wscols = [];
	for (var i = 0; i < scheme.length; i++)
		wscols.push({ wch: scheme[i].width });

	return wscols;
}