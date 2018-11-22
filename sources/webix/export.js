import i18n from "../webix/i18n";
import promise from "../thirdparty/promiz";
import require from "../load/require";
import csv from "../webix/csv";
import env from "../webix/env";

import {download} from "../webix/html";
import {$active} from "../webix/skin";
import {toNode, isArray, extend, copy as wcopy, isUndefined} from "../webix/helpers";
import {$$} from "../ui/core";
import {assert} from "../webix/debug";


var errorMessage = "non-existing view for export";

export const toPNG = function(id, options){
	var defer = promise.defer();

	return require(env.cdn + "/extras/html2canvas.min.js").then(function(){
		//backward compatibility
		if (typeof options === "string") options = { filename: options };
		options = options || {};
	
		var view = $$(id);
		if (view && view.$exportView)
			view = view.$exportView(options);
		assert(view, errorMessage);
		if(!view) return defer.reject(errorMessage);

		var node = view ? view.$view : toNode(id);
		var filename = (options.filename||"Data")+".png";
	
		window.html2canvas(node).then(function(canvas) {
			var callback = function(data){
				if(options.download !== false)
					download(data, filename);
				canvas.remove();
				defer.resolve(data);
			};
			if(canvas.msToBlob)
				callback(canvas.msToBlob());
			else
				canvas.toBlob(callback, "image/png");
		});
		return defer;
	});
};

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

var font;
export const toPDF = function(id, options){
	var defer = promise.defer();

	return require(env.cdn + "/extras/pdfjs.js").then(function(){
		options = options || {};

		var view = $$(id);
		if (view && view.$exportView)
			view = view.$exportView(options);
		assert(view, errorMessage);
		if(!view) return defer.reject(errorMessage);

		options.export_mode = "pdf";
		options._export_font = font;
		options.fontName = options.fontName ||"pt-sans.regular";

		var scheme = getExportScheme(view, options);
		var data = getExportData(view, options, scheme);

		var callback = function(pdf, options){
			var filename = (options.filename || "Data")+".pdf";
			var blob = new Blob([pdf.toString()], { type: "application/pdf" });

			if(options.download !== false)
				download(blob, filename);
			defer.resolve(blob);
		};

		if(options._export_font)
			getPdfData(scheme, data, options, callback);
		else
			/* global pdfjs */
			pdfjs.load(env.cdn + "/extras/"+options.fontName+".ttf", function(err, buf){
				if(err) throw err;
				font = options._export_font = new pdfjs.TTFFont(buf);
				getPdfData(scheme, data, options, callback);
			});

		return defer;
	});

};

