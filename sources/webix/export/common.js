import {$active} from "../../webix/skin";
import {extend, isUndefined} from "../../webix/helpers";

export const errorMessage = "non-existing view for export";

function getDataHelper(key, column, raw){
	if (!raw && column.format)
		return function(obj){ return column.format(obj[key]); };

	return function(obj){ return obj[key]; };
}

export function getExportScheme(view, options){
	var scheme = [];
	var h_count = 0, f_count = 0;
	var isTable = view.getColumnConfig;
	var columns = options.columns;
	var raw = !!options.rawValues;
	var isTree = view.data.name == "TreeStore";

	var treeLines = options.treeLines;
	if(treeLines === true || isUndefined(treeLines))
		treeLines = "value";

	scheme.heights = {};

	if (!columns){
		if (isTable)
			columns = [].concat(view._columns);
		else {
			columns = [];
			var obj = view.data.pull[view.data.order[0]];
			for (let key in obj)
				if(key !== "id" && key[0] != "$")
					columns.push({id:key, isTree: isTree && key === treeLines});
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

	var treeColumn;

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

		if(isTree && key === treeLines)
			record.isTree = treeColumn = true;

		if(options.export_mode === "excel"){
			extend(record, {
				type: column.exportType || "",
				format:column.exportFormat || ""
			});
		}

		if(typeof record.header === "string") record.header = [{text:record.header}];
		else record.header = [].concat(record.header);

		for(let i = 0; i<record.header.length; i++){
			const hcell = record.header[i] || {};
			const text =  hcell.contentId ?
				view.getHeaderContent(hcell.contentId).getValue(true) :
				hcell.text;

			record.header[i] = (text||"").toString().replace( /<[^>]*>/gi, "");
		}

		h_count = Math.max(h_count, record.header.length);

		if(view._settings.footer){
			let footer = column.footer || "";
			if(typeof footer == "string") footer = [{text:footer}];
			else footer = [].concat(footer);

			for(let i = 0; i<footer.length; i++){
				if(footer[i]) footer[i] = footer[i].contentId?view.getHeaderContent(footer[i].contentId).getValue():footer[i].text;
				else footer[i] = "";
			}
			record.footer = footer;
			f_count = Math.max(f_count, record.footer.length);
		}
		scheme.push(record);
	}


	if(!treeColumn && isTree && options.treeLines != treeLines && scheme[0])
		scheme[0].isTree = true;

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


export function getExportData(view, options, scheme){
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

	var treeline = (options.flatTree || options.plainOutput) ? "" : "-";

	view.data.each(function(item){
		if(!options.filter || options.filter(item)){
			if(this.data._scheme_export){
				item = view.data._scheme_export(item);
			}

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
					if(column.isTree && treeline)
						cell = " "+Array(item.$level).join(treeline)+" "+cell;
					if (filterHTML && typeof cell === "string"){
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