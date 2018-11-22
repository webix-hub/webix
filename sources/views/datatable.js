import base from "../views/view";

//indirectly used views
import "../views/vscroll";

import env from "../webix/env";
import template from "../webix/template";
import type from "../webix/type";
import i18n from "../webix/i18n";
import datafilter from "../ui/datafilter";

import AreaSelect from "./datatable/areaselect";
import DataState from "../core/datastate";
import TablePaste from "../core/tablepaste";
import FilterMixin from "./datatable/filter";
import SelectionMixin from "./datatable/selection";
import BlockSelectMixin from "./datatable/blockselect";
import ResizeMixin from "./datatable/resize";
import TouchMixin from "./datatable/touch";
import SizeMixin from "./datatable/size";
import MathMixin from "./datatable/math";
import HeaderMenuMixin from "./datatable/hmenu";
import EditMixin from "./datatable/edit";
import ColumnsMixin from "./datatable/columns";
import KeyNavMixin from "./datatable/keynav";
import DragMixin from "./datatable/dnd";
import ValidationMixin from "./datatable/validation";
import PrintMixin from "./datatable/print";
import ExportMixin from "./datatable/export";
import SubRowMixin from "./datatable/subs";
import FreezeRowMixin from "./datatable/freeze";
import SpansMixin from "./datatable/spans";

import {addStyle, createCss, create, remove, getTextSize, _getClassName, index as getIndex} from "../webix/html";
import {protoUI, $$, ui} from "../ui/core";
import {$active} from "../webix/skin";
import {extend, uid, bind, delay, toFunctor, isUndefined, clone} from "../webix/helpers";
import {debug_size_box} from "../webix/debug";
import {assert} from "../webix/debug";
import {callEvent} from "../webix/customevents";

import DragControl from "../core/dragcontrol";
import DataCollection from "../core/datacollection";
import Number from "../core/number";
import AutoTooltip from "../core/autotooltip";
import Group from "../core/group";
import DataMarks from "../core/datamarks";
import DataLoader from "../core/dataloader";
import MapCollection from "../core/mapcollection";
import Settings from "../core/settings";
import CustomScroll from "../core/customscroll";
import Touch from "../core/touch";
import MouseEvents from "../core/mouseevents";
import EventSystem from "../core/eventsystem";
import EditAbility from "../core/editability";
import PagingAbility from "../core/pagingability";
import DataMove from "../core/datamove";
import CustomPrint from "../core/customprint";
import KeysNavigation from "../core/keysnavigation";
import DragItem from "../core/dragitem";
import ValidateCollection from "../core/validatecollection";

