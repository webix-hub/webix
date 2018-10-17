import {pos, addCss, denySelect, removeCss, allowSelect, offset, posRelative} from "../../webix/html";
import {bind, delay} from "../../webix/helpers";
import {$$, ui} from "../../ui/core";
import {_event} from "../../webix/htmlevents";

//indirect import
import "../resizearea";

const Mixin = {

	resizeRow_setter:function(value){
		this._settings.scrollAlignY = false;
		this._settings.fixedRowHeight = false;
		return this.resizeColumn_setter(value);
	},
	resizeColumn_setter:function(value){
		if (value && this._rs_init_flag){
			_event(this._viewobj, "mousemove", this._rs_move, {bind:this});
			_event(this._viewobj, "mousedown", this._rs_down, {bind:this});
			_event(this._viewobj, "mouseup", this._rs_up, {bind:this});
			this._rs_init_flag = false;
		}
		return value;
	},
	_rs_init_flag:true,
	_rs_down:function(e){
		// do not listen to mousedown of subview on master
		if (this._settings.subview && this != $$(e.target||e.srcElement)) return;
		//if mouse was near border
		if (!this._rs_ready) return;
		this._rs_process = [pos(e),this._rs_ready[2]];
		addCss(document.body,"webix_noselect");
		denySelect();
	},
	_rs_up:function(){
		this._rs_process = false;
		removeCss(document.body,"webix_noselect");
		allowSelect();
	},
	_rs_start:function(){
		if(this._rs_progress)
			return;
		var dir  = this._rs_ready[0];
		var node = this._rs_process[1];
		var obj  = this._locate(node);
		if (!obj) return;

		var eventPos = this._rs_process[0];
		var start;

		if (dir == "x"){
			start = offset(node).x+this._rs_ready[1] - offset(this._body).x;
			eventPos = eventPos.x;
			if (!this._rs_ready[1]) obj.cind-=(node.parentNode.colSpan||1);
		} else {
			start = offset(node).y+this._rs_ready[1] - offset(this._body).y+this._header_height;
			eventPos = eventPos.y;
			if (!this._rs_ready[1]) obj.rind--;
		}
		if (obj.cind>=0 && obj.rind>=0){
			this._rs_progress = [dir, obj, start];
			
			var resize = new ui.resizearea({
				container:this._viewobj,
				dir:dir,
				eventPos:eventPos,
				start:start,
				cursor:(dir == "x"?"col":"row")+"-resize"
			});
			resize.attachEvent("onResizeEnd", bind(this._rs_end, this));
		}
		this._rs_down = this._rs_ready = false;
	},
	_rs_end:function(result){
		if (this._rs_progress){
			var dir = this._rs_progress[0];
			var obj = this._rs_progress[1];
			var newsize = result-this._rs_progress[2];
			if (dir == "x"){
				
				//in case of right split - different sizing logic applied
				if (this._settings.rightSplit && obj.cind+1>=this._rightSplit &&
					obj.cind !== this._columns.length - 1)
				{
					obj.cind++;
					newsize *= -1;
				}
				
				var column = this._columns[obj.cind];
				var oldwidth = column.width;
				delete column.fillspace;
				delete column.adjust;
				this._setColumnWidth(obj.cind, oldwidth + newsize, true, true);
				this._updateColsSizeSettings();
			}
			else {
				var rid = this.getIdByIndex(obj.rind);
				var oldheight = this._getRowHeight(this.getItem(rid));
				this.setRowHeight(rid, oldheight + newsize);
			}
			this._rs_up();
		}
		this._rs_progress = null;
	},
	_rs_move:function(e){
		var cell= null,
			config = this._settings;
		if (this._rs_ready && this._rs_process)
			return this._rs_start(e);

		e = e||event;
		var node = e.target||e.srcElement;
		var mode = false; //resize ready flag

		if (node.tagName == "TD" || node.tagName == "TABLE") return ;
		var element_class = node.className||"";
		var in_body = typeof element_class === "string" && element_class.indexOf("webix_cell")!=-1;
		//ignore resize in case of drag-n-drop enabled
		if (in_body && config.drag) return;
		var in_header = typeof element_class === "string" && element_class.indexOf("webix_hcell")!=-1;
		this._rs_ready = false;
		
		if (in_body || in_header){
			var dx = node.offsetWidth;
			var dy = node.offsetHeight;
			var pos = posRelative(e);

			var resizeRow = config.resizeRow;
			// if resize is only within the first column
			if(typeof resizeRow == "object" && resizeRow.headerOnly){
				cell = this._locate(node);
				if(cell.cind >0)
					resizeRow = false;
			}

			if (in_body && resizeRow){
				resizeRow = (typeof resizeRow == "object" && resizeRow.size?resizeRow.size:3);
				if (pos.y<resizeRow){
					if(!cell)
						cell = this._locate(node);
					// avoid resize header border
					if(cell.rind){
						this._rs_ready = ["y", 0, node];
						mode = "row-resize";
					}
				} else if (dy-pos.y<resizeRow+1){
					this._rs_ready = ["y", dy, node];
					mode = "row-resize";
				}
			}

			var resizeColumn = config.resizeColumn;
			// if resize is only within the header
			if(typeof resizeColumn == "object" && resizeColumn.headerOnly && in_body)
				resizeColumn = false;

			if (resizeColumn){
				resizeColumn = (typeof resizeColumn == "object" && resizeColumn.size?resizeColumn.size:3);

				if (pos.x<resizeColumn){
					this._rs_ready = ["x", 0, node];
					mode = "col-resize";
				} else if (dx-pos.x<resizeColumn+1){
					this._rs_ready = ["x", dx, node];
					mode = "col-resize";
				}
			}
		}
		
		//mark or unmark resizing ready state
		if (this._cursor_timer) window.clearTimeout(this._cursor_timer);
		this._cursor_timer = delay(this._mark_resize_ready, this, [mode], mode?100:0);
	},

	_mark_resize_ready:function(mode){
		if (this._last_cursor_mode != mode){
			this._last_cursor_mode = mode;
			this._viewobj.style.cursor=mode||"default";
		}
	}
};

export default Mixin;