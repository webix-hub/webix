import {create} from "../webix/html";
import {bind, delay} from "../webix/helpers";
import env from "../webix/env";
import {_event} from "../webix/htmlevents";

import Touch from "../core/touch";
import CustomScroll from "../core/customscroll";

const Scrollable= {
	$init:function(config){
		//do not spam unwanted scroll containers for templates 
		if (config && !config.scroll && this._one_time_scroll) 
			return (this._dataobj = (this._dataobj||this._contentobj));
		
		(this._dataobj||this._contentobj).appendChild(create("DIV",{ "class" : "webix_scroll_cont" },""));
		this._dataobj=(this._dataobj||this._contentobj).firstChild;

		if(!env.touch || env.touch === "native")
			_event(this._viewobj,"scroll", bind(function(){
				if(this.callEvent)
					delay(function(){
						this.callEvent("onAfterScroll", []);
					}, this);
			},this));
	},
	/*defaults:{
		scroll:true
	},*/
	scroll_setter:function(value){
		if (!value) return false;
		var marker =  (value=="x"?"x":(value=="xy"?"xy":(value=="a"?"xy":"y")));
		if (Touch.$active && env.touch != "native"){
			this._dataobj.setAttribute("touch_scroll",marker);
			if (this.attachEvent)
				this.attachEvent("onAfterRender", bind(this._refresh_scroll,this));
			this._touch_scroll = true;
		} else {
			if (env.$customScroll){
				CustomScroll.enable(this, marker);
			} else {
				var node = this._dataobj.parentNode.style;
				if (value.toString().indexOf("a")!=-1){
					node.overflowX = node.overflowY = "auto";
				} else {
					if (marker.indexOf("x")!=-1){
						this._scroll_x = true;
						node.overflowX = "scroll";
					}
					if (marker.indexOf("y")!=-1){
						this._scroll_y = true;
						node.overflowY = "scroll";
					}
				}
			}
		}
		return marker;
	},
	_onoff_scroll:function(mode, dir){
		if (!!this._settings.scroll == !!mode) return;

		if (!env.$customScroll){
			var style = this._dataobj.parentNode.style;
			style[dir === "x" ? "overflowX" : "overflowY"] = mode ? "auto" : "hidden";
		}

		
		if (dir === "x"){
			this._scroll_x = mode;
		} else {
			this._scroll_y = mode;
		}
		this._settings.scroll = mode?dir:mode;
	},
	getScrollState:function(){
		if (Touch.$active){
			var temp = Touch._get_matrix(this._dataobj);
			return { x : -temp.e, y : -temp.f };
		} else
			return { x : this._dataobj.parentNode.scrollLeft, y : this._dataobj.parentNode.scrollTop };
	},
	scrollTo:function(x,y){
		if (Touch.$active && env.touch != "native"){
			y = Math.max(0, Math.min(y, this._dataobj.offsetHeight - this._content_height));
			x = Math.max(0, Math.min(x, this._dataobj.offsetWidth - this._content_width));
			Touch._set_matrix(this._dataobj, -x, -y, this._settings.scrollSpeed||"100ms");
		} else {
			this._dataobj.parentNode.scrollLeft=x;
			this._dataobj.parentNode.scrollTop=y;
		}
	},
	_refresh_scroll:function(){
		if (this._settings.scroll.toString().indexOf("x")!=-1){
			let x =  this._dataobj.scrollWidth;
			if (x){ //in hidden state we will have a Zero scrollWidth
				this._dataobj.style.width = "100%";
				this._dataobj.style.width = this._dataobj.scrollWidth + "px";
			}
		}
			
		if(Touch.$active && this._touch_scroll){
			Touch._clear_artefacts();
			Touch._scroll_end();
			var s = this.getScrollState();
			var dx = this._dataobj.offsetWidth - this.$width - s.x;
			var dy = this._dataobj.offsetHeight - this.$height - s.y;

			//if current scroll is outside of data area
			if(dx<0 || dy < 0){
				//scroll to the end of data area
				let x = (dx<0?Math.min(-dx - s.x,0):- s.x);
				let y = (dy<0?Math.min(-dy - s.y,0):- s.y);
				Touch._set_matrix(this._dataobj, x, y, 0);
			}
		}
	}
};

export default Scrollable;