function getDataHelper(key, column, raw){
	if (!raw && column.format)
		return function(obj){ return column.format(obj[key]); };

	return function(obj){ return obj[key]; };
}
function getExportScheme(view, options){
	var scheme = [];
	var h_count = 0, f_count = 0;
	var isTable = view.getColumnConfig;
	var columns = options.columns;
	var raw = !!options.rawValues;
	scheme.heights = {};

	if (!columns){
		if (isTable)
			columns = [].concat(view._columns);
		else {
			columns = [];
			var obj = view.data.pull[view.data.order[0]];
			for (let key in obj)
				if(key !== "id" && key[0] != "$")
					columns.push({id:key});
		}
	}
	else if(!columns.length){
	//export options are set as - columns:{ rank:true, title:{ header:"custom"}}
		var arr = [];
		for(let key in columns)
			arr.push(extend({ id:key}, extend({}, columns[key])));
		columns = arr;
	}

	if (options.ignore)
		for (let i=columns.length-1; i>=0; i--)
			if (options.ignore[columns[i].id])
				columns.splice(i,1);

	if (options.id)
		scheme.push({ id:"id", width:50, header:" ", template:function(obj){ return obj.id; }});

	if (options.flatTree){
		var flatKey = options.flatTree.id;
		var copy = [].concat(options.flatTree.columns);
		var fill = [];
		var fillMode = !!options.flatTree.fill;
		for (let i = 1; i <= copy.length; i++)
			copy[i-1].template = (function(i){ 
				return function(obj){ 
					return obj.$level == i ? (fill[i]=obj[flatKey]) : ((fillMode && i<obj.$level)?fill[i]:""); 
				};
			})(i);

		var index = 0;
		for (let i = columns.length-1; i >= 0; i--)
			if (columns[i].id === flatKey)
				index = i;

		columns = [].concat(columns.slice(0,index)).concat(copy).concat(columns.slice(index+1));
	}

	
	for (let j = 0; j < columns.length; j++) {
		let column = columns[j];
		let key = column.id;

		if (column.noExport) continue;
	
		// raw mode has sense only for datatable
		// in other cases we don't have built-in data templates
		var rawColumn = raw && isTable;
		if (isTable){
			let sourceColumn = view._columns_pull[key];
			// when these's no column to take raw data from, or custom template defined - ignore raw mode
			if (column.template && (!sourceColumn || sourceColumn.template != column.template))
				rawColumn = false;
			if(sourceColumn)
				column = extend(extend({}, column), sourceColumn);
		}

		let record = {
			id:         column.id,
			template:   (( rawColumn || !column.template) ? getDataHelper(key, column, raw)  : column.template ),
			width:      ((column.width   || 200) * (options.export_mode==="excel"?8.43/70:1 )),
			header:     (column.header!==false?(column.header||key)  : "")
		};

		if(options.export_mode === "excel"){
			extend(record, {
				type: column.exportType || "",
				format:column.exportFormat || ""
			});
		}

		if(typeof record.header === "string") record.header = [{text:record.header}];
		else record.header = wcopy(record.header);

		for(let i = 0; i<record.header.length; i++)
			record.header[i] = record.header[i]?(record.header[i].value || record.header[i].text.replace( /<[^>]*>/gi, "")):"";

		h_count = Math.max(h_count, record.header.length);

		if(view._settings.footer){
			let footer = column.footer || "";
			if(typeof footer == "string") footer = [{text:footer}];
			else footer = wcopy(footer);

			for(let i = 0; i<footer.length; i++){
				if(footer[i]) footer[i] = footer[i].contentId?view.getHeaderContent(footer[i].contentId).getValue():footer[i].text;
				else footer[i] = "";
			}
			record.footer = footer;
			f_count = Math.max(f_count, record.footer.length);
		}
		scheme.push(record);
	}

	for(let i =0; i<scheme.length; i++){

		var diff = h_count-scheme[i].header.length;
		for(let d=0; d<diff; d++)
			scheme[i].header.push("");

		if(view._settings.footer){
			diff = f_count-scheme[i].footer.length;
			for(let d=0; d<diff; d++)
				scheme[i].footer.push("");
		}
	}

	return scheme;
}