const api = {
	name:"datatable",
	defaults:{
		leftSplit:0,
		rightSplit:0,
		topSplit:0,
		columnWidth:100,
		minColumnWidth:20,
		minColumnHeight:26,
		prerender:false,
		autoheight:false,
		autowidth:false,
		header:true,
		fixedRowHeight:true,
		scrollAlignY:true,
		scrollX:true,
		scrollY:true,
		datafetch:50,
		navigation:true
	},
	$skin:function(){
		this.defaults.rowHeight = $active.rowHeight;
		this.defaults.headerRowHeight = $active.barHeight - $active.borderWidth*2;
	},
	on_click:{
		webix_richfilter:function(){
			return false;
		},
		webix_table_checkbox:function(e, id){
			id = this.locate(e);
			
			var item = this.getItem(id.row);
			var col = this.getColumnConfig(id.column);
			var trg = e.target|| e.srcElement;

			//read actual value from HTML tag when possible
			//as it can be affected by dbl-clicks
			var check = (trg.type == "checkbox")?trg.checked:(item[id.column] != col.checkValue);
			var value =  check ? col.checkValue : col.uncheckValue;

			var update = {};
			update[id.column] = value;
			this.updateItem(id.row, update, (this._settings.checkboxRefresh?"update":"save"));

			this.callEvent("onCheck", [id.row, id.column, value]);
			return false;
		},
		webix_table_radio:function(e){
			var id = this.locate(e);
			
			var item = this.getItem(id.row);
			var col = this.getColumnConfig(id.column);

			this.eachRow(function(rowid){
				var item = this.data.pull[rowid];
				if (item && item[id.column] == col.checkValue)
					item[id.column] = col.uncheckValue;
			});

			item[id.column] = col.checkValue;

			this.callEvent("onCheck", [id.row, id.column, true]);
			this.refresh();
			return false;
		}
	},
	on_dblclick:{
		webix_table_checkbox: function(){
			return this.on_click.webix_table_checkbox.apply(this,arguments);
		}
	},
	on_context:{
	},
	$init:function(config){
		this.on_click = extend({}, this.on_click);
		var html  = "<div class='webix_ss_header'><div class='webix_hs_left'></div><div class='webix_hs_center'></div><div class='webix_hs_right'></div></div><div class='webix_ss_body'><div class='webix_ss_left'><div class='webix_ss_center_scroll'></div></div>";
		html += "<div class='webix_ss_center'><div class='webix_ss_center_scroll' role='rowgroup'></div></div>";
		html += "<div class='webix_ss_right'><div class='webix_ss_center_scroll'></div></div></div>";
		html += "<div class='webix_ss_hscroll' role='scrollbar' aria-orientation='horizontal'></div><div class='webix_ss_footer'><div class='webix_hs_left'></div><div class='webix_hs_center'></div><div class='webix_hs_right'></div></div><div class='webix_ss_vscroll_header'></div><div class='webix_ss_vscroll' role='scrollbar' aria-orientation='vertical'></div><div class='webix_ss_vscroll_footer'></div>";

		this._contentobj.innerHTML = html;
		this._top_id = this._contentobj.id = this.name+uid();
		this._contentobj.className +=" webix_dtable";

		this._dataobj = this._contentobj;

		this._header = this._contentobj.firstChild;
		this._body = this._header.nextSibling;
		this._footer = this._body.nextSibling.nextSibling;

		this._viewobj.setAttribute("role", "grid");
		if(!config.editable) 
			this._viewobj.setAttribute("aria-readonly", "true");

		this.data.provideApi(this, true);
		this.data.attachEvent("onParse", bind(this._call_onparse, this));

		this.$ready.push(this._first_render);

		this._columns = [];
		this._hidden_column_order = [];
		this._headers = [];
		this._footers = [];
		this._rows_cache = [];
		this._active_headers = {};
		this._filter_elements = {};
		this._header_height = this._footer_height = 0;

		//component can create new view
		this._destroy_with_me = [];

		this.data.attachEvent("onServerConfig", bind(this._config_table_from_file, this));
		this.data.attachEvent("onServerOptions", bind(this._config_options_from_file, this));
		this.attachEvent("onViewShow", function(){
			this._restore_scroll_state();
			this._refresh_any_header_content();
		});
		this.data.attachEvent("onClearAll", bind(function(soft){
			if (!soft){
				this._scrollLeft = this._scrollTop = 0;
				if (this._x_scroll) this._x_scroll.reset();
				if (this._y_scroll) this._y_scroll.reset();
				this._setLeftScroll(0);
			}
		}, this));
		this.attachEvent("onDestruct", this._clean_config_struct);
		this.attachEvent("onKeyPress", this._onKeyPress);
		this.attachEvent("onScrollY", this._adjust_rows);

		callEvent("onDataTable", [this, config]);
	},
	_render_initial:function(){
		this._scrollSizeX = this._scrollSizeY = env.scrollSize;

		addStyle("#"+this._top_id +" .webix_cell { height:"+this._settings.rowHeight+"px; line-height:"+(this._settings.rowLineHeight || this._settings.rowHeight)+"px;" +(this._settings.fixedRowHeight?"":"white-space:normal;")+" }");
		addStyle("#"+this._top_id +" .webix_hcell { height:"+this._settings.headerRowHeight+"px; line-height:"+this._settings.headerRowHeight+"px;}");
		this._render_initial = function(){};
	},
	_first_render:function(){
		this.data.attachEvent("onStoreLoad", bind(this._refresh_any_header_content, this));
		this.data.attachEvent("onSyncApply", bind(this._refresh_any_header_content, this));
		this.data.attachEvent("onStoreUpdated", bind(function(){ return this.render.apply(this, arguments); }, this));
		this.data.attachEvent("onStoreUpdated", bind(this._refresh_tracking_header_content, this));
		this.render();
	},
	refresh:function(){
		this.render();
	},
	render:function(id, data, mode){
		//pure data saving call
		if (mode == "save") return;
		//during dnd we must not repaint anything in mobile webkit
		if (mode == "move"){
			var context = DragControl.getContext();
			if (context && context.fragile) return;
		}

		if (!this._columns.length){
			var cols = this._settings.columns;
			if (!cols || !cols.length) {
				if (this._settings.autoConfig && this.data.order.length && !this._hidden_column_order.length){
					this._dtable_fully_ready = 0;
					this._autoDetectConfig();
				} else
					return;
			}
			this._define_structure();
		}

		if (!this.isVisible(this._settings.id) || this.$blockRender)
			return this._render_initial(); //Chrome 34, Custom Font loading bug

		var fast_mode = this.config.experimental && !this._settings.subview;
		//replace multiple atomic updates by single big repaint
		if (id && data != -1 && (mode == "paint" || mode == "update") && !fast_mode){
			if (this._render_timer)
				clearTimeout(this._render_timer);

			if (!this._render_timer || this._render_timer_id == id){
				this._render_timer_id = id;
				this._render_timer = delay(function(){
					//if only one call - repaint single item
					this.render(id, -1, mode);
				}, this);
			} else {
				this._render_timer_id = null;
				this._render_timer = delay(function(){
					//if ther was a serie of calls - replace them with single full repaint
					this.render();
				}, this);
			}
			return;
		} else if (this._render_timer){
			clearTimeout(this._render_timer);
			this._render_timer = 0;
		}

		if (this.callEvent("onBeforeRender",[this.data])){

			this._render_initial();
			if (!this._dtable_fully_ready)
				this._apply_headers();

			if (this._content_width){
				if (fast_mode && (mode == "paint" || mode == "update") && id)
					this._repaint_single_row(id);
				else
					this._check_rendered_cols(true, true);
			}

			if (!id || mode!="update"){
				this._dtable_height = this._get_total_height();
				this._set_split_sizes_y();
			}

			//don't depend on hidden rows/rolumns
			this._viewobj.setAttribute("aria-colcount", Math.max(this._hidden_column_order.length, this._columns.length));
			this._viewobj.setAttribute("aria-rowcount", this.data.count());

			this.callEvent("onAfterRender",[this.data]);
			return true;
		}
	},
	getColumnConfig:function(id){
		return this._columns_pull[id] || this._hidden_column_hash[id];
	},
	_config_options_from_file:function(colls){
		for (var key in colls){
			var column = this.getColumnConfig(key);
			assert(column, "Orphan collection: "+key);
			var temp = new DataCollection({
				data:colls[key]
			});
			this._destroy_with_me.push(temp);
			this._bind_collection(temp, column);
		}
	},
	//xml has different configuration structure, fixing
	_config_table_from_file:function(config){
		if (config.columns && this._dtable_fully_ready)
			this.refreshColumns(null, true);
	},
	_define_structure:function(){
		if (this._settings.columns){
			this._columns = this._settings.columns;
			this._columns_pull = {};

			for (var i = 0; i < this._columns.length; i++){
				var col = this._columns[i];
				this._columns_pull[col.id] = col;

				var format = col.cssFormat;
				if (format)
					col.cssFormat = toFunctor(format, this.$scope);

				col.width = col.width||this._settings.columnWidth;
				if (typeof col.format == "string") 
					col.format = i18n[col.format]||window[col.format];
				if (col.numberFormat){
					var nformat = col.numberFormat;
					if (typeof nformat === "string")
						col.numberFormat = nformat = Number.getConfig(nformat);
					col.format = Number.numToStr(nformat);
					col.editFormat = col.editFormat || function(val){ return Number.format(val, nformat); };
					col.editParse = col.editParse || function(val){ return Number.parse(val, nformat); };
				}

				//default settings for checkboxes and radios
				if (isUndefined(col.checkValue)) col.checkValue = 1;
				if (isUndefined(col.uncheckValue)) col.uncheckValue = 0;
				
				if (col.css && typeof col.css == "object")
					col.css = createCss(col.css);

				var rawTemplate = col.template;
				if (rawTemplate){
					if (typeof rawTemplate == "string")
						rawTemplate = rawTemplate.replace(/#\$value#/g,"#"+col.id+"#");
					col.template = template(rawTemplate);
				}
			}

			this._normalize_headers("header", this._headers);
			this._normalize_headers("footer", this._footers);

			this.callEvent("onStructureLoad",[]);
		}
	},
	_define_structure_and_render:function(){
		this._apply_headers();
	},
	_clean_config_struct:function(){ 
		//remove column technical info from the column
		//it allows to reuse the same config object for new grid
		for (var i = 0; i < this._columns.length; i++){
			delete this._columns[i].attached;
			delete this._columns[i].node;
		}
	},
	_apply_headers:function(){
		this._rightSplit = this._columns.length-this._settings.rightSplit;
		this._dtable_width = 0;

		for (let i = 0; i < this._columns.length; i++){
			if (!this._columns[i].node){

				var temp = create("DIV");
				temp.style.width = this._columns[i].width + "px";
				this._columns[i].node = temp;
			}
			if (i>=this._settings.leftSplit && i<this._rightSplit)
				this._dtable_width += this._columns[i].width;
		}

		var marks = [];
		
		if (this._settings.rightSplit){
			var nr = this._columns.length-this._settings.rightSplit;
			marks[nr]  =" webix_first";
			marks[nr-1]=" webix_last";
		}
		if (this._settings.leftSplit){
			var nl = this._settings.leftSplit;
			marks[nl]  =" webix_first";
			marks[nl-1]=" webix_last";
		}
		marks[0]  = (marks[0]||"")+" webix_first webix_select_mark";
		var last_index = this._columns.length-1;
		marks[last_index] = (marks[last_index]||"")+" webix_last";


		for (let i=0; i<this._columns.length; i++){
			var node = this._columns[i].node;
			node.setAttribute("column", i);
			node.className = "webix_column "+(this._columns[i].css||"")+(marks[i]||"");
		}

		this._create_scrolls();		

		this._set_columns_positions();
		this._set_split_sizes_x();
		this._render_header_and_footer();

		this._dtable_fully_ready = true;
	},
	_set_columns_positions:function(){
		var left = 0;
		for (var i = 0; i < this._columns.length; i++){
			var column = this._columns[i];
			if (i == this._settings.leftSplit || i == this._rightSplit)
				left = 0;

			if (column.node){
				column.node.style.left = left+"px";
				if (this._settings.leftSplit || this._settings.rightSplit){
					remove(column.node);
					column.attached = false;
				}
			}
			left += column.width;
		}
	},
	_render_header_and_footer:function(){
		if (!this._header_fix_width)
			this._header_fix_width = 0;

		this._header_height = this._footer_height = 0;

		if (this._settings.header) {
			this._refreshHeaderContent(this._header, 0, 1);
			this._normalize_headers("header", this._headers);
			this._header_height = this._headers._summ;
			this._render_header_section(this._header, "header", this._headers);
		}
		if (this._settings.footer){
			this._refreshHeaderContent(this._footer, 0, 1);
			this._normalize_headers("footer", this._footers);
			this._footer_height = this._footers._summ;
			this._render_header_section(this._footer, "footer", this._footers);
		}	

		this.refreshHeaderContent(false, false);
		this._size_header_footer_fix();

		if (this._last_sorted)
			this.markSorting(this._last_sorted, this._last_order);
	},
	_getHeaderHeight:function(header, column, ind){
		var width = 0;
		var colspan = header.colspan || 1;
		var css = "webix_hcell "+(header.css||"");

		if(header.rotate)
			css += " webix_measure_rotate";
		else
			for(var i = 0; i<colspan; i++)
				width += this._columns[ind+i] ? this._columns[ind+i].width : this.config.columnWidth;
		
		var size = getTextSize(
			[header.text],
			css, 
			width
		);

		//+1 to compensate for scrollHeight rounding
		return (header.rotate ? size.width : size.height ) + 1;
	},
	_normalize_headers:function(collection, heights){
		var rows = 0;
		
		for (let i=0; i<this._columns.length; i++){
			let data = this._columns[i][collection];
			if (!data || typeof data != "object" || !data.length){
				if (isUndefined(data)){
					if (collection == "header")
						data = this._columns[i].id;
					else
						data = "";
				}
				data = [data];
			}
			for (let j = 0; j < data.length; j++){
				if (typeof data[j] != "object")
					data[j] = { text:data[j] };
				
				if (data[j] && data[j].height) heights[j] = data[j].height;
				if (data[j] && data[j].autoheight) heights[j] = this._getHeaderHeight(data[j], this._columns[i], i);
			}
			rows = Math.max(rows, data.length);
			this._columns[i][collection] = data;
		}

		heights._summ = rows;
		for (let i = rows-1; i >= 0; i--){
			heights[i] = heights[i] || this._settings.headerRowHeight;
			heights._summ += heights[i]*1;
		}

		//set null to cells included in col|row spans
		for (let i=0; i<this._columns.length; i++){
			var col = this._columns[i][collection];
			for (let j=0; j<col.length; j++){
				if (col[j] && col[j].rowspan)
					for (let z=1; z<col[j].rowspan; z++)
						col[j+z] = null;
				if (col[j] && col[j].colspan)
					for (let z=1; z<col[j].colspan; z++)
						this._columns[i+z][collection][j] = null;
			}
		}

		//auto-rowspan cells, which has not enough header lines
		for (let i=0; i<this._columns.length; i++){
			let data = this._columns[i][collection];
			if (data.length < rows){
				var end = data.length-1;
				data[end].rowspan = rows - data.length + 1;
				for (let j=end+1; j<rows; j++)
					data[j]=null;
			}
		}
		return rows;
	},
	_find_header_content:function(sec, id){
		var alltd = sec.getElementsByTagName("TD");
		for (var i = 0; i < alltd.length; i++)
			if (alltd[i].getAttribute("active_id") == id)
				return alltd[i];
	},
	getHeaderContent:function(id){
		var obj = this._find_header_content(this._header, id);
		if (!obj)
			obj = this._find_header_content(this._footer, id);

		if (obj){
			var config = this._active_headers[id];
			var type = datafilter[config.content];

			if (type.getHelper) return type.getHelper(obj, config);
			return {
				type: type,
				getValue:function(){ return type.getValue(obj); },
				setValue:function(value){ return type.setValue(obj, value); }
			};
		}
	},
	_summ_next:function(heights, start, i){
		var summ = i ? -1 : 0;

		i += start;
		for (start; start<i; start++) 
			summ+=heights[start] + 1;

		return summ;
	},
	_render_subheader:function(start, end, width, name, heights){
		if (start == end) return "";

		var html = "<table role='presentation' style='width:"+width+"px' cellspacing='0' cellpadding='0'>";
		html += "<tr class='webix_size_row'>";
		for (let i = start; i < end; i++)
			html += "<td style='width:"+this._columns[i].width+"px;'></td>";
		html += "</tr>";

		var count = this._columns[0][name].length;

		for (var j = 0; j < count; j++){
			html += "<tr section='"+name+"' role='row'>";
			for (let i = start; i < end; i++){
				var header = this._columns[i][name][j];
				if (header === null) continue;

				if (header.content){
					header.contentId = header.contentId||uid();
					header.columnId = this._columns[i].id;
					header.format = this._columns[i].format;

					assert(datafilter, "Filtering extension was not included");
					assert(datafilter[header.content], "Unknown content type: "+header.content);
					
					header.text = datafilter[header.content].render(this, header);
					this._active_headers[header.contentId] = header;
					this._has_active_headers = true;
				}

				html += "<td  role='presentation' column='"+(header.colspan?(header.colspan-1+i):i)+"'";

				var hcss = "";
				if (i==start)	
					hcss+="webix_first";
				var column_pos = i + (header.colspan?header.colspan-1:0);
				if (column_pos>=end-1)
					hcss+=" webix_last";
				if ((header.rowspan && j+header.rowspan === count) || j === count-1)
					hcss+=" webix_last_row";
				if (hcss)
					html+=" class=\""+hcss+"\"";
				
				var cell_height = heights[j];
				var sheight="";
				if (header.contentId)
					html+=" active_id='"+header.contentId+"'";
				if (header.colspan)
					html+=" colspan='"+header.colspan+"'";
				if (header.rowspan){
					html+=" rowspan='"+header.rowspan+"'";
					cell_height = this._summ_next(this._headers, j, header.rowspan);
				}

				if (cell_height != this._settings.headerRowHeight)
					sheight =" style='line-height:"+cell_height+"px; height:"+cell_height+"px;'";

				var css ="webix_hcell";
				var header_css = header.css;
				if (header_css){
					if (typeof header_css == "object")
						header.css = header_css = createCss(header_css);
					css+=" "+header_css;
				}
				if (this._columns[i].$selected)
					css += " webix_sel_hcell";
				
				html+="><div role='columnheader' class='"+css+"'"+sheight+">";
				
				var text = (header.text===""?"&nbsp;":header.text);
				if (header.rotate)
					text = "<div class='webix_rotate' style='width:"+(cell_height-10)+"px; transform-origin:center "+(cell_height-15)/2+"px;-webkit-transform-origin:center "+(cell_height-15)/2+"px;'>"+text+"</div>";

				html += text + "</div></td>";
			}
			html += "</tr>";
		}
		html+="</tr></table>";	

		return html;
	},
	showItemByIndex:function(row_ind, column_ind){
		var pager = this._settings.pager;
		if (pager){
			var target = Math.floor(row_ind/pager.size);
			if (target != pager.page)
				$$(pager.id).select(target);
		}

		//parameter will be set to -1, to mark that scroll need not to be adjusted
		var scroll = this.getScrollState();

		if (row_ind != -1){
			let state = this._get_y_range();
			if (row_ind < state[0]+1 || row_ind >= state[1]-1 ){
				//not visible currently
				let summ = this._getHeightByIndexSumm((pager?this.data.$min:0),row_ind);
				if (row_ind < state[0]+1){
					//scroll top - show row at top of screen
					summ = Math.max(0, summ-1) - this._top_split_height;
				} else {
					//scroll bottom - show row at bottom of screen
					summ += this._getHeightByIndex(row_ind) - this._dtable_offset_height;
					//because of row rounding we neet to scroll some extra
					//TODO: create a better heuristic
					if (row_ind>0)
						summ += this._getHeightByIndex(row_ind-1)-1;
				}

				scroll.y = summ;
			}
		}
		if (column_ind != -1){
			//ignore split columns - they are always visible
			if (column_ind < this._settings.leftSplit) return;
			if (column_ind >= this._rightSplit) return;

			//very similar to y-logic above
			let state = this._get_x_range();
			if (column_ind < state[0]+1 || column_ind >= state[1]-1 ){
				//not visible currently
				let summ = 0;
				for (var i=this._settings.leftSplit; i<column_ind; i++)
					summ += this._columns[i].width;

				/*jsl:ignore*/
				if (column_ind < state[0]+1){
					//scroll to left border
				} else {
					//scroll to right border
					summ += this._columns[column_ind].width - this._center_width;
				}	
				/*jsl:end*/
				scroll.x = summ;
			}
		}

		this.scrollTo(scroll.x, scroll.y);
	},
	showCell:function(row, column){
		if (!column || !row){ 
			//if column or row not provided - take from current selection
			var t=this.getSelectedId(true);
			if (t.length == 1){
				column = column || t[0].column;
				row = row || t[0].row;
			}
		}
		//convert id to index
		column = column?this.getColumnIndex(column):-1;
		row = row?this.getIndexById(row):-1;
		this.showItemByIndex(row, column);

	},
	scrollTo:function(x,y){
		if (!this._x_scroll) return;
		if (this._scrollTo_touch)
			return this._scrollTo_touch(x,y);

		if (x !== null)
			this._x_scroll.scrollTo(x);
		if (y !== null)
			this._y_scroll.scrollTo(y);
	},
	getScrollState:function(){
		if (this._getScrollState_touch)
			return this._getScrollState_touch();

		var diff =  this._render_scroll_shift?0:(this._render_scroll_diff||0);
		return {x:(this._scrollLeft||0), y:(this._scrollTop + diff)};
	},
	showItem:function(id){
		this.showItemByIndex(this.getIndexById(id), -1);
	},
	_render_header_section:function(sec, name, heights){
		sec.childNodes[0].innerHTML = this._render_subheader(0, this._settings.leftSplit, this._left_width, name, heights);
		sec.childNodes[1].innerHTML = this._render_subheader(this._settings.leftSplit, this._rightSplit, this._dtable_width, name, heights);
		sec.childNodes[1].onscroll = bind(this._scroll_with_header, this);
		sec.childNodes[2].innerHTML = this._render_subheader(this._rightSplit, this._columns.length, this._right_width, name, heights);
	},
	_scroll_with_header:function(){
		var active = this.getScrollState().x;
		var header = this._header.childNodes[1].scrollLeft;
		if (header != active)
			this.scrollTo(header, null);
	},
	_refresh_tracking_header_content:function(){
		this.refreshHeaderContent(true, true);
	},
	_refresh_any_header_content:function(){
		this.refreshHeaderContent(false, true);
	},
	//[DEPRECATE] - v3.0, move to private
	refreshHeaderContent:function(trackedOnly, preserve, id){
		if (this._settings.header){
			if (preserve) this._refreshHeaderContent(this._header, trackedOnly, 1, id);
			this._refreshHeaderContent(this._header, trackedOnly, 0, id);
		}
		if (this._settings.footer){
			if (preserve) this._refreshHeaderContent(this._footer, trackedOnly, 1, id);
			this._refreshHeaderContent(this._footer, trackedOnly, 0, id);
		}
	},
	refreshFilter:function(id){
		this.refreshHeaderContent(false, true, id);
	},
	_refreshHeaderContent:function(sec, cellTrackOnly, getOnly, byId){
		if (this._has_active_headers && sec){
			var alltd = sec.getElementsByTagName("TD");

			for (var i = 0; i < alltd.length; i++){
				if (alltd[i].getAttribute("active_id")){
					var obj = this._active_headers[alltd[i].getAttribute("active_id")];
					if (byId && byId != obj.columnId) continue;

					
					var content = datafilter[obj.content];

					if (getOnly){
						if (content.getValue)
							obj.value = content.getValue(alltd[i]);
					} else if (!cellTrackOnly || content.trackCells){
						content.refresh(this, alltd[i], obj);
					}
				}
			}
		}
	},
	headerContent:[],
	_set_size_scroll_area:function(obj, height, hdx){
		if (this._scrollSizeY){

			obj.style.height = Math.max(height,1)-1+"px";
			obj.style.width = (this._rightSplit?0:hdx)+this._scrollSizeY-1+"px";

			// temp. fix: Chrome [DIRTY]
			if (env.isWebKit)
				var w = obj.offsetWidth; //eslint-disable-line
		} else 
			obj.style.display = "none";
	},
	_size_header_footer_fix:function(){
		if (this._settings.header)
			this._set_size_scroll_area(this._header_scroll, this._header_height, this._header_fix_width);
		if (this._settings.footer)
			this._set_size_scroll_area(this._footer_scroll, this._footer_height, this._header_fix_width);
	},
	_update_scroll:function(){
		var hasX = !(this._settings.autowidth || this._settings.scrollX === false);
		this._scrollSizeX =  hasX ? env.scrollSize : 0;
		var hasY = !(this._settings.autoheight || this._settings.scrollY === false);
		this._scrollSizeY = hasY ? env.scrollSize : 0;
		if(env.touch)
			hasX = hasY = false;
		if (this._x_scroll){
			this._x_scroll._settings.scrollSize = this._scrollSizeX;
			this._x_scroll._settings.scrollVisible = hasX;
		}
		if (this._y_scroll){
			this._y_scroll._settings.scrollSize = this._scrollSizeY;
			this._y_scroll._settings.scrollVisible = hasY;
		}
	},
	_create_scrolls:function(){

		this._scrollTop = 0;
		this._scrollLeft = 0;
		var scrx, scry; scrx = scry = 1;

		if (this._settings.autoheight || this._settings.scrollY === false)
			scry = this._scrollSizeY = 0;
		if (this._settings.autowidth || this._settings.scrollX === false)
			scrx = this._scrollSizeX = 0;
		
		if (env.touch) scrx = scry = 0;

		if (!this._x_scroll){
			this._x_scroll = ui({
				view:"vscroll",
				container:this._footer.previousSibling,
				scrollWidth:this._dtable_width,
				scrollSize:this._scrollSizeX,
				scrollVisible:scrx
			});

			//fix for scroll space on Mac
			if (scrx && !this._scrollSizeX && !env.$customScroll)
				this._x_scroll._viewobj.style.position="absolute";

			this._x_scroll.attachEvent("onScroll", bind(this._onscroll_x, this));
		}

		if (!this._y_scroll){
			this._header_scroll = this._footer.nextSibling;
			var vscroll_view = this._header_scroll.nextSibling;
			this._footer_scroll = vscroll_view.nextSibling;

			this._y_scroll = ui({
				view:"vscroll",
				container:vscroll_view,
				scrollHeight:100,
				scroll:"y",
				scrollSize:this._scrollSizeY,
				scrollVisible:scry
			});

			this._y_scroll.activeArea(this._body);
			this._x_scroll.activeArea(this._body, true);
			this._y_scroll.attachEvent("onScroll", bind(this._onscroll_y, this));
		}

		if (this._content_width)
			this.callEvent("onResize",[this._content_width, this._content_height]);

		if (env.$customScroll)
			CustomScroll.enable(this);

		this._create_scrolls = function(){};
	},
	columnId:function(index){
		return this._columns[index].id;
	},
	getColumnIndex:function(id){
		for (var i = 0; i < this._columns.length; i++)
			if (this._columns[i].id == id) 
				return i;
		return -1;
	},
	_getNodeBox:function(rid, cid){
		var xs=0, xe=0, ye=0, ys=0;
		var i; var zone = 0;
		for (i = 0; i < this._columns.length; i++){
			if (this._rightSplit == i || this._settings.leftSplit == i){
				xs=0; zone++;
			}
			if (this._columns[i].id == cid) 
				break;
			xs+=this._columns[i].width;
		}
		xe+=this._columns[i].width;

		for (i = 0; i < this.data.order.length; i++){
			if (this.data.order[i] ==rid) 
				break;
			ys+=this._getHeightByIndex(i);
		}
		ye+=this._getHeightByIndex(i);
		return [xs,xe,ys-this._scrollTop,ye, this._body.childNodes[zone]];
	},
	_id_to_string:function(){ return this.row; },
	locate:function(node, idOnly){
		if (this._settings.subview && this != $$(node)) return null;

		node = node.target||node.srcElement||node;
		while (node && node.getAttribute){
			if (node === this.$view)
				break;
			var cs = _getClassName(node).toString();

			var pos = null;
			if (cs.indexOf("webix_cell")!=-1){
				pos = this._locate(node);
				if (pos) 
					pos.row = this.data.order[pos.rind];
			}
			if (cs.indexOf("webix_hcell")!=-1){
				pos = this._locate(node);
				if (pos)
					pos.header = true;
			}

			if (pos){
				if (idOnly) return pos.header ? null : pos.row;
				pos.column = this._columns[pos.cind].id;
				pos.toString = this._id_to_string;
				return pos;
			}

			node = node.parentNode;
		}
		return null;
	},
	_locate:function(node){
		var cdiv = node.parentNode;
		if (!cdiv) return null;
		var column = (node.getAttribute("column") || cdiv.getAttribute("column"))*1;
		var row = node.getAttribute("row") || 0;
		var span = (node.getAttribute("colspan") || cdiv.getAttribute("colspan"))*1;
		if (!row)
			for (var i = 0; i < cdiv.childNodes.length; i++)
				if (cdiv.childNodes[i] == node){
					if (i >= this._settings.topSplit)
						row = i+this._columns[column]._yr0 - this._settings.topSplit;
					else
						row = i;
				}

		return { rind:row, cind:column, span: span };
	},
	_correctScrollSize:function(){
		var center = -this._center_width;
		for (var i=0; i<this._columns.length; i++)
			center += this._columns[i].width;
		this._scrollLeft = Math.min(this._scrollLeft, Math.max(0, center));
	},
	_updateColsSizeSettings:function(silent){
		if (!this._dtable_fully_ready) return;

		this._correctScrollSize();
		this._set_columns_positions();
		this._set_split_sizes_x();
		this._render_header_and_footer();

		if (!silent)
			this._check_rendered_cols(false, false);
	},
	setColumnWidth:function(col, width, skip_update){
		return this._setColumnWidth( this.getColumnIndex(col), width, skip_update);
	},
	_setColumnWidth:function(col, width, skip_update, by_user){
		if (isNaN(width) || col < 0) return;
		var column = this._columns[col];

		if (column.minWidth && width < column.minWidth)
			width = column.minWidth;
		else if (width<this._settings.minColumnWidth)
			width = this._settings.minColumnWidth;		

		var old = column.width;
		if (old !=width){
			if (col>=this._settings.leftSplit && col<this._rightSplit)
				this._dtable_width += width-old;
			
			column.width = width;
			if (column.node) //method can be called from onStructLoad
				column.node.style.width = width+"px";
			else 
				return false;

			if(!skip_update)
				this._updateColsSizeSettings();

			this.callEvent("onColumnResize", [column.id, width, old, !!by_user]);
			return true;
		}
		return false;
	},
	_getRowHeight:function(row){
		return (row.$height || this._settings.rowHeight)+(row.$subopen?row.$subHeight:0);
	},
	_getHeightByIndex:function(index){
		var id = this.data.order[index];
		if (!id) return this._settings.rowHeight;
		return this._getRowHeight(this.data.pull[id]);
	},
	_getHeightByIndexSumm:function(index1, index2){
		if (this._settings.fixedRowHeight)
			return (index2-index1)*this._settings.rowHeight;
		else {
			var summ = 0;
			for (; index1<index2; index1++)
				summ += this._getHeightByIndex(index1);
			return summ;
		}
	},
	_cellPosition:function(row, column){
		var top;
		if (arguments.length == 1){
			column = row.column; row = row.row;
		}
		var item = this.getItem(row);
		var config = this.getColumnConfig(column);
		var left = 0;
		var parent = 0;

		for (var index=0; index < this._columns.length; index++){
			if (index == this._settings.leftSplit || index == this._rightSplit)
				left = 0;
			var leftcolumn = this._columns[index];
			if (leftcolumn.id == column){
				var split_column = index<this._settings.leftSplit ? 0 :( index >= this._rightSplit ? 2 : 1);
				parent = this._body.childNodes[split_column].firstChild;
				break;
			}

			left += leftcolumn.width;
		}


		if(this.getIndexById(row) < this._settings.topSplit)
			top = this._getHeightByIndexSumm(0,  this.getIndexById(row));
		else
			top = this._getHeightByIndexSumm((this._render_scroll_top||0)-this._settings.topSplit,  this.getIndexById(row)) + (this._render_scroll_shift||0);

		return {
			parent: parent,
			top:	top,
			left:	left,
			width:	config.width,
			height:	(item.$height || this._settings.rowHeight)
		};
	},
	_get_total_height:function(){
		var pager  = this._settings.pager;
		var start = 0;
		var max = this.data.order.length;
		
		if (pager){
			start = pager.size * pager.page;
			max = Math.min(max, start + pager.size);
			if (pager.level){
				start = this.data.$min;
				max = this.data.$max;
			}
		}

		return this._getHeightByIndexSumm(start, max);
	},
	setRowHeight:function(rowId, height){
		if (isNaN(height)) return;
		if (height<this._settings.minColumnHeight)
			height = this._settings.minColumnHeight;

		var item = this.getItem(rowId);
		var old_height = item.$height||this._settings.rowHeight;

		if (old_height != height){
			item.$height = height;
			this.config.fixedRowHeight = false;
			this.render();
			this.callEvent("onRowResize", [rowId, height, old_height]);
		}
	},
	_onscroll_y:function(value){
		var scrollChange = (this._scrollTop !== value);

		this._scrollTop = value;
		if (!this._settings.prerender){
			this._check_rendered_cols();
		}
		else {
			var conts = this._body.childNodes;
			for (var i = 0; i < conts.length; i++){
				conts[i].scrollTop = value;
			}
		}

		if (env.$customScroll) CustomScroll._update_scroll(this._body);
		if(scrollChange){
			this.callEvent("onScrollY",[]);
			this.callEvent("onAfterScroll",[]);
		}
	},
	_setLeftScroll:function(value){
		this._body.childNodes[1].scrollLeft = this._scrollLeft = value;
		if (this._settings.header)
			this._header.childNodes[1].scrollLeft = value;
		if (this._settings.footer)
			this._footer.childNodes[1].scrollLeft = value;
	},
	_onscroll_x:function(value){
		var scrollChange = (this._scrollLeft !== value);
		this._setLeftScroll(value);
		if (this._settings.prerender===false)
			this._check_rendered_cols(this._minimize_dom_changes?false:true);

		if (env.$customScroll) CustomScroll._update_scroll(this._body);

		if(scrollChange){
			this.callEvent("onScrollX",[]);
			this.callEvent("onAfterScroll",[]);
		}
	},
	_get_x_range:function(full){
		if (full) return [0,this._columns.length];

		var t = this._scrollLeft;
		
		var xind = this._settings.leftSplit;
		while (t>0 && this._columns.length - 1 > xind){
			t-=this._columns[xind].width;
			xind++;
		}
		var xend = xind;
		if (t && xind>0) xind--;

		t+=this._center_width;
		while (t>0 && xend<this._rightSplit){
			t-=this._columns[xend].width;
			xend++;
		}

		return [xind, xend];
	},
	getVisibleCount:function(){
		return Math.floor((this._dtable_offset_height) / this.config.rowHeight);
	},
	//returns info about y-scroll position
	_get_y_range:function(full){
		var t = this._scrollTop;
		var start = 0; 
		var end = this.count();

		//apply pager, if defined
		var pager = this._settings.pager;
		if (pager){
			start = pager.page*pager.size;
			end = Math.min(end, start+pager.size);
			if (pager.level){
				start = this.data.$min;
				end = this.data.$max;
			}
		}

		//in case of autoheight - request full rendering
		if (this._settings.autoheight)
			return [start, end, 0];

		
		

		if (full) return [start, end, 0];
		var xind = start;
		var topSplit = this._settings.topSplit || 0;
		if (topSplit)
			xind += topSplit;

		var rowHeight = this._settings.fixedRowHeight?this._settings.rowHeight:0;
		if (rowHeight){
			let dep = Math.ceil(t/rowHeight);
			t -= dep*rowHeight;
			xind += dep;
		} else
			while (t>0){
				t-=this._getHeightByIndex(xind);
				xind++;
			}

		//how much of the first cell is scrolled out
		var xdef = (xind>0 && t)?-(this._getHeightByIndex(xind-1)+t):0;
		var xend = xind;
		if (t) xind--;

		t+=(this._dtable_offset_height||this._content_height) - (this._top_split_height||0);

		if (rowHeight){
			let dep = Math.ceil(t/rowHeight);
			t-=dep*rowHeight;
			xend+=dep;
		} else {
			while (t>0 && xend<end){
				t-=this._getHeightByIndex(xend);
				xend++;
			}
		}

		if (xend>end)
			xend = end;

		return [xind, xend, xdef];
	},
	_repaint_single_row:function(id){
		var item = this.getItem(id);
		var rowindex = this.getIndexById(id);

		var state = this._get_y_range();
		var freeze = this.config.topSplit;
		var freezeCss = "";

		if (rowindex >= freeze){
			//row not visible
			if (rowindex < state[0] || rowindex >= state[1]) return;
			rowindex -= state[0]-freeze;
		} else {
			freezeCss = (rowindex == freeze-1) ? " webix_topcell webix_last_topcell" : " webix_topcell";
		}

		//get visible column
		var x_range = this._get_x_range();
		for (var i=0; i<this._columns.length; i++){
			var column = this._columns[i];

			//column not visible
			if (i < this._rightSplit && i >= this._settings.leftSplit && ( i<x_range[0] || i > x_range[1]))
				column._yr0 = -999; //ensure that column will not be reused

			if (column.attached && column.node){
				var node =  column.node.childNodes[rowindex];
				if (!node) continue;
				var value = this._getValue(item, this._columns[i], 0);

				node.innerHTML = value;
				node.className = this._getCss(this._columns[i], value, item, id) + freezeCss;
			}
		}
	},
	_check_rendered_cols:function(x_scroll, force){
		if (!this._columns.length) return;

		if (force)
			this._clearColumnCache();

		var xr = this._get_x_range(this._settings.prerender);
		var yr = this._get_y_range(this._settings.prerender === true);

		if (x_scroll){
			for (let i=this._settings.leftSplit; i<xr[0]; i++)
				this._hideColumn(i, force);
			for (let i=xr[1]; i<this._rightSplit; i++)
				this._hideColumn(i, force);
		}

		this._render_full_rows = [];

		for (let i=0; i<this._settings.leftSplit; i++)
			this._renderColumn(i,yr,force);
		for (let i=xr[0]; i<xr[1]; i++)
			this._renderColumn(i,yr,force, i == xr[0]);
		for (let i=this._rightSplit; i<this._columns.length; i++)
			this._renderColumn(i,yr,force);

		this._check_and_render_full_rows(yr[0], yr[1], force);
		this._check_load_next(yr);
	},
	_delete_full_rows:function(start, end){
		this._rows_cache_start = start;
		this._rows_cache_end = end;

		remove(this._rows_cache);
		this._rows_cache=[];
	},
	_adjust_rows:function(){
		if(this._settings.prerender && this._rows_body){
			var state = this.getScrollState();
			this._rows_body.style.top = "-"+(state.y||0) +"px";
		}
	},
	_check_and_render_full_rows:function(start, end, force){
		if (this._rows_body)
			this._rows_body.style.top = this._render_scroll_shift+"px";
		
		if (!force && start == this._rows_cache_start && end == this._rows_cache_end){
			if(this.config.topSplit){ //don't move split rows
				for (let i=0; i<this._render_full_rows.length; i++){
					let row = this._rows_cache[i];
					if(this._render_full_rows[i].index<this.config.topSplit){
						row.style.top = this._render_full_rows[i].top-this._render_scroll_shift+"px";
					}
				}
			}
			return;
		}

		this._delete_full_rows(start, end);

		if (this._render_full_row_some)
			this._render_full_row_some = false;
		else return;

		for (let i=0; i<this._render_full_rows.length; i++){
			var info = this._render_full_rows[i];
			var item = this.getItem(info.id);

			var value;
			if (typeof item.$row == "function"){
				value = item.$row.call(this, item, this.type);
			} else {
				value = this._getValue(item, this.getColumnConfig(item.$row), i);
			}

			let row = this._rows_cache[i] = create("DIV", null , value);
			row.className = "webix_cell "+(item.$sub ? ("webix_dtable_sub"+(this._settings.subview?"view":"row")) : "webix_dtable_colrow"+(item.$row?(" webix_topcell"+(this.data.getMark(item.id,"webix_selected")?" webix_selected":"")):""));
			row.setAttribute("column", 0);
			row.setAttribute("row", info.index);

			var height = (item.$height || this._settings.rowHeight);
			if (item.$subopen)
				row.style.height = item.$subHeight+"px";
			else 
				row.style.height = height +"px";
			row.style.paddingRight = env.scrollSize+"px";

			var topDelta = (this._render_full_rows[i].index<this.config.topSplit) ? -this._render_scroll_shift : 0;
			row.style.top = topDelta + info.top + (item.$subopen ? height-1 : 0) + "px";

			if (!this._rows_body){
				this._rows_body = create("DIV");
				this._rows_body.style.position = "relative";
				this._rows_body.style.top = this._render_scroll_shift+"px";
				this._body.appendChild(this._rows_body);
			}
			this._rows_body.appendChild(row);
			this.attachEvent("onSyncScroll", function(x,y,t){
				Touch._set_matrix(this._rows_body,0,y,t);
			});
			if (this._settings.subview)
				this.callEvent("onSubViewRender", [item, row]);
		}
	},
	_check_load_next:function(yr){
		var paging = this._settings.pager;
		var fetch = this._settings.datafetch;
		
		var direction = (!this._last_valid_render_pos || yr[0] >= this._last_valid_render_pos);
		this._last_valid_render_pos = yr[0];

		if (this._data_request_flag){
			if (paging && (!fetch || fetch >= paging.size))
				if (this._check_rows([0,paging.size*paging.page], Math.max(fetch, paging.size), true)) 
					return (this._data_request_flag = null);
					
			this._run_load_next(this._data_request_flag, direction);
			this._data_request_flag = null;
		} else {
			if (this._settings.loadahead)
				this._check_rows(yr, this._settings.loadahead, direction);
		}
	},
	_check_rows:function(view, count, dir){
		var start = view[1];
		var end = start+count;
		if (!dir){
			start = view[0]-count;
			end = view[0];
		}

		if (start<0) start = 0;
		end = Math.min(end, this.data.order.length-1);

		var result = false;			
		for (var i=start; i<end; i++)
			if (!this.data.order[i]){
				if (!result)
					result = { start:i, count:(end-start) };
				else {
					result.last = i;
					result.count = (i-start);
				}
			}
		if (result){			
			this._run_load_next(result, dir);
			return true;
		}
	},
	_run_load_next:function(conf, direction){
		var count = Math.max(conf.count, (this._settings.datafetch||this._settings.loadahead||0));
		var start = direction?conf.start:(conf.last - count+1);
		
		if (this._maybe_loading_already(conf.count, conf.start)) return;
		this.loadNext(count, start);
	},
	// necessary for safari only
	_preserveScrollTarget: function(columnNode){
		if (env.isSafari){
			var i, node, newNode, scroll,
				dir = [this._x_scroll, this._y_scroll];

			for(i = 0; i < 2; i++){
				scroll = dir[i];
				if(scroll && scroll._scroll_trg && scroll._scroll_trg.parentNode == columnNode){
					node = scroll._scroll_trg;
				}
			}

			if(node){
				if(this._scrollWheelTrg)
					remove(this._scrollWheelTrg);
				this._scrollWheelTrg = node;
				newNode  = node.cloneNode(true); // required for _hideColumn
				node.parentNode.insertBefore(newNode, node);
				this._scrollWheelTrg.style.display = "none";
				this._body.appendChild(this._scrollWheelTrg);
			}
		}
	},
	_hideColumn:function(index){
		var col = this._columns[index];

		// preserve target node for Safari wheel event
		this._preserveScrollTarget(col.node);
		remove(col.node);
		col.attached = false;
	},
	_clearColumnCache:function(){
		for (var i = 0; i < this._columns.length; i++)
			this._columns[i]._yr0 = -1;

		if (this._rows_cache.length){
			remove(this._rows_cache);
			this._rows_cache = [];
		}
	},
	getText:function(row_id, column_id){
		return this._getValue(this.getItem(row_id), this.getColumnConfig(column_id), 0);
	},
	getCss:function(row_id, column_id){
		var item = this.getItem(row_id);
		return this._getCss(this.getColumnConfig(column_id), item[column_id], item, row_id);
	},
	_getCss:function(config, value, item, id){
		var css = "webix_cell";
				
		if (config.cssFormat){
			var per_css = config.cssFormat(value, item, id, config.id);
			if (per_css){
				if (typeof per_css == "object")
					css+= " "+createCss(per_css);
				else
					css+=" "+per_css;
			}
		}

		var row_css = item.$css;
		if (row_css){
			if (typeof row_css == "object")
				item.$css = row_css = createCss(row_css);
			css+=" "+row_css;
		}

		var mark = this.data._marks[id];
		if (mark){
			if (mark.$css)
				css+=" "+mark.$css;
			if (mark.$cellCss){
				var mark_marker = mark.$cellCss[config.id];
				if (mark_marker)
					css+=" "+mark_marker;
			}
		}

		if (item.$cellCss){
			var css_marker = item.$cellCss[config.id];
			if (css_marker){
				if (typeof css_marker == "object")
					css_marker = createCss(css_marker);
				css += " "+css_marker;
			}
		}

		//cell-selection
		var selected = this.data.getMark(item.id,"webix_selected");
		if ((selected && (selected.$row || selected[config.id]))||config.$selected) css+=this._select_css;

		return css;
	},
	_getValue:function(item, config, i){
		if (!item)
			return "";

		var value;

		value = item[config.id];
		if (value === undefined || value === null)
			value = "";
		if (config.format)
			value = config.format(value);
		if (config.template)
			value = config.template(item, this.type, value, config, i);

		return value;
	},
	//we don't use render-stack, but still need a place for common helpers
	//so creating a simple "type" holder
	type:{
		checkbox:function(obj, common, value, config){
			var checked = (value == config.checkValue) ? "checked=\"true\"" : "";
			return "<input class='webix_table_checkbox' type='checkbox' "+checked+">";
		},
		radio:function(obj, common, value, config){
			var checked = (value == config.checkValue) ? "checked=\"true\"" : "";
			return "<input class='webix_table_radio' type='radio' "+checked+">";
		},
		editIcon:function(){
			return "<span class='webix_icon wxi-pencil'></span>";
		},
		trashIcon:function(){
			return "<span class='webix_icon wxi-trash'></span>";
		}
	},
	type_setter:function(value){
		if(!this.types || !this.types[value])
			type(this, value);
		else {
			this.type = clone(this.types[value]);
			if (this.type.css) 
				this._contentobj.className+=" "+this.type.css;
		}
		if (this.type.on_click)
			extend(this.on_click, this.type.on_click);

		return value;
	},
	_renderColumn:function(index,yr,force, single){
		var col = this._columns[index];
		if (!col.attached){
			var split_column = index<this._settings.leftSplit ? 0 :( index >= this._rightSplit ? 2 : 1);
			this._body.childNodes[split_column].firstChild.appendChild(col.node);
			col.attached = true;
			col.split = split_column;
		}

		this._render_scroll_top = yr[0];
		this._render_scroll_shift = 0;
		this._render_scroll_diff = yr[2];

		//if columns not aligned during scroll - set correct scroll top value for each column
		if (this._settings.scrollAlignY){
			if ((yr[1] == this.data.order.length) || (this.data.$pagesize && yr[1] % this.data.$pagesize === 0 )){
				col.node.style.top = (this._render_scroll_shift = yr[2])+"px";
			} else if (col._yr2)
				col.node.style.top = "0px";
		} else {
			this._render_scroll_shift = yr[2];
			col.node.style.top = yr[2]+"px";
		}

		if (!force  && (col._yr0 == yr[0] && col._yr1 == yr[1]) && (!this._settings.topSplit || col._render_scroll_shift==this._render_scroll_shift)) return 0;

		var html="";
		var config = this._settings.columns[index];
		var state = { 
			row: this._settings.rowHeight,
			total: 0,
			single: single
		};

		for (let i=0; i<this._settings.topSplit; i++)
			html += this._render_single_cell(i, config, yr, state, -this._render_scroll_shift, index);
		// ignore not available rows in top-split area
		this._data_request_flag = null;
		
		for (let i = Math.max(yr[0], this._settings.topSplit); i < yr[1]; i++)
			html += this._render_single_cell(i, config, yr, state, -1, index);

		// preserve target node for Safari wheel event
		this._preserveScrollTarget(col.node);

		col.node.innerHTML = html;
		col._yr0=yr[0];
		col._yr1=yr[1];
		col._yr2=yr[2];
		col._render_scroll_shift=this._render_scroll_shift;
		return 1;
	},
	_render_single_cell:function(i, config, yr, state, top, index){
		var id = this.data.order[i];
		var item = this.data.getItem(id);
		var html = "";

		if (item){
			var aria = " role='gridcell' aria-rowindex='"+(i+1)+"' aria-colindex='"+(this.getColumnIndex(config.id)+1)+"'"+
				(item.$count || item.$sub?(" aria-expanded='"+(item.open || item.$subopen?"true":"false")+"'"):"")+
				(item.$level?" aria-level='"+item.$level+"'":"");

			if (state.single && item.$row){
				this._render_full_row_some = true;
				this._render_full_rows.push({ top:state.total, id:item.id, index:i});
				if (!item.$sub){
					var rowHeight = (item.$height || state.row);
					state.total += rowHeight;
					return "<div"+aria+" class='webix_cell' style='height:"+rowHeight+"px;'></div>";
				}
			}
			var value = this._getValue(item, config, i);
			var css = this._getCss(config, value, item, id);
			var ariaSelect = " aria-selected='true' tabindex='0'";
			
			if(css.indexOf("select") !==-1 ){
				//in case of row/column selection - make only first cell focusable
				if(css.indexOf("row") !==-1){
					var xr = this._get_x_range();
					if(xr[0] === index) aria += ariaSelect;
				}
				else if(css.indexOf("col") !==-1){
					if(i === yr[0]) aria += ariaSelect;
				}
				else
					aria += ariaSelect;
			}
			
			var isOpen = !!item.$subopen;
			var margin = isOpen ? "margin-bottom:"+item.$subHeight+"px;" : "";

			if (top>=0){
				if (top>0) margin+="top:"+top+"px;'";
				css = "webix_topcell "+css;
				if(i == this._settings.topSplit-1)
					css = "webix_last_topcell "+css;
			}
			if (item.$height){
				html = "<div"+aria+" class='"+css+"' style='height:"+item.$height+"px;"+margin+"'>"+value+"</div>";
				state.total += item.$height - state.row;
			} else {
				html = "<div"+aria+" class='"+css+"'"+(margin?" style='"+margin+"'":"")+">"+value+"</div>";
			}

			if (isOpen)
				state.total += item.$subHeight;

		} else {
			html = "<div role='gridcell' class='webix_cell'></div>";
			if (!this._data_request_flag)
				this._data_request_flag = {start:i, count:yr[1]-i};
			else
				this._data_request_flag.last = i;
		}
		state.total += state.row;
		return html;
	},
	_set_split_sizes_y:function(){
		if (!this._columns.length || isNaN(this._content_height*1)) return;
		if (DEBUG) debug_size_box(this, ["y-sizing"], true);

		var wanted_height = this._dtable_height+(this._scrollSizeX?this._scrollSizeX:0);
		if ((this._settings.autoheight || this._settings.yCount) && this.resize())
			return;

		this._y_scroll.sizeTo(this._content_height, this._header_height, this._footer_height);
		this._y_scroll.define("scrollHeight", wanted_height);

		this._top_split_height = this._settings.topSplit ? this._getHeightByIndexSumm(0, this._settings.topSplit) : 0;
		this._dtable_offset_height =  Math.max(0,this._content_height-this._scrollSizeX-this._header_height-this._footer_height);
		for (var i = 0; i < 3; i++){

			this._body.childNodes[i].style.height = this._dtable_offset_height+"px";
			if (this._settings.prerender)
				this._body.childNodes[i].firstChild.style.height = this._dtable_height+"px";
			else
				this._body.childNodes[i].firstChild.style.height = this._dtable_offset_height+"px";
		}
		//prevent float overflow, when we have split and very small
		this._header.style.height = this._header_height+"px";
	},
	_set_split_sizes_x:function(){
		if (!this._columns.length) return;

		var index = 0; 
		this._left_width = 0;
		this._right_width = 0;
		this._center_width = 0;

		while (index<this._settings.leftSplit){
			this._left_width += this._columns[index].width;
			index++;
		}

		index = this._columns.length-1;
		
		while (index>=this._rightSplit){
			this._right_width += this._columns[index].width;
			index--;
		}

		if (!this._content_width) return; 

		if (this._settings.autowidth && this.resize())
			return;

		this._center_width = this._content_width - this._right_width - this._left_width - this._scrollSizeY;

		this._body.childNodes[1].firstChild.style.width = this._dtable_width+"px";

		this._body.childNodes[0].style.width = this._left_width+"px";
		this._body.childNodes[1].style.width = this._center_width+"px";
		this._body.childNodes[2].style.width = this._right_width+"px";
		this._header.childNodes[0].style.width = this._left_width+"px";
		this._header.childNodes[1].style.width = this._center_width+"px";
		this._header.childNodes[2].style.width = this._right_width+"px";
		this._footer.childNodes[0].style.width = this._left_width+"px";
		this._footer.childNodes[1].style.width = this._center_width+"px";
		this._footer.childNodes[2].style.width = this._right_width+"px";

		var delta = this._center_width - this._dtable_width;
		if (delta<0) delta=0; //negative header space has not sense

		if (delta != this._header_fix_width){
			this._header_fix_width = delta;
			this._size_header_footer_fix();
		}

		// temp. fix: Chrome [DIRTY]
		if (env.isWebKit){
			var w = this._body.childNodes[0].offsetWidth; //eslint-disable-line
			w = this._body.childNodes[1].offsetWidth;
			w = this._body.childNodes[1].firstChild.offsetWidth;
			w = this._body.childNodes[2].offsetWidth;
		}

		this._x_scroll.sizeTo(this._content_width-this._scrollSizeY);
		this._x_scroll.define("scrollWidth", this._dtable_width+this._left_width+this._right_width);
	},
	$getSize:function(dx, dy){
		if ((this._settings.autoheight || this._settings.yCount) && this._settings.columns){
			//if limit set - use it
			var desired = ((this._settings.yCount || 0) * this._settings.rowHeight);
			//else try to use actual rendered size
			//if component invisible - this is not valid, so fallback to all rows
			if (!desired) desired =  this.isVisible() ? this._dtable_height : (this.count() * this._settings.rowHeight);
			//add scroll and check minHeight limit
			this._settings.height = Math.max(desired+(this._scrollSizeX?this._scrollSizeX:0)-1, (this._settings.minHeight||0))+this._header_height+this._footer_height;
		}
		if (this._settings.autowidth && this._settings.columns)
			this._settings.width = Math.max(this._dtable_width+this._left_width+this._right_width+this._scrollSizeY,(this._settings.minWidth||0));

		
		var minwidth = this._left_width+this._right_width+this._scrollSizeY;
		var sizes = base.api.$getSize.call(this, dx, dy);


		sizes[0] = Math.max(sizes[0]||minwidth);
		return sizes;
	},
	_restore_scroll_state:function(){
		if (this._x_scroll && !env.touch){
			var state = this.getScrollState();
			this._x_scroll._last_scroll_pos = this._y_scroll._last_scroll_pos = -1;
			this.scrollTo(state.x, state.y);
		}
	},
	$setSize:function(){
		var oldw = this._content_width;
		var oldh = this._content_height;

		if (base.api.$setSize.apply(this, arguments)){
			if (this._dtable_fully_ready){
				this.callEvent("onResize",[this._content_width, this._content_height, oldw, oldh]);
				this._set_split_sizes_x();
				this._set_split_sizes_y();
			}
			this.render();
		}
	},
	_on_header_click:function(column){
		var col = this.getColumnConfig(column);
		if (!col.sort) return;

		var order = "asc";
		if (col.id == this._last_sorted)
			order = this._last_order == "asc" ? "desc" : "asc";
		
		this._sort(col.id, order, col.sort);
	},
	markSorting:function(column, order){
		if (!this._sort_sign)
			this._sort_sign = create("DIV");
		
		var parent = this._sort_sign.parentNode;
		if(parent){
			parent.removeAttribute("aria-sort");
			parent.removeAttribute("tabindex");
		}
		remove(this._sort_sign);

		if (order){
			var cell = this._get_header_cell(this.getColumnIndex(column));
			if (cell){
				this._sort_sign.className = "webix_ss_sort_"+order;
				cell.style.position = "relative";
				cell.appendChild(this._sort_sign);
				cell.setAttribute("aria-sort", order+"ending");
				cell.setAttribute("tabindex", "0");
			}

			this._last_sorted = column;
			this._last_order = order;
		} else {
			this._last_sorted = this._last_order = null;
		}
	},
	scroll_setter:function(mode){
		if (typeof mode == "string"){
			this._settings.scrollX = (mode.indexOf("x") != -1);
			this._settings.scrollY = (mode.indexOf("y") != -1);
			return mode;
		} else 
			return (this._settings.scrollX = this._settings.scrollY = mode);
	},
	_get_header_cell:function(column){
		var cells = this._header.getElementsByTagName("TD");
		var maybe = null;
		for (var i = 0; i<cells.length; i++)
			if (cells[i].getAttribute("column") == column && !cells[i].getAttribute("active_id")){
				maybe = cells[i].firstChild;
				if ((cells[i].colSpan||0) < 2) return maybe;
			}
		return maybe;
	},
	_sort:function(col_id, direction, type){
		direction = direction || "asc";
		this.markSorting(col_id, direction);

		if (type == "server"){
			this.callEvent("onBeforeSort",[col_id, direction, type]);
			this.loadNext(0, 0, {
				before:function(){
					this.clearAll(true);
				},
				success:function(){
					this.callEvent("onAfterSort",[col_id, direction, type]);
				}
			}, 0, 1);
		} else {
			if (type == "text"){
				this.data.each(function(obj){ obj.$text = this.getText(obj.id, col_id); }, this);
				type="string"; col_id = "$text";
			}

			if (typeof type == "function")
				this.data.sort(type, direction);
			else
				this.data.sort(col_id, direction, type || "string");
		}
	},
	_mouseEventCall: function( css_call, e, id, trg ) {
		var functor, i, res;
		if (css_call.length){
			for ( i = 0; i < css_call.length; i++) {
				functor = toFunctor(css_call[i], this.$scope);
				res = functor.call(this,e,id,trg);
				if (res===false) return false;
			}
		}
	},
	//because we using non-standard rendering model, custom logic for mouse detection need to be used
	_mouseEvent:function(e,hash,name,pair){
		e=e||event;
		var trg=e.target||e.srcElement;
		if (this._settings.subview && this != $$(trg)) return;

		//define some vars, which will be used below
		var css = "",
			css_call = [],
			found = false,
			id = null, 
			res;

		//loop through all parents
		while (trg && trg.parentNode && trg != this._viewobj.parentNode){
			var trgCss = _getClassName(trg);
			if ((css = trgCss)) {
				css = css.toString().split(" ");

				for (var i = css.length - 1; i >= 0; i--)
					if (hash[css[i]])
						css_call.push(hash[css[i]]);
			}

			if (trg.parentNode.getAttribute && !id){
				var column = trg.parentNode.getAttribute("column") || trg.getAttribute("column");
				if (column){ //we need to ignore TD - which is header|footer
					var  isBody = trg.parentNode.tagName == "DIV";
					
					//column already hidden or removed
					if(!this._columns[column]) return;
					
					found = true;
					if (isBody){
						var index = trg.parentNode.getAttribute("row") || trg.getAttribute("row");
						if (!index){
							//click event occurs on column holder, we can't detect cell
							if (trg.getAttribute("column")) return;
							index = getIndex(trg);
							if (index >= this._settings.topSplit) 
								index += this._columns[column]._yr0 - this._settings.topSplit;
						}

						this._item_clicked = id = { row:this.data.order[index], column:this._columns[column].id};
						id.toString = this._id_to_string;
					} else 
						this._item_clicked = id = { column:this._columns[column].id };
						
					//some custom css handlers was found
					res = this._mouseEventCall(css_call, e, id, trg);
					if (res===false) return;
					
					//call inner handler
					if (isBody ){
						if(this.callEvent("on"+name,[id,e,trg])&&pair){
							this.callEvent("on"+pair,[id,e,trg]);
						}
					}
					else if (name == "ItemClick"){
						var isHeader = (trg.parentNode.parentNode.getAttribute("section") == "header");
						if (isHeader && this.callEvent("onHeaderClick", [id, e, trg]))
							this._on_header_click(id.column);
					}
					css_call = [];
				} 
			}
			
			trg=trg.parentNode;
		}
		this._mouseEventCall(css_call, e, id, this.$view);
		return found;	//returns true if item was located and event was triggered
	},
	



	showOverlay:function(message){
		if (!this._datatable_overlay){
			var t = create("DIV", { "class":"webix_overlay" }, "");
			this._body.appendChild(t);
			this._datatable_overlay = t;
		}
		this._datatable_overlay.innerHTML = message;
	},
	hideOverlay:function(){
		if (this._datatable_overlay){
			remove(this._datatable_overlay);
			this._datatable_overlay = null;
		}
	},
	mapCells: function(startrow, startcol, numrows, numcols, callback, getOnly) {
		if (startrow === null && this.data.order.length > 0) startrow = this.data.order[0];
		if (startcol === null) startcol = this.columnId(0);
		if (numrows === null) numrows = this.data.order.length;
		if (numcols === null) numcols = this._settings.columns.length;

		if (!this.exists(startrow)) return;
		startrow = this.getIndexById(startrow);
		startcol = this.getColumnIndex(startcol);
		if (startcol === null) return;

		for (var i = 0; i < numrows && (startrow + i) < this.data.order.length; i++) {
			var row_ind = startrow + i;
			var row_id = this.data.order[row_ind];
			if(row_id){ //dyn loading
				var item = this.getItem(row_id);
				for (var j = 0; j < numcols && (startcol + j) < this._settings.columns.length; j++) {
					var col_ind = startcol + j;
					var col_id = this.columnId(col_ind);
					var result = callback(item[col_id], row_id, col_id, i, j);
					if (!getOnly)
						item[col_id] = result;
				}
			}
		}
	},
	_call_onparse: function(driver, data){
		if (!this._settings.columns && driver.getConfig)
			this.define("columns", driver.getConfig(data));
	},
	_autoDetectConfig:function(){
		var test = this.getItem(this.getFirstId());
		var res = this._settings.columns = [];
		for (var key in test)
			if (key != "id" && key[0] != "$")
				res.push({ id:key, header:key[0].toUpperCase()+key.substr(1), sort:"string", editor:"text" });
		if (res.length)
			res[0].fillspace = true;
		if (typeof this._settings.select == "undefined")
			this.define("select", "row");
	}
};

// #include ui/datatable/datatable_filter.js
// #include ui/datatable/datatable_selection.js
// #include ui/datatable/datatable_blockselect.js
// #include ui/datatable/datatable_resize.js
// #include ui/datatable/datatable_paging.js
// #include ui/datatable/datatable_clipboard.js
// #include ui/datatable/datatable_state.js
// #include ui/datatable/datatable_touch.js
// #include ui/datatable/datatable_size.js
// #include ui/datatable/datatable_math.js
// #include ui/datatable/datatable_edit.js
// #include ui/datatable/datatable_columns.js
// #include ui/datatable/datatable_keynav.js

// #include ui/datatable/datatable_dnd.js
// #include ui/datatable/datatable_validation.js

// #include ui/datatable/datatable_sparklines.js

// #include ui/datatable/datatable_print.js
// #include ui/datatable/datatable_export.js


const view = protoUI(
	api,
	AreaSelect, DataState, TablePaste,	DataMove,
	EditAbility, KeysNavigation, PagingAbility,
	CustomPrint, PrintMixin,
	ValidateCollection, ValidationMixin,
	ExportMixin, DragItem, DragMixin,
	KeyNavMixin, ColumnsMixin, EditMixin, MathMixin, HeaderMenuMixin,
	SizeMixin, TouchMixin, ResizeMixin, SubRowMixin,
	BlockSelectMixin, SelectionMixin, FilterMixin, FreezeRowMixin, SpansMixin,
	
	AutoTooltip, Group, DataMarks, DataLoader,  MouseEvents, MapCollection, base.view, EventSystem, Settings );

export default {api, view};