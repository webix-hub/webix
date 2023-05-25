import {create} from "../../webix/html";
import {isUndefined, copy} from "../../webix/helpers";


const Mixin = {
	_prePrint:function(options, htmlOnly){
		if(options.scroll && !htmlOnly) return true;

		options.header = isUndefined(options.header)?(this.config.header?true:false):options.header;
		options.footer = isUndefined(options.footer)?(this.config.footer?true:false):options.footer;
		options.xCorrection = options.xCorrection || 0; //spreadsheet
	},
	_findIndex:function(arr, func){
		var result = -1;
		for(var i =0; result<0 && i < arr.length; i++){
			if(func(arr[i]))
				result = i;
		}
		return result;
	},
	_getTableHeader:function(base, columns, group){

		var spans = {}, start = 0;

		base.forEach((tableArray, tid)=>{
			var row = tableArray[0], headerArray = [], length = row.length;

			row.forEach((cell, cid)=>{
				var column = columns[cid+start];

				for(var h  = 0; h< column[group].length; h++){
					var header = column[group][h];

					if(!header && !(spans[tid] && spans[tid][h])) continue;
					
					header = copy(header || {text:""});
					
					if(spans[tid] && spans[tid][h] && cid ===0){
						header.colspan = spans[tid][h];
						spans[tid][h] = 0;
					}

					if(header.colspan){
						var colspan = Math.min(header.colspan, (length-cid));
						spans[tid+1] = spans[tid+1] || {};
						spans[tid+1][h] = header.colspan-colspan;
						header.colspan = colspan;
					}
					if(header.rowspan){
						header.height = (header.height || this.config.headerRowHeight)*header.rowspan;
						header.rowspan = null;
					}
					
					var hcell = {
						txt: header.rotate ? this.getHeaderNode(column.id, h).innerHTML:
							(header.text || (header.contentId?this.getHeaderContent(header.contentId).getValue():"")),
						className:"webix_hcell "+"webix_"+group+"_cell "+(header.css || ""),
						style:{
							height:(header.height || this.config.headerRowHeight)+"px",
							width:header.colspan?"auto":column.width + "px"
						},
						span:(header.colspan || header.rowspan) ? {colspan:header.colspan || 1, rowspan:header.rowspan || 1}:null
					};
					headerArray[h] = headerArray[h] || [];
					headerArray[h][cid] = hcell;
				}
			});
			if(group =="header")
				base[tid] = headerArray.concat(tableArray);
			else
				base[tid] = tableArray.concat(headerArray);
			start+=length;
		});

		return base;
	},
	_getTableArray:function (options, base, start){
		var columns = this.config.columns;
		var sel = this.getSelectedId(true);
		var maxWidth = options.fit == "page" ? Infinity : this._getPageWidth(options);

		var rightRestriction = 0;
		var bottomRestriction = 0;
		var tableArray = [];
		var newTableStart = 0;
		var widths = [];

		start = start || (0 + options.xCorrection);
		base = base || [];

		const spans = this._spans_pull;
		const readySpans = {};

		if(spans)
			for (let row in spans)
				for (let column in spans[row]) {
					const span = spans[row][column];

					const hiddenRowOrder = this.data._filter_order;
					const hiddenColumnOrder = this._hidden_column_order;
					const startRowIndex = hiddenRowOrder ? hiddenRowOrder.find(row) : this.getIndexById(row);
					const startColIndex = hiddenColumnOrder.length ? hiddenColumnOrder.find(column) : this.getColumnIndex(column);

					const printSpan = {rowspan: 0, colspan: 0, css: span[5]||""};
					let firstVisibleRow = true;

					for(let r = startRowIndex; r < startRowIndex+span[1]; r++)
						if(this.getIdByIndex(r)){
							printSpan.rowspan++;
							for(let c = startColIndex; c < startColIndex+span[0]; c++){
								if(this.columnId(c)){
									if(firstVisibleRow)
										printSpan.colspan++;

									if(!readySpans[r])
										readySpans[r] = {};

									if(printSpan.$ready)
										readySpans[r][c] = {$inspan:true};
									else{
										readySpans[r][c] = printSpan;
										printSpan.$ready = true;
									}
								}
							}
							firstVisibleRow = false;
						}
				}

		this.eachRow(row => {
			var width = 0;
			var rowItem = this.getItem(row);
			var rowIndex = this.getIndexById(row);

			var colrow = [];
			var datarow = false;

			for(var c=start; c<columns.length; c++){
				var column = columns[c].id;
				var colIndex = this.getColumnIndex(column)-start;

				if(columns[c]){
					width += columns[c].width;
					if(rowIndex === 0)
						widths.push(columns[c].width);

					if(width > maxWidth && c > start){ // 'c>start' ensures that a single long column will have to fit the page
						newTableStart = c; break; }

					if(options.data !== "selection" || (options.data == "selection" && this._findIndex(sel, function(obj){
						return obj.column == column && obj.row == row;
					})!==-1)){
						let span;

						if(spans && readySpans[rowIndex] && readySpans[rowIndex][colIndex+start]){
							span = readySpans[rowIndex][colIndex+start];

							if(span.$inspan){
								colrow.push(span);
								rightRestriction = Math.max(colIndex+1, rightRestriction);
								bottomRestriction = Math.max(rowIndex+1, bottomRestriction);
								continue;
							}
						}

						const txt = this.getText(row, column);
						const className = this.getCss(row, column)+" "+(columns[c].css || "")+(span ? " webix_dtable_span "+span.css : "");

						const style  = {
							height:span && span.rowspan > 1 ? "auto": ((rowItem.$height || this.config.rowHeight) + "px"),
							width: span && span.colspan > 1 ? "auto": columns[c].width + "px"
						};

						colrow.push({ txt, className, style, span });

						if (txt || txt === 0) {
							rightRestriction = Math.max(colIndex+1, rightRestriction);
							bottomRestriction = Math.max(rowIndex+1, bottomRestriction);
						}
						datarow = datarow || !!txt;
					}
				}
			}

			if(!options.skiprows || datarow)
				tableArray.push(colrow);
		});

		if(bottomRestriction && rightRestriction){
			if(options.trim){
				tableArray.length = bottomRestriction;
				tableArray = tableArray.map(function(item){
					for(var i = item.length-1; i>=0; i--){
						if(item[i].span && item[i].span.colspan){
							item[i].span.colspan = Math.min(item[i].span.colspan, item.length-i);
							break;
						}
					}
					item.length = rightRestriction;
					return item;
				});
			}
			base.push(tableArray);
		}

		if(newTableStart) 
			this._getTableArray(options, base, newTableStart);
		else{
			//keep this order as logic relies on the first data row
			if(options.footer)
				base = this._getTableHeader(base, columns, "footer");
			if(options.header)
				base = this._getTableHeader(base, columns, "header");

			if(options.fit == "page") 
				this._correctWidth(base, widths, rightRestriction, options);
		}

		return base;
	},
	//a single grid tries to fit to page size - set column width to auto
	_correctWidth:function(base, widths, rightRestriction, options){
		if(rightRestriction && options.trim)
			widths.length = rightRestriction;

		let rwidth = 0;
		for(let i = 0; i < widths.length; i++)
			rwidth += widths[i];

		if(rwidth > this._getPageWidth(options))
			if(base[0])
				base[0].forEach((item) => {
					for(let i = 0; i < item.length; i++){
						if(item[i] && item[i].style && item[i].style.width)
							item[i].style.width = "auto";
					}
				});
	},
	_getTableHTML:function(tableData, options){
		const container = create("div");
		const sCount = this.config.topSplit || 0;
		const hCount = options.header ? this.config.columns[0].header.length : 0;
		const fCount = options.footer ? this.config.columns[0].footer.length : 0;

		//rows are not repeated on every page if header > 6
		const topSplitIndex = hCount + sCount;
		const headerCount = topSplitIndex > 6 ? hCount : topSplitIndex;

		tableData.forEach((table, i)=>{
			const tableHTML = create(
				"table",
				{
					class: "webix_table_print "+this.$view.className+(options.borderless?" borderless":""),
					style: "border-collapse:collapse",
					id: this.$view.getAttribute("id")
				},
				"<thead></thead><tbody></tbody><tfoot></tfoot>"
			);
			container.appendChild(tableHTML);
			const [header, body, footer] = tableHTML.children;

			table.forEach((row, rowIndex)=>{
				const tr = create("tr");

				row.forEach(cell => {
					if(!cell.$inspan){
						const td = create("td", {class: cell.className}, cell.txt);

						for(let key in cell.style)
							td.style[key] = cell.style[key];

						if(cell.span){
							td.colSpan = cell.span.colspan;
							td.rowSpan = cell.span.rowspan;
						}
						tr.appendChild(td);
					}
				});

				if(sCount && rowIndex + 1 == topSplitIndex)
					tr.className = "webix_print_top_split";

				if(rowIndex < headerCount)
					header.appendChild(tr);
				else if(table.length - fCount > rowIndex)
					body.appendChild(tr);
				else
					footer.appendChild(tr);
			});

			if(i+1 < tableData.length){
				const br = create("DIV", {class: "webix_print_pagebreak"});
				container.appendChild(br);
			}
		});

		return container;
	}
};

export default Mixin;