import {offset, pos as getPos} from "../webix/html";
import {delay} from "../webix/helpers";
import {$$} from "../ui/core";
import {define} from "../services";

import env from "../webix/env";

import DragItem from "../core/dragitem";
import DragControl from "../core/dragcontrol";


const DragOrder ={
	_do_not_drag_selection:true,
	$drag:function(s,e){
		var html = DragItem.$drag.call(this,s,e);
		if (html){
			var context = DragControl.getContext(); 
			if (this.getBranchIndex)
				this._drag_order_stored_left = this._drag_order_complex?((this.getItem(context.start).$level) * 16):0;
			if (!context.fragile)
				this.addCss(context.start, "webix_transparent");
		}
		return html;
	},
	_getDragItemPos: function(pos,e){
		return DragItem._getDragItemPos(pos,e);
	},
	$dragPos:function(pos,e, node){
		var box = offset(this.$view);
		var left = box.x + (this._drag_order_complex?( 1+this._drag_order_stored_left):1);
		var top = pos.y;
		var config = this._settings;
		var xdrag = (config.layout == "x");

		if (xdrag){
			top = box.y + (this._drag_order_complex?( + box.height - env.scrollSize - 1):1);
			left = pos.x;
		}

		node.style.display = "none";

		var html = document.elementFromPoint(left, top);

		if (html != this._last_sort_dnd_node){
			var view = $$(html);
			//this type of dnd is limited to the self
			if (view && view == this){
				var id = this.locate(html, true);
				// sometimes 'mousedown' on item is followed by 'mousemove' on empty area and item caanot be located
				if(!id && DragControl._saved_event)
					id = this.locate(DragControl._saved_event, true);
				
				var start_id = DragControl.getContext().start;
				this._auto_scroll_force = true;
				if (id){

					if (id != this._last_sort_dnd_node){
						if (id != start_id){
							var details, index;

							if (this.getBranchIndex){
								details = { parent:this.getParentId(id) }; 
								index = this.getBranchIndex(id);
							} else {
								details = {};
								index = this.getIndexById(id);
							}

							if (this.callEvent("onBeforeDropOrder",[start_id, index, e, details])){
								this.move(start_id, index, this, details);
								this._last_sort_dnd_node = id;
							}
						}
						DragControl._last = this._contentobj;
					}
				}
				else {
					id = "$webix-last";
					if (this._last_sort_dnd_node != id){
						if (!this.callEvent("onBeforeDropOrder",[start_id, -1, e, { parent: 0} ])) return;
						this._last_sort_dnd_node  = id;
					}
				}
			}
		}

		node.style.display = "block";

		
		if (xdrag){
			pos.y = box.y;
			pos.x = pos.x-18;

			if (pos.x < box.x)
				pos.x = box.x; 
			else {
				let max = box.x + this.$view.offsetWidth - 60;
				if (pos.x > max)
					pos.x = max;
			}
		} else {
			box.y += this._header_height;
			pos.x = this._drag_order_stored_left||box.x;
			pos.y = pos.y-18;
		
			if (pos.y < box.y)
				pos.y = box.y; 
			else {
				let max = box.y + this.$view.offsetHeight - 60;
				if (pos.y > max)
					pos.y = max;
			}
		}

		if (this._auto_scroll_delay)
			this._auto_scroll_delay = window.clearTimeout(this._auto_scroll_delay);

		this._auto_scroll_delay = delay(this._auto_scroll, this, [getPos(e), this.locate(e) || null],250);

		//prevent normal dnd landing checking
		DragControl._skip = true;
	},
	$dragIn:function(){
		return false;
	},
	$drop:function(s,t,e){
		if (this._auto_scroll_delay){
			this._auto_scroll_force = null;
			this._auto_scroll_delay = window.clearTimeout(this._auto_scroll_delay);
		}

		var context = DragControl.getContext();
		var id = context.start;
		this.removeCss(id, "webix_transparent");

		var index = this.getIndexById(id);
		this.callEvent("onAfterDropOrder",[id, index , e]);
		if (context.fragile)
			this.refresh();
	}
};

define("DragOrder", DragOrder);

export default DragOrder;