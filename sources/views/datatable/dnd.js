import {posRelative, offset, remove, removeCss, addCss} from "../../webix/html";
import {isArray, bind} from "../../webix/helpers";
import {$$} from "../../ui/core";
import DragItem from "../../core/dragitem";
import DragControl from "../../core/dragcontrol";


const Mixin = {
	drag_setter:function(value){
		// disable drag-n-drop for frozen rows
		this.attachEvent("onBeforeDrag", function(context){
			return this._checkDragTopSplit(context.source);
		});
		this.attachEvent("onBeforeDragIn", function(context){
			return this._checkDragTopSplit(context.target);
		});
		this.attachEvent("onBeforeDropOrder", function(startId, index){
			return index<0 || index >= this._settings.topSplit;
		});

		return DragItem.drag_setter.call(this,value);
	},
	_checkDragTopSplit: function(ids){
		var i, index,
			frozen = false;
		if(this._settings.topSplit && ids){
			if(!isArray(ids))
				ids = [ids];
			for(i=0; !frozen && i< ids.length;i++ ){
				index = this.getIndexById(ids[i]);
				frozen = index < this._settings.topSplit;
			}
		}
		return !frozen;
	},
	$dragHTML:function(item){
		var width = this._content_width - this._scrollSizeY;
		var html="<div class='webix_dd_drag' style='width:"+(width-2)+"px;'>";
		var cols = this._settings.columns;
		for (var i=0; i<cols.length; i++){
			var value = this._getValue(item, cols[i]);
			html += "<div style='width:"+cols[i].width+"px;'>"+value+"</div>";
		}
		return html+"</div>";
	},
	getHeaderNode:function(column_id, row_index){
		return this._getHeaderNode(column_id, row_index, this._header);
	},
	getFooterNode:function(column_id, row_index){
		return this._getHeaderNode(column_id, row_index, this._footer);
	},
	_getHeaderNode:function(column_id, row_index, group){
		if(this.isColumnVisible(column_id)){

			var ind = this.getColumnIndex(column_id);
			var hind = this._settings.leftSplit > ind ? 0 : (this._rightSplit <=ind ? 2 :1 );
			row_index = row_index || 0;
			
			var rows = group.childNodes[hind].getElementsByTagName("TR");
			if(rows.length){
				var nodes = rows[row_index+1].childNodes;
				for (var i=0; i<nodes.length; i++)
					if (nodes[i].getAttribute("column") == ind)
						return nodes[i].firstChild;
			}
		}
		return null;
	},
	getItemNode:function(id){
		if (id && !id.header){
			var row = id.row || id;
			var rowindex = this.getIndexById(row);
			var state = this._get_y_range();
			var minRow = state[0]-this._settings.topSplit;
			//row not visible
			if (rowindex < minRow && rowindex > state[1]) return;

			//get visible column
			var x_range = this._get_x_range();
			var colindex = this._settings.leftSplit ? 0 : x_range[0];
			if (id.column){
				colindex = this.getColumnIndex(id.column);
				//column not visible
				if (colindex < this._rightSplit && colindex >= this._settings.leftSplit && ( colindex<x_range[0] || colindex > x_range[1]))
					return;
			}

			var column = this._settings.columns[colindex];

			if (column.attached && column.node){
				var nodeIndex = rowindex < this._settings.topSplit?rowindex:(rowindex-minRow);
				return column.node.childNodes[nodeIndex];
			}

		}
	},
	dragColumn_setter:function(value){
		var control; //will be defined below
		if (value == "order"){
			control = {
				$drag:bind(function(s,e){
					var id = this.locate(e);
					if (this._rs_process || !id || !this.callEvent("onBeforeColumnDrag", [id.column, e])) return false;
					DragControl._drag_context = { from:control, start:id, custom:"column_dnd" };

					var column = this.getColumnConfig(id.column);

					this._relative_column_drag = posRelative(e);
					this._limit_column_drag = column.width;

					return "<div class='webix_dd_drag_column' style='width:"+column.width+"px'>"+(column.header[0].text||"&nbsp;")+"</div>";
				}, this),
				$dragPos:bind(function(pos, e, node){
					var context = DragControl.getContext();
					var box = offset(this.$view);
					node.style.display = "none";
					var html = document.elementFromPoint(pos.x, box.y+1);

					var id = (html?this.locate(html):null);

					var start = DragControl.getContext().start.column;

					if (id && id.column != start && (!this._column_dnd_temp_block || id.column != this._last_sort_dnd_node )){
						//ignore normal dnd , and dnd from other components
						if (context.custom == "column_dnd" && $$(html) == this){

							if (!this.callEvent("onBeforeColumnDropOrder",[start, id.column,e])) return;

							var start_index = this.getColumnIndex(start);
							var end_index = this.getColumnIndex(id.column);

							//on touch devices we need to preserve drag-start element till the end of dnd
							if(e.touches){
								this._dragTarget = e.target;
								this._dragTarget.style.display = "none";
								this.$view.parentNode.appendChild(this._dragTarget);
							}

							this.moveColumn(start, end_index+(start_index<end_index?1:0));
							this._last_sort_dnd_node = id.column;
							this._column_dnd_temp_block = true;
						}
					} if (id && id.column == start){
						//flag prevent flickering just after column move
						this._column_dnd_temp_block = false;
					}

					node.style.display = "block";

					pos.x = pos.x - this._relative_column_drag.x;
					pos.y = box.y;

					if (pos.x < box.x)
						pos.x = box.x; 
					else {
						var max = box.x + this.$view.offsetWidth - this._scrollSizeY-this._limit_column_drag;
						if (pos.x > max)
							pos.x = max;
					}
					DragControl._skip = true;
				
				}, this),
				$dragDestroy:bind(function(a, node){
					remove(node);
					//clean dnd source element
					if(this._dragTarget)
						remove(this._dragTarget);
					var id = DragControl.getContext().start;
					this.callEvent("onAfterColumnDropOrder",[id.column, this._last_sort_dnd_node, a]);
				}, this),
				$drop: function(){}
			};
		} else if (value) {
			control = {
				_inner_drag_only:true,
				$drag:bind(function(s,e){
					var id = this.locate(e);
					if (this._rs_process || !id || !this.callEvent("onBeforeColumnDrag", [id.column, e])) return false;
					DragControl._drag_context = { from:control, start:id, custom:"column_dnd" };

					var header = this.getColumnConfig(id.column).header;
					var text = "&nbsp;";
					for (var i = 0; i < header.length; i++)
						if (header[i]){
							text = header[i].text;
							break;
						}

					return "<div class='webix_dd_drag_column'>"+text+"</div>";
				}, this),
				$drop:bind(function(s,t,e){
					var target = e;
					//on touch devices event doesn't point to the actual drop target
					if(e.touches && this._drag_column_last)
						target = this._drag_column_last;

					var id = this.locate(target);

					if (!id) return false;
					var start = DragControl.getContext().start.column;
					if (start != id.column){
						if (!this.callEvent("onBeforeColumnDrop",[start, id.column ,e])) return;
						var start_index = this.getColumnIndex(start);
						var end_index = this.getColumnIndex(id.column);

						this.moveColumn(start, end_index+(start_index<end_index?1:0));
						this.callEvent("onAfterColumnDrop",[start, id.column, e]);
					}
				}, this),
				$dragIn:bind(function(s,t,e){
					var context = DragControl.getContext();
					//ignore normal dnd , and dnd from other components
					
					if (context.custom != "column_dnd" || context.from != control) return false;

					var target = (e.target||e.srcElement);
					while ((target.className||"").indexOf("webix_hcell") == -1){
						target = target.parentNode;
						if (!target) return;
					}

					if (target != this._drag_column_last){	//new target
						if (this._drag_column_last)
							removeCss(this._drag_column_last, "webix_dd_over_column");
						addCss(target, "webix_dd_over_column");
					}

					return (this._drag_column_last = target);
				}, this),
				$dragDestroy:bind(function(a,h){
					if (this._drag_column_last)
						removeCss(this._drag_column_last, "webix_dd_over_column");
					remove(h);
				}, this)
			};
		}

		if (value){
			DragControl.addDrag(this._header, control);
			DragControl.addDrop(this._header, control, true);
		}
	}
};

export default Mixin;