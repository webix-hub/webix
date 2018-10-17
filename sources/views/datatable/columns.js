import {toArray, PowerArray} from "../../webix/helpers";
import {assert} from "../../webix/debug";


const Mixin = {
	$init:function(){
		this._clear_hidden_state();	
		this.attachEvent("onStructureLoad", this._hideInitialColumns);
	},
	_clear_hidden_state:function(){
		this._hidden_column_hash = {};
		this._hidden_column_order = toArray();
		this._hidden_split=[0,0];
	},
	_hideInitialColumns:function(){
		var cols = this._columns;

		for(let i=0; i<cols.length; i++){
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
		for(var h = 0; h<elements.length;h++){
			var line = elements[h];
			if(line && line.colspan && !line.$colspan)
				line.$colspan = line.colspan;
		}
	},
	moveColumn:function(id, index){
		var start_index = this.getColumnIndex(id);
		if (start_index == index) return; //already in place
		var columns = this._settings.columns;

		var start = columns.splice(start_index,1);
		var pos = index - (index>start_index?1:0);
		PowerArray.insertAt.call(columns, start[0], pos);

		var order = this._hidden_column_order;
		// order exists even if columns are not reordered, so checking for length
		if (order.length){
			order = toArray(order);

			var hidden_index = order.find(id);
			order.removeAt(hidden_index);
			if (pos === 0)
				order.unshift(id);
			else { 
				order.insertAt(id, order.find(columns[pos-1].id)+1);
			}
		}

		//TODO: split handling
		//we can move split line when column dropped after it

		this._refresh_columns();
	},
	_init_horder:function(){
		var horder = this._hidden_column_order;
		var cols = this._settings.columns;
		if (!horder.length){
			for (let i=0; i<cols.length; i++)
				horder[i] = cols[i].id;
			this._hidden_split = [this._settings.leftSplit, this._rightSplit];
		}
	},
	isColumnVisible:function(id){
		return !this._hidden_column_hash[id];
	},
	hideColumn:function(id, opts, silent, mode){
		var cols = this._settings.columns;
		var horder = this._hidden_column_order;
		var hhash = this._hidden_column_hash;
		var column;
		var span = 1;
		opts = opts || {};

		if (mode!==false){
			
			let index = this.getColumnIndex(id);
			assert(index != -1, "hideColumn: invalid ID or already hidden");
			if(index === -1 || !this.callEvent("onBeforeColumnHide", [id])) return;

			//in case of second call to hide the same column, command will be ignored
			if (index == -1) return;

			this._init_horder();
			
			if(opts.spans){
				var header = cols[index].header;
				for(let i = 0; i<header.length; i++){
					if(header[i]){
						header[i].$groupSpan = header[i].colspan || 1;
						span = Math.max(span, header[i].$groupSpan);
					}
				}
			}

			if (index<this._settings.leftSplit)
				this._settings.leftSplit-=span;
			if (index>=this._rightSplit)
				this._settings.rightSplit-=span;
			else 
				this._rightSplit-=span;

			for (let i=index+span-1; i>=index; i--){
				this._hideColumn(index);
				column  = cols.splice(index, 1)[0];
				hhash[column.id] = column;
				column._yr0 = -1;
				delete this._columns_pull[column.id];
			}

			this.callEvent("onAfterColumnHide", [id]);
		} else {
			column = hhash[id];
			assert(column, "showColumn: invalid ID or already visible");

			//in case of second show command for already visible column - ignoring
			if(!column || !this.callEvent("onBeforeColumnShow", [id])) return;

			let prev = null;
			let i=0;
			let hindex = 0;
			for (; i<horder.length; i++){
				if (horder[i] == id){
					hindex = i;
					break;
				}
				if (!hhash[horder[i]])
					prev = horder[i];
			}

			let index = prev?this.getColumnIndex(prev)+1:0;
			
			if(opts.spans){
				let header = column.header;
				for(let i = 0; i<header.length; i++){
					if(header[i]){
						header[i].colspan = header[i].$groupSpan || header[i].colspan;
						delete header[i].$groupSpan;
						span = Math.max(span, (header[i].colspan || 1));
					}
				}
			}

			for (let i=hindex+span-1; i>=hindex; i--){
				let column = hhash[horder[i]];
				if(column){ //can be already shown by another action
					PowerArray.insertAt.call(cols, column, index);
					delete column.hidden;
					delete hhash[column.id];
					this._columns_pull[column.id] = column;
				}
				else
					span--;
			}

			if (hindex<this._hidden_split[0])
				this._settings.leftSplit+=span;
			if (hindex>=this._hidden_split[1])	
				this._settings.rightSplit+=span;
			else
				this._rightSplit+=span;


			this.callEvent("onAfterColumnShow", [id]);
		}

		if(column.header) this._fixColspansHidden(column, mode !== false ? 0 : 1, "header");
		if(column.footer) this._fixColspansHidden(column, mode !== false ? 0 : 1, "footer");

		if (!silent)
			this._refresh_columns();
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
	refreshColumns:function(columns, reset){
		if ((columns && columns != this.config.columns) || reset){
			this._clear_hidden_state();
			this._filter_elements = {};
			if (columns)
				this._rightSplit = columns.length - (this.config.rightSplit || 0);
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
		this._rightSplit = this._columns.length-this._settings.rightSplit;

		this._dtable_fully_ready = 0;
		this._define_structure();

		this.callEvent("onStructureUpdate");

		this._update_scroll();
		this.render();	
	},
	_refresh_columns:function(){
		this._dtable_fully_ready = 0;
		this.callEvent("onStructureUpdate");
		
		this._apply_headers();
		this.render();
	},
	showColumn:function(id, opts, silent){
		return this.hideColumn(id, opts, silent, false);
	},
	showColumnBatch:function(batch, mode){
		var preserve = typeof mode != "undefined";
		mode = mode !== false;

		this.eachColumn(function(id, col){
			if(col.batch){
				var hidden = this._hidden_column_hash[col.id];
				if (!mode) hidden = !hidden;

				if(col.batch == batch && hidden)
					this.hideColumn(col.id, { spans:true }, true,!mode);
				else if(!preserve && col.batch!=batch && !hidden)
					this.hideColumn(col.id, { spans:true }, true, mode);
			}
		}, true);

		this._refresh_columns();
	}
};

export default Mixin;