function getExportData(view, options, scheme){
	var filterHTML = !!options.filterHTML;
	var htmlFilter = /<[^>]*>/gi;
	var data = [];
	var header, headers;
	var mode = options.export_mode;

	if((mode === "excel" || mode == "csv") && options.docHeader){
		data = [[(options.docHeader.text || options.docHeader).toString()], [""]];
		if(mode === "excel" && options.docHeader.height)
			scheme.heights[0] = options.docHeader.height;
	}

	if( options.header !== false && scheme.length){
		for(let h=0; h < scheme[0].header.length; h++){
			headers = [];
			for (let i = 0; i < scheme.length; i++){ 
				header = "";
				if(scheme[i].header[h]){
					header = scheme[i].header[h];
					if (filterHTML)
						header = scheme[i].header[h] = header.replace(htmlFilter, "");
				}
				headers.push(header);
			}

			if(mode =="excel" && view._columns && options.heights !==false &&
			(view._headers[h] !== $active.barHeight || options.heights == "all")
			) scheme.heights[data.length] = view._headers[h];

			if (mode !== "pdf")
				data[data.length] = headers;
		}
	}
	options.yCorrection = (options.yCorrection||0)-data.length;

	var isTree = (view.data.name == "TreeStore");
	var treeline = (options.flatTree || options.plainOutput) ? "" : " - ";

	view.data.each(function(item){
		if(!options.filter || options.filter(item)){
			let line = [];
			for (let i = 0; i < scheme.length; i++){
				let column = scheme[i], cell = null;
				//spreadsheet can output math
				if(options.math && item["$"+column.id] && item["$"+column.id].charAt(0) =="=" && !item["$"+column.id].match(/^=(image|link|sparkline)\(/i))
					cell = item["$"+column.id];
				if(this._spans_pull){
					let span = this.getSpan(item.id, column.id);
					if(span && span[4] && span[0] == item.id && span[1] == column.id){
						cell = span[4];
						if(filterHTML && typeof cell === "string")
							cell = cell.replace(htmlFilter, "");
					}
				}
				if(!cell){
					cell = column.template(item, view.type, item[column.id], column, i);
					if (!cell && cell !== 0) cell = "";
					if (filterHTML && typeof cell === "string"){
						if(isTree)
							cell = cell.replace(/<div class=.webix_tree_none.><\/div>/, treeline);
						cell = cell.replace(htmlFilter, "");
					}
					//remove end/start spaces(ex.hierarchy data)
					if (typeof cell === "string" && mode === "csv")
						cell = cell.trim();
					//for multiline data
					if (typeof cell === "string" && (mode === "excel" || mode === "csv")){
						cell = cell.replace(/<br\s*\/?>/mg,"\n");
					}
				}
				line.push(cell);
			}

			if(mode =="excel" && view._columns &&  options.heights !==false &&
			((item.$height && item.$height !== $active.rowHeight) || options.heights =="all")
			) scheme.heights[data.length] = item.$height || this.config.rowHeight;

			data.push(line);
		}
	}, view);

	if( options.footer !==false ){
		let f_count = scheme[0].footer?scheme[0].footer.length:0;
		for (let f = 0; f < f_count; f++){
			let footers  = [];
			for(let i = 0; i<scheme.length; i++){
				let footer = scheme[i].footer[f];
				if (filterHTML) footer = scheme[i].footer[f] = footer.toString().replace(htmlFilter, "");
				footers.push(footer);
			}
		
		
			if(mode =="excel" && view._columns && options.heights !==false &&
			(view._footers[f] !== $active.barHeight || options.heights=="all")
			) scheme.heights[data.length] = view._footers[f];

			if(mode !== "pdf")
				data.push(footers);
		}
	}

	if(mode ==="excel" && options.docFooter){
		data = data.concat([[], [(options.docFooter.text || options.docFooter).toString()]]);
		if(options.docFooter.height)
			scheme.heights[data.length-1] = options.docFooter.height;
	}

	return data;
}

function getColumnsWidths(scheme){
	var wscols = [];
	for (var i = 0; i < scheme.length; i++)
		wscols.push({ wch: scheme[i].width });
	
	return wscols;
}

function excelDate(date) {
	return Math.round(25569 + date / (24 * 60 * 60 * 1000));
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

function getStyles(r, c, styles){
	//row index, column index, styles array
	if(styles[r] && styles[r][c])
		return styles[r][c];
	return "";
}

function getRowHeights(heights){
	for(var i in heights)
		heights[i] = {hpx:heights[i], hpt:heights[i]*0.75};
	return heights;
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

			if(styles)
				cell.s = getStyles(R, C, styles);

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

function str2array(s) {
	var buf = new ArrayBuffer(s.length);
	var view = new Uint8Array(buf);
	for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
	return buf;
}

function getPdfData(scheme, data, options, callback){


	options.header = (isUndefined(options.header) || options.header === true) ? {} : options.header;
	options.footer = (isUndefined(options.footer) || options.footer === true) ? {} : options.footer;
	options.table = options.table || {};

	var width = options.width||595.296, height = options.height || 841.896;// default A4 size

	if(options.orientation && options.orientation ==="landscape")
		height = [width, width = height][0];

	if(options.autowidth){
		width = 80; //paddings
		for(let i = 0; i<scheme.length; i++)
			width += scheme[i].width;
	}
	
	var doc = new pdfjs.Document({
		padding: 40,
		font: options._export_font,
		threshold:256,
		width:width,
		height:height
	});


	//render table
	var h_count = options.header === false ? 0: scheme[0].header.length;
	var f_count = (options.footer === false || !scheme[0].footer) ? 0: scheme[0].footer.length;

	var colWidths = [];
	for(let i = 0; i<scheme.length; i++)
		colWidths[i] = scheme[i].width;

	var tableOps = extend(options.table, {
		borderWidth: 1,height:20, lineHeight:1.1,
		borderColor: 0xEEEEEE, backgroundColor: 0xFFFFFF, color:0x666666,
		textAlign:"left", paddingRight:10, paddingLeft:10,
		headerRows:h_count, widths: colWidths.length?colWidths:["100%"]
	});

	var table = doc.table(tableOps);

	//render table header
	if(h_count){
		var headerOps = extend(options.header, {
			borderRightColor:0xB0CEE3, borderBottomColor:0xB0CEE3,
			color:0x4A4A4A, backgroundColor:0xD2E3EF,
			height:27, lineHeight:1.2
		});

		for(let i = 0; i<h_count; i++){
			var header = table.tr(headerOps);
			for(var s=0; s<scheme.length; s++)
				header.td(scheme[s].header[i].toString());
		}
	}

	//render table data
	for(let r=0; r<data.length;r++){
		let row = table.tr({});
		for(let c=0; c< data[r].length; c++)
			row.td(data[r][c]);
	}

	//render table footer
	if(f_count){
		let footerOps = extend(options.footer, {
			borderRightColor:0xEEEEEE, borderBottomColor:0xEEEEEE,
			backgroundColor: 0xFAFAFA, color:0x666666,
			height:27, lineHeight:1.2
		});

		for(let i = 0; i<f_count; i++){
			let footer = table.tr(footerOps);
			for(let s=0; s<scheme.length; s++)
				footer.td(scheme[s].footer[i].toString());
		}
	}

	//doc footer
	if(options.docFooter !== false){
		let ft = doc.footer();
		ft.text({
			color: 0x666666, textAlign:"center"
		}).append((i18n.dataExport.page||"Page")).pageNumber().append("  "+(i18n.dataExport.of || "of")+"  ").pageCount();
	}

	var horder = { text:0, image:1};

	//doc header, configurable
	if(options.docHeader){
		if(typeof options.docHeader == "string") options.docHeader = {text:options.docHeader};
		extend(options.docHeader, {
			color: 0x666666, textAlign:"right", order:0
		});
		horder.text = options.docHeader.order;
	}

	if (options.docHeaderImage){
		if(typeof options.docHeaderImage == "string") options.docHeaderImage = {url:options.docHeaderImage};
		extend(options.docHeaderImage, {
			align:"right", order:1
		});
		horder.image = options.docHeaderImage.order;
	}

	if(options.docHeader && horder.image > horder.text)
		doc.header({paddingBottom:10}).text(options.docHeader.text, options.docHeader);

	if (options.docHeaderImage){
		pdfjs.load(options.docHeaderImage.url, function(err, buffer){
			if (!err){
				var img = new pdfjs.Image(buffer);
				doc.header({paddingBottom:10}).image(img, options.docHeaderImage);

				if(options.docHeader && horder.image < horder.text)
					doc.header({paddingBottom:10}).text(options.docHeader.text, options.docHeader);
			}
			//render pdf and show in browser
			var pdf = doc.render();
			callback(pdf, options);
		});
	}
	else{
		//render pdf and show in browser
		var pdf = doc.render();
		callback(pdf, options);
	}
}