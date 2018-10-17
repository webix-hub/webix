import {pos} from "../webix/html";
import {ui} from "../ui/core";
import {bind} from "../webix/helpers";
import {event, eventRemove} from "../webix/htmlevents";
import template from "../webix/template";
import DragControl from "../core/dragcontrol";

//indirect UI import
import "../views/tooltip";

/*
	Behavior: AutoTooltip - links tooltip to data driven item
*/

const AutoTooltip = {
	tooltip_setter:function(value){
		if (value){
			if (typeof value == "function")
				value = { template:value };
			if (typeof value !== "object")
				value = {};

			var col_mode = !value.template;
			var t = new ui.tooltip(value);
			this._enable_mouse_move();
			var showEvent = this.attachEvent("onMouseMove",function(id,e){	//show tooltip on mousemove
				this._mouseEventX = e.clientX;
				this._mouseEventY = e.clientY;
				if (this.getColumnConfig){
					var config = t.type.column = this.getColumnConfig(id.column);
					if (col_mode){
						//empty tooltip - ignoring
						if (!config.tooltip && config.tooltip != undefined)
							return;
						var trg = e.target || e.srcElements;

						if(trg.getAttribute("webix_area") && config.tooltip){
							var area = trg.getAttribute("webix_area");
							t.type.template = function(obj,common){
								var values = obj[common.column.id];
								return template(config.tooltip).call(this,obj,common,values[area],area);
							};
						}
						else{
							if (config.tooltip)
								t.type.template = config.tooltip = template(config.tooltip);
							else {
								var text = this.getText(id.row, id.column);
								t.type.template = function(){ return text; };
							}
						}
					}
				}

				if (!DragControl.active)
					t.show(this.getItem(id.row || id),pos(e));
			});
			// [[IMPROVE]]  As we can can have only one instance of tooltip per page 
			//				this handler can be attached once per page, not once per component
			var hideEvent = event(document.body, "mousemove", bind(function(e){
				e = e||event;
				if(this._mouseEventX != e.clientX || this._mouseEventY != e.clientY)
					t.hide();
			},this));
			this.attachEvent("onDestruct",function(){
				if(this.config.tooltip)
					this.config.tooltip.destructor();
			});
			this.attachEvent("onAfterScroll", function(){
				t.hide();
			});
			t.attachEvent("onDestruct",bind(function(){
				this.detachEvent(showEvent);
				eventRemove(hideEvent);
			},this));

			return t;
		}
	}
};

export default AutoTooltip;