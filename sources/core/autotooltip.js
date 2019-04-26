import {pos as getPos} from "../webix/html";
import {delay, extend} from "../webix/helpers";
import TooltipControl from "../core/tooltipcontrol";

//indirect UI import
import "../views/tooltip";

/*
	Behavior: AutoTooltip - links tooltip to data driven item
*/

const AutoTooltip = {
	tooltip_setter:function(value){
		if (value){
			if (typeof value === "function" || typeof value === "string")
				value = { template:value };
			if (typeof value !== "object")
				value = {};

			this._init_tooltip_once();
			return value;
		}
	},
	_init_tooltip_once:function(){
		TooltipControl.addTooltip(this);
		this.attachEvent("onDestruct",function(){
			TooltipControl.removeTooltip(this);
		});
		this.attachEvent("onAfterScroll", function(){
			if (TooltipControl._tooltip_exist)
				TooltipControl._hide_tooltip();
		});

		this._init_tooltip_once = function(){};
	},
	$tooltipIn:function(t){
		let tooltip = TooltipControl._tooltip;
		let def = extend({dx:20, dy:0, template:"{obj.value}", css:""}, this._settings.tooltip, true);

		tooltip.define( def );
		return t;
	},
	$tooltipOut:function(){
		TooltipControl._hide_tooltip();
		return null;
	},
	$tooltipMove:function(t,e,text){
		TooltipControl._tooltip.hide();

		clearTimeout(TooltipControl._before_show_delay);
		TooltipControl._before_show_delay = delay(this._show_tooltip,this,[t,e,text],TooltipControl.delay);
	},
	_show_tooltip:function(t,e,text){
		let data = text || this._get_tooltip_data(t,e);
		if (!data || !this.isVisible())
			return;

		TooltipControl._tooltip.show(data,getPos(e));
	},
	_get_tooltip_data:function(t,e){
		if (this.locate && this.getItem){
			let id = this.locate(e);
			if (!id) return null;

			return this.getItem(id);
		}
		return this._settings;
	}
};

export default AutoTooltip;