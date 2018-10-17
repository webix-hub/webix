import {offset} from "../webix/html";
import {delay} from "../webix/helpers";


const AutoScroll = {
	_auto_scroll:function(pos){
		var yscroll = 1;
		var xscroll = 0;

		var mode = this._settings.dragscroll;
		if (typeof mode == "string"){
			xscroll = mode.indexOf("x") != -1;
			yscroll = mode.indexOf("y") != -1;
		}

		var data = this._body || this.$view;
		var box = offset(data);

		var top = box.y;
		var bottom = top + data.offsetHeight;
		var left = box.x;
		var right = left + data.offsetWidth;

		var scroll = this.getScrollState();
		var reset = false;
		var sense = Math.max(this.type&&!isNaN(parseFloat(this.type.height))?this.type.height+5:0,40); //dnd auto-scroll sensivity

		if (yscroll){
			var config = this._settings;
			if(config.topSplit){
				var topSplitPos = this._cellPosition(this.getIdByIndex(config.topSplit-1), this.columnId(0));
				top += topSplitPos.top + topSplitPos.height;
			}

			if (pos.y < (top + sense)){
				this._auto_scrollTo(scroll.x, scroll.y-sense*2, pos);
				reset = true;
			} else if (pos.y > bottom - sense){
				this._auto_scrollTo(scroll.x, scroll.y+sense*2, pos);
				reset = true;
			}
		}

		if (xscroll){
			if (pos.x < (left + sense)){
				this._auto_scrollTo(scroll.x-sense*2, scroll.y, pos);
				reset = true;
			} else if (pos.x > right - sense){
				this._auto_scrollTo(scroll.x+sense*2, scroll.y, pos);
				reset = true;
			}
		}

		if (reset)
			this._auto_scroll_delay = delay(this._auto_scroll, this, [pos], 100);

	},
	_auto_scrollTo: function(x,y,pos){
		if(this.callEvent("onBeforeAutoScroll",[pos]))
			this.scrollTo(x,y);
	}
};

export default AutoScroll;