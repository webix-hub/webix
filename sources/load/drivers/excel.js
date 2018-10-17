import {extend, bind, isDate} from "../../webix/helpers";
import env from "../../webix/env";

import Promise from "../../thirdparty/promiz";
import i18n from "../../webix/i18n";

import require from "../require";
import jsarray from "./jsarray";


const excel = extend({
	toObject:function(data){
		if(!data.excel){
			var opts = data.options || {};
			if (opts.dataurl) 
				extend(opts, this._urlToOptions(opts.dataurl));

			data = data.data || data;
			var promise = Promise.defer();
			
			if(data.name){ //file
				opts.ext = data.name.split(".").pop();
				var reader = new FileReader();
				
				reader.onload = bind(function (e) {
					promise.resolve(this.parseData(e.target.result, opts));
				}, this);
				reader.readAsArrayBuffer(data);
			}
			else //arraybuffer
				promise.resolve(this.parseData(data, opts));
				
			return promise;
		}
		//plain jsarray or hash
		return data;
	},
	parseData:function(data, options){
		data = new Uint8Array(data);
		var arr = [];
		for(let i = 0; i != data.length; ++i)
			arr[i] = String.fromCharCode(data[i]);

		var ext = (options.ext || options).toLowerCase();
		if (ext != "xls") ext = "xlsx";
		return require(env.cdn + "/extras/xlsx.core.styles.min.js").then(bind(function(){
			/* global XLS, XLSX */
			var wb = (ext == "xls") ?
				XLS.read(arr.join(""), {type: "binary", cellStyles:true, cellDates:true}) :
				XLSX.read(arr.join(""), {type: "binary", cellStyles:true, cellDates:true});

			var res = {
				sheets: wb.Sheets,
				names: wb.SheetNames,
				options:options,
				ranges:wb.Workbook?(wb.Workbook.Names ||[]):[]
			};
			return extend(this.getSheet(res, options), res);
		}, this));
	},
	getSheet:function(data, options){
		var name = options.name || data.names[0];
		data = this.sheetToArray(data.sheets[name], options);
		if(options.rows && options.rows.length)
			data.data = data.data.splice(options.rows[0], Math.min(options.rows[1], data.data.length)-options.rows[0]);
		return data;
	},
	sheetToArray:function(sheet, options){
		var all = [];
		var spans = [];
		var styles = [];
		var sizes = [];

		if(sheet && sheet["!ref"]){
			var range = XLS.utils.decode_range(sheet["!ref"]), 
				row, col, cellCoord, cell,
				xCorrection = range.s.c,
				yCorrection = range.s.r+(options.rows?options.rows[0]:0);

			for (row = range.s.r; row <= range.e.r; row++) {
				var nrow = [];
				for (col = range.s.c; col <= range.e.c; col++) {
					cellCoord = XLS.utils.encode_cell({ r: row, c: col });
					cell = sheet[cellCoord];
					if(!cell)
						nrow.push("");
					else{
						var ncell = "";
						if(options.math&&cell.f) // get formula
							ncell = cell.f.charAt(0)=="=" ? cell.f : "="+cell.f;
						else if (cell.t =="d" && isDate(cell.v))
							ncell  = i18n.dateFormatStr(cell.v);
						else 
							ncell = cell.v;
						nrow.push(ncell);

						if (cell.s)
							styles.push([row-yCorrection, col-xCorrection, cell.s]);
					}
				}
				all.push(nrow);
			}

			if(sheet["!merges"]){
				var merges = sheet["!merges"];
				for(let i = 0; i<merges.length; i++){
					var s = merges[i].s;
					var e = merges[i].e;
					if(!options.rows || (s.r-yCorrection>=0 && e.r-yCorrection<=options.rows[1]))
						spans.push([s.r-yCorrection, s.c-xCorrection, e.c-s.c+1, e.r-s.r+1]);
				}
			}
			if(sheet["!cols"]){
				var widths = sheet["!cols"];
				for(let i = 0; i<widths.length; i++)
					if(widths[i]) sizes.push(["column", i-xCorrection, Math.round(widths[i].wch/(8.43/70))]); //mode, colind, value
			}
			if(sheet["!rows"]){
				var heights = sheet["!rows"];
				for(let i = 0; i<heights.length; i++)
					if(heights[i]) sizes.push(["row", i-yCorrection, heights[i].hpx]); //mode ("row", "column"), rowind, value
			}
		}
		return { data:all, spans: spans, styles:styles, sizes:sizes, excel: true };
	},
	_urlToOptions:function(details){
		var parts = details.split("[");
		var options = {};
		options.name = parts[0];
		if(parts[1]){
			var rows = parts[1].split(/[^0-9]+/g);
			rows[0] = rows[0]*1 || 0;
			rows[1] = rows[1]*1 || 9999999;
			options.rows = rows;
		}
		return options;
	}
}, jsarray);

export default excel;