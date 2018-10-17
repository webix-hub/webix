import {offset, pos as getPos} from "../webix/html";
import {toNode, clone} from "../webix/helpers";
import DragControl from "../core/dragcontrol";

const Movable = {
	move_setter: function (value) {
		if (value){
			this._move_admin = clone(this._move_admin);
			this._move_admin.master = this;
			DragControl.addDrag(this._headobj?this._headobj:this.$view, this._move_admin);
		}
		return value;
	},
	_move_admin: {
		$dragCreate:function(object, e){
			if(this.master.config.move){
				var elOffset = offset(object);
				var elPos = getPos(e);
				DragControl.top = elOffset.y - elPos.y;
				DragControl.left = elOffset.x - elPos.x;

				return toNode(this.master._viewobj);
			}
		},
		$dragDestroy:function(node, drag){
			var view = this.master;
			if (view._settings){
				view._settings.top = parseInt(drag.style.top,10);
				view._settings.left = parseInt(drag.style.left,10);
			}

			DragControl.top = DragControl.left = 5;
			this.master.callEvent("onViewMoveEnd", []);
			return;
		},
		$dragPos:function(pos, e){
			this.master.callEvent("onViewMove", [pos, e]);
		}
	}
};

export default Movable;