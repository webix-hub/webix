import {_to_array, _power_array, isUndefined} from "../../webix/helpers";
import {assert} from "../../webix/debug";


const Mixin = {
	$init:function(){
		this._clear_hidden_state();	
		this.attachEvent("onStructureLoad", this._hideInitialColumns);
	},
	_clear_hidden_state:function(){
		this._hidden_column_hash = {};
		this._hidden_column_order = _to_array();
		this._hidden_split = [0,0,0];
	},
	_hideInitialColumns:function(){
		const cols = this._columns;
		for (let i=0; i<cols.length; i++){
			if(cols[i].header) this._getInitialSpans(cols, cols[i].header);
			if(cols[i].footer) this._getInitialSpans(cols, cols[i].footer);
		}

		for (let i=cols.length-1; i>=0; i--){
			if (cols[i].hidden)
				this.hideColumn(cols[i].id, {}, true, true);
			else if (cols[i].batch && this.config.visibleBatch && cols[i].batch!=this.config.visibleBatch){
				this.hideColumn(cols[i].id, {}, true, true);
			}
		}
	},
	_getInitialSpans:function(cols, elements){
		for (let i=0; i<elements.length; i++){
			const line = elements[i];
			if (line && line.colspan && !line.$colspan)
				line.$colspan = line.colspan;
		}
	},
	moveColumn:function(id, index){
		this._moveColumn(id, index);
	},
	_moveColumn: function(id, index, hrIndex){
		const cindex = this.getColumnIndex(id);
		if (cindex == index || cindex == -1) return false; //already in place
		let cols;
		if(!isUndefined(hrIndex)){
			if(!this._check_source_span(cindex, index, hrIndex))
				return false;
			cols = this._get_span_columns(cindex, hrIndex, index);
			index += this._get_target_span_shift(cindex, index);
			if(cols){
				for(let i = 0; i < cols.length; i++){
					const inc = cindex > index?i:0;
					const sId = cols[i];
					if(this.getColumnIndex(sId) < 0 && i > 0){
						this._moveHiddenSpanColumn(sId, cols[0], i);
					}
					else
						this._changeColumnIndex(cols[i], index + inc, hrIndex);
				}
			}
		}
		if(!cols)
			this._changeColumnIndex(id, index, hrIndex);
		this._refresh_columns();
	},
	_changeColumnIndex: function(id, index, hrIndex){
		let cindex = this.getColumnIndex(id);
		const horder = this._hidden_column_order;
		const columns = this._settings.columns;

		let hindex;
		// handle colspan in another header line
		const header = columns[cindex].header;
		if(!isUndefined(hrIndex) && header && header[hrIndex]){
			const sourceSpan = header[hrIndex].colspan || 1;
			let batchChanged = false;
			for(let i = 0; i < header.length; i++){
				if(i != hrIndex && header[i] && header[i].colspan){
					const hI = header[i];
					const span = hI.colspan;
					if(span > sourceSpan){
						const nextCol = columns[cindex + sourceSpan];
						if(nextCol.batch && !columns[cindex].batch){
							batchChanged = true;
							columns[cindex].batch = nextCol.batch;
							delete nextCol.batch;
						}
						nextCol.header[i] = hI;
					}
				}
			}
			// drop to column with colspan settings
			const tIndex = index == columns.length? index-1: index;

			const tHeader = columns[tIndex].header;
			for(let i = 0; i < tHeader.length; i++){
				const span = tHeader[i] ? tHeader[i].colspan:1;
				if(i != hrIndex && span > 1 && cindex > tIndex && cindex <  tIndex + span){
					if(!batchChanged && columns[cindex].batch && !columns[tIndex].batch){
						columns[tIndex].batch = columns[cindex].batch;
						delete columns[cindex].batch;
					}
					header[i] = tHeader[i];
				}
			}
		}
		// remove from the previous place
		const col = columns.splice(cindex, 1)[0];

		if (horder.length){
			hindex = horder.find(id);
			horder.removeAt(hindex);
		}
		this._updateSplit(cindex, hindex, -1);

		// paste into new
		const nindex = index - (index>cindex ? 1 : 0);
		_power_array.insertAt.call(columns, col, nindex);

		let pos;
		if (horder.length){
			pos = 0;
			const prev = columns[nindex-1];
			if(prev && prev.id){
				let pId = prev.id;
				pos = this._getHiddenColumnIndex(pId);
				do{
					pos += 1;
					pId = horder[pos];
				} while (this.getColumnIndex(pId) < 0 && pos < horder.length);
			}
			horder.insertAt(col.id, pos);
		}
		this._updateSplit(nindex, pos, 1);
	},
	_moveHiddenSpanColumn: function(id, prevId, inc){
		const horder = this._hidden_column_order;
		// remove from the previous place
		let hindex = this._getHiddenColumnIndex(id);
		horder.removeAt(hindex);
		this._updateSplit(-1, hindex, -1);
		// paste into new
		const index = this._getHiddenColumnIndex(prevId) + inc;
		horder.insertAt(id, index);
		this._updateSplit(-1, index, 1);
	},
	_check_source_span: function(indexFrom, indexTo, hrIndex){
		if(indexTo > indexFrom)
			indexTo--;
		const fromSpan = (this._columns[indexFrom].header[hrIndex].colspan || 1) - 1;
		for(let i =0; i< this._columns.length; i++){
			const header = this._columns[i].header;
			for (let j = 0; j < header.length; j++){
				if(i != indexFrom || j != hrIndex){
					const span = header[j] && header[j].colspan || 1;
					const i1 = i + span - 1;
					if(span > 1 && i <= indexFrom && i1 >= (indexFrom + fromSpan) && (i > indexTo || i1 < indexTo))
						return false;
				}
			}
		}
		return true;
	},
	_get_target_span_shift: function(indexFrom, indexTo){
		for(let i =0; i< this._columns.length; i++){
			const header = this._columns[i].header;
			for (let j = 0; j < header.length; j++){
				if(i != indexFrom){
					const span = header[j] && header[j].colspan;
					if(span){
						const i1 = i + span - 1;
						if(i < indexTo && i1 >= indexTo && (i > indexFrom || i1 < indexFrom)){
							let newIndexTo = indexFrom > indexTo?i:i1+1;
							return newIndexTo - indexTo;

						}
					}
				}
			}
		}
		return 0;
	},
	_get_span_columns: function(cIndex, hrIndex){
		let columns, h = this._columns[cIndex].header;
		let span = h[hrIndex].colspan || 1;

		for(let i = 0; i < h.length; i++){
			if(h[i] && h[i].$colspan && h[i].$colspan > h[i].colspan)
				span = Math.max(span, h[i].$colspan);
		}

		if(span > 1){
			const id = this.columnId(cIndex);
			columns = [id];
			const hIndex = this._getHiddenColumnIndex(id);
			for( let i = hIndex+1; i < hIndex + span; i++)
				columns.push(this._getHiddenColumnId(i));
		}
		return columns;
	},
	_init_horder:function(horder, cols){
		if (!horder.length){
			for (let i=0; i<cols.length; i++)
				horder[i] = cols[i].id;
			this._hidden_split = [this._settings.leftSplit, this._rightSplit, this._settings.rightSplit];
		}
	},
	isColumnVisible:function(id){
		return !this._hidden_column_hash[id];
	},
	hideColumn:function(id, opts, silent, mode){
		const cols = this._settings.columns;
		const horder = this._hidden_column_order;
		const hhash = this._hidden_column_hash;
		let column, span = 1;
		opts = opts || {};

		if (mode!==false){
			const index = this.getColumnIndex(id);
			assert(index != -1, "hideColumn: invalid ID or already hidden");

			//in case of second call to hide the same column, command will be ignored
			if (index == -1 || !this.callEvent("onBeforeColumnHide", [id])) return;

			this._init_horder(horder, cols);
			
			if (opts.spans){
				const header = cols[index].header;

				for (let i=0; i<header.length; i++){
					if (header[i])
						span = Math.max(span, (header[i].colspan || 1));
				}
			}
			this._fixSplit(index, span, -1);

			for (let i=index+span-1; i>=index; i--){
				this._hideColumn(index);
				column  = cols.splice(index, 1)[0];
				hhash[column.id] = column;
				column._yr0 = -1;
				column.hidden = true;
				delete this._columns_pull[column.id];
			}

			this.callEvent("onAfterColumnHide", [id]);
		} else {
			column = hhash[id];
			assert(column, "showColumn: invalid ID or already visible");

			//in case of second show command for already visible column - ignoring
			if(!column || !this.callEvent("onBeforeColumnShow", [id])) return;

			let prev = null;
			let hindex = 0;
			for (let i=0; i<horder.length; i++){
				if (horder[i] == id){
					hindex = i;
					break;
				}
				if (!hhash[horder[i]])
					prev = horder[i];
			}

			if(opts.spans){
				let header = column.header;
				for(let i = 0; i<header.length; i++){
					if(header[i]){
						header[i].colspan = header[i].$colspan || header[i].colspan;
						span = Math.max(span, (header[i].colspan || 1));
					}
				}
			}

			const index = prev ? this.getColumnIndex(prev)+1 : 0;
			for (let i=hindex+span-1; i>=hindex; i--){
				const col = hhash[horder[i]];
				if (col){ //can be already shown by another action
					_power_array.insertAt.call(cols, col, index);
					delete col.hidden;
					delete hhash[col.id];
					this._columns_pull[col.id] = col;
				}
				else
					span--;
			}

			this._fixSplit(hindex, span, 1, true);
			this.callEvent("onAfterColumnShow", [id]);
		}

		if(column.header) this._fixColspansHidden(column, mode !== false ? 0 : 1, "header");
		if(column.footer) this._fixColspansHidden(column, mode !== false ? 0 : 1, "footer");

		if (horder.length === cols.length)
			this._clear_hidden_state();

		if (!silent)
			this._refresh_columns();
	},
	showColumn:function(id, opts, silent){
		return this.hideColumn(id, opts, silent, false);
	},
	_fixSplit:function(index, span, op, hidden){
		const [lSplit, rSplit] = hidden ? this._hidden_split : [this._settings.leftSplit, this._rightSplit];

		if (index < lSplit)
			this._settings.leftSplit += op*span;
		if (index >= rSplit)
			this._settings.rightSplit += op*span;
		else
			this._rightSplit += op*span;
	},
	_updateSplit:function(index, hindex, op){
		if (index >= 0){
			if (index < this._settings.leftSplit)
				this._settings.leftSplit += op;
			if (this._settings.rightSplit && index >= this._rightSplit)
				this._settings.rightSplit += op;
			else
				this._rightSplit += op;
		}

		const horder = this._hidden_column_order;
		if (horder.length && hindex >= 0){
			if (hindex < this._hidden_split[0])
				this._hidden_split[0] += op;
			if (this._hidden_split[2] && hindex >= this._hidden_split[1])
				this._hidden_split[2] += op;
			else
				this._hidden_split[1] += op;
		}
	},
	_fixColspansHidden:function(config, mod, elName){
		for (let i=config[elName].length - 1; i >= 0; i--) {
			var ind = this._hidden_column_order;
			var spanSource, isHidden = false, spanSize = 0;

			for (let j = 0; j < ind.length; j++) {
				let colConfig = this.getColumnConfig(ind[j]);
				let el = colConfig[elName][i];
				if (!this.isColumnVisible(ind[j])){
					//hidden column
					if (el && el.$colspan && spanSize <= 0){
						//start of colspan in hidden
						spanSize = el.colspan = el.$colspan;
						isHidden = spanSource = el;
					}
					if (spanSource && spanSize > 0){
						//hidden column in colspan, decrease colspan size
						spanSource.colspan--;
					}
				} else {
					//visible column
					if (isHidden && spanSize > 0 && spanSource && spanSource.colspan > 0){
						//bit start of colspan is hidden
						el = colConfig[elName][i] = spanSource;
						spanSource = el;
					} else if (el && el.$colspan && spanSize <= 0){
						//visible start of colspan
						spanSize = el.colspan = el.$colspan;
						spanSource = el;
					}
					isHidden = null;
				}
				spanSize--;
			}
		}
	},
	refreshColumns:function(columns){
		this._dtable_column_refresh = true;
		if (columns){
			this._clear_hidden_state();
			this._filter_elements = {};
		}

		this._columns_pull = {};
		//clear rendered data
		for (let i=0; i<this._columns.length; i++){
			var col = this._columns[i];
			this._columns_pull[col.id] = col;
			col.attached = col.node = null;
		}
		for (let i=0; i<3; i++){
			this._header.childNodes[i].innerHTML = "";
			this._body.childNodes[i].firstChild.innerHTML = "";
		}

		//render new structure
		this._columns = this.config.columns = (columns || this.config.columns);
		this._rightSplit = this._columns.length - (this.config.rightSplit || 0);

		this._dtable_fully_ready = 0;
		this._define_structure();
		this._update_scroll();

		this.callEvent("onStructureUpdate");

		this.render();
		this._dtable_column_refresh = false;
	},
	_refresh_columns:function(){
		this._dtable_fully_ready = 0;
		this.callEvent("onStructureUpdate");
		
		this._apply_headers();
		this.render();
	},
	showColumnBatch:function(batch, mode, silent){
		const preserve = !isUndefined(mode);
		mode = mode !== false;

		const sub = [];
		this.eachColumn(function(id, col){
			if (col.batch){
				let hidden = this._hidden_column_hash[col.id];
				if (!mode) hidden = !hidden;

				if(col.batch == batch && hidden)
					this.hideColumn(col.id, { spans:true }, true,!mode);
				else if(!preserve && col.batch!=batch && !hidden)
					this.hideColumn(col.id, { spans:true }, true, mode);
			}

			if (preserve && mode){
				const header = col.header;
				for (let i=0; i<header.length; i++)
					if (header[i] && header[i].batch && header[i].closed)
						sub.push(header[i].batch);
			}
		}, true);

		// hide closed batches
		for (let i=0; i<sub.length; i++)
			if (sub[i] != batch) this.showColumnBatch(sub[i], false, true);

		if (!silent)
			this._refresh_columns();
	},
	_getHiddenColumnIndex: function(id){
		if(this._hidden_column_order.length){
			for (var i = 0; i < this._hidden_column_order.length; i++)
				if (this._hidden_column_order[i] == id)
					return i;
			return -1;
		}
		return this.getColumnIndex(id);
	},
	_getHiddenColumnId: function(index){
		return this._hidden_column_order.length?this._hidden_column_order[index]:this.columnId(index);
	}
};

export default Mixin;