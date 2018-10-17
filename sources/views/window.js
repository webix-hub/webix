import {pos as getPos, offset, remove} from "../webix/html";
import {protoUI, ui, $$} from "../ui/core";
import animate from "../webix/animate";
import {$active} from "../webix/skin";

import state from "../core/state";
import env from "../webix/env";
import UIManager from "../core/uimanager";
import Destruction from "../core/destruction";

import {zIndex} from "../ui/helpers";
import {bind, toNode, delay, clone, uid, toArray} from "../webix/helpers";
import {_event} from "../webix/htmlevents";
import {assert} from "../webix/debug";

import EventSystem from "../core/eventsystem";
import Movable from "../core/movable";
import Modality from "../core/modality";
import ResizeArea from "../core/resizearea";

import baseview from "./baseview";
import base from "./view";

state._popups = toArray();

const api = {
	name:"window",

	$init:function(config){
		this._viewobj.innerHTML = "<div class='webix_win_content'><div class='webix_win_head'></div><div class='webix_win_body'></div></div>";
		
		this._contentobj = this._viewobj.firstChild;
		this._headobj = this._contentobj.childNodes[0];
		this._dataobj = this._bodyobj = this._contentobj.childNodes[1];
		this._viewobj.className +=" webix_window";

		this._viewobj.setAttribute("role", "dialog");
		this._viewobj.setAttribute("tabindex", "0");
		
		this._head_cell = this._body_cell = null;
		this._settings._inner = {top:false, left:false, right:false, bottom:false }; //set border flags
		if (!config.id) config.id = uid();

		_event(this._contentobj, "click", bind(this._ignore_clicks, this));

		// IE8 does not allow to define event capturing
		if(this._contentobj.addEventListener)
			_event(this._contentobj, "click", function(){
				// brings a window to the front of other windows
				if(!this._settings.zIndex && this._settings.toFront){
					this._viewobj.style.zIndex = zIndex();
				}
			}, {bind:this, capture: true});

		// hidden_setter handling
		if(config.modal)
			this._modal = true;

		this.attachEvent("onViewMoveEnd", function(){
			if(this._settings.position)
				delete this._settings.position;
		});
	},
	_ignore_clicks:function(e){
		var popups = state._popups;
		var index = popups.find(this);
		if (index == -1)
			index = popups.length - 1;

		e.click_view = index;
		if (env.isIE8)
			e.srcElement.click_view = index;
	},
	getChildViews:function(){
		if (this._head_cell)
			return [this._head_cell, this._body_cell];
		else
			return [this._body_cell];
	},
	zIndex_setter:function(value){
		this._viewobj.style.zIndex = value;
		return value;
	},
	_remove:function(){ 
		this._body_cell = { destructor:function(){} };	
	},
	_replace:function(new_view){
		this._body_cell.destructor();
		this._body_cell = new_view;
		
		this._bodyobj.appendChild(this._body_cell._viewobj);

		var cell = this._body_cell._viewobj.style;
		cell.borderTopWidth = cell.borderBottomWidth = cell.borderLeftWidth = cell.borderRightWidth = "1px";
		this._body_cell._settings._inner = clone(this._settings._inner);

		this.resize(true);
	},
	show:function(node, mode, point){
		if (node === true){
			//recursive call from some child item
			if (!this._settings.hidden)
				return;
			node = null;
		}

		if(!this.callEvent("onBeforeShow",arguments))
			return false;

		this._settings.hidden = false;
		this._viewobj.style.zIndex = (this._settings.zIndex||zIndex());
		if (this._settings.modal || this._modal){
			this._modal_set(true);
			this._modal = null; // hidden_setter handling
		}

		var elPos, dx, dy;
		mode = mode || {};
		if (!mode.pos)
			mode.pos = this._settings.relative;

		//get position of source html node
		//we need to show popup which pointing to that node
		if (node){
			//if event was provided - get node info from it
			if (typeof node == "object" && !node.tagName){
				/*below logic is far from ideal*/
				if (node.target || node.srcElement){
					elPos = getPos(node);
					dx = 20;
					dy = 5;
				} else
					elPos = node;

				
			} else {
				node = toNode(node);
				assert(node,"Not existing target for window:show");
				elPos = offset(node);
			}	

			//size of body, we need to fit popup inside
			var x = Math.max(window.innerWidth || 0, document.body.offsetWidth);
			var y = Math.max(window.innerHeight || 0, document.body.offsetHeight);

			//size of node, near which popup will be rendered
			dx = dx || node.offsetWidth  || 0;
			dy = dy || node.offsetHeight || 0;
			//size of popup element
			var size = this._last_size;

			var fin_x = elPos.x;
			var fin_y = elPos.y;
			var point_y=0;
			var point_x = 0;
			var scrollLeft = 0, scrollTop = 0;
			var fit = this._settings.autofit;
			if (fit){
				var nochange = (fit === "node");
				var delta_x = 6; var delta_y=6; var delta_point = 6;
				if (!this._settings.point)
					delta_x = delta_y = delta_point = 0;

				//default pointer position - top 
				point = "top";
				fin_y=0; fin_x = 0;

				scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft;
				//if we want to place menu at righ, but there is no place move it to left instead
				if (x - elPos.x - dx < size[0] && mode.pos == "right" && !nochange)
					mode.pos = "left";

				if (mode.pos == "right"){
					fin_x = elPos.x+delta_x+dx; 
					delta_y = -dy;
					point = "left";
					point_y = Math.round(elPos.y+dy/2);
					point_x = fin_x - delta_point;
				} else if (mode.pos == "left"){
					fin_x = elPos.x-delta_x-size[0]-1;
					delta_y = -dy;
					point = "right";
					point_y = Math.round(elPos.y+dy/2);
					point_x = fin_x + size[0]+1;
				} else  {
					//left border of screen
					if (elPos.x < scrollLeft){
						fin_x = scrollLeft;
					//popup exceed the right border of screen
					} else if (x+scrollLeft-elPos.x > size[0]){
						fin_x = elPos.x; //aligned
					} else{
						fin_x = x+scrollLeft-delta_x-size[0]; //not aligned
					}

					point_x = Math.round(elPos.x+dx/2);
					//when we have a small popup, point need to be rendered at center of popup
					point_x = Math.min(point_x, fin_x + size[0] - delta_point*3);
				}
				
				//if height is not fixed - use default position
				scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
				if (((!size[1] || (y+scrollTop-dy-elPos.y-delta_y > size[1])) || nochange) && mode.pos != "top"){
					//bottom	
					fin_y = dy+elPos.y+delta_y - (!this._settings.point ? 0: 4);
					if (!point_y){
						point = "top";
						point_y = fin_y-delta_point;
					}
				} else {
					//top
					fin_y = elPos.y-delta_y - size[1];
					if (fin_y < 0){
						fin_y = 0; 
						//left|right point can be used, but there is no place for top point
						if (point == "top") point = false;
					} else if (!point_y){
						point = "bottom";
						fin_y --;
						point_y = fin_y+size[1]+1;
					}
				}
			}

			var deltax = (mode.x || 0);
			var deltay = (mode.y || 0);

			var fixed = this._checkFixedPosition();
			if (fixed){
				fin_y = fin_y - scrollTop;
				point_y = point_y - scrollTop;
			}

			this.setPosition(fin_x+deltax, fin_y+deltay);
			if (this._set_point){
				if (point && this._settings.point)
					this._set_point(point,point_x+deltax, point_y+deltay, fixed);
				else
					this._hide_point();
			}
		} else
			this._setPosition(this._settings.left, this._settings.top);

		this._viewobj.style.display = "block";
		this._hide_timer = 1;
		delay(function(){ this._hide_timer = 0; }, this, [], (env.touch ? 400 : 100 ));
		
		this._render_hidden_views();
		
		
		if (this.config.autofocus){
			this._prev_focus = UIManager.getFocus();
			UIManager.setFocus(this);
		}

		if (-1 == state._popups.find(this))
			state._popups.push(this);

		this.callEvent("onShow",[]);
	}, 
	_hide:function(e){
		//do not hide modal windows
		if (this._settings.hidden || this._settings.modal || this._hide_timer || (e && e.showpopup)) return;
		//do not hide popup, when we have modal layer above the popup
		if (state._modality && this._settings.zIndex <= state._modality) return;

		//ignore inside clicks and clicks in child-popups

		if (e){
			var index = env.isIE8 ? e.srcElement.click_view : e.click_view;
			if (!index && index !== 0) index = -1;

			var myindex = state._popups.find(this);

			if (myindex <= index) return;
		}

		this.hide();
	},
	hidden_setter:function(value){
		if(value) 
			this.hide();
		else
			this.show();
		return !!value;
	},
	hide:function(force){
		if (this.$destructed) return;

		if (!force)
			if(this._settings.hidden) return;

		if (this._settings.modal)
			this._modal_set(false);
			
		if (this._settings.position == "top"){
			animate(this._viewobj, {type: "slide", x:0, y:-(this._content_height+20), duration: 300,
				callback:this._hide_callback, master:this});
		}
		else 
			this._hide_callback();

		if (this._settings.autofocus){
			var el = document.activeElement;
			//as result of hotkey, we can have a activeElement set to document.body
			if (el && this._viewobj && (this._viewobj.contains(el) || el === document.body)){
				UIManager.setFocus(this._prev_focus);
				this._prev_focus = null;
			}
		}

		this._hide_sub_popups();
	},
	//hide all child-popups
	_hide_sub_popups:function(){
		var order = state._popups;
		var index = order.find(this);
		var size = order.length - 1;

		if (index > -1)
			for (var i = size; i > index; i--)
				if (order[i]._hide_point)	//hide only popups, skip windows
					order[i].hide();
		
		order.removeAt(index);
	},
	destructor: function() {
		this._modal_set(false);
		remove(this._viewobj);
		
		if (this._settings.autofocus){
			if (!state._final_destruction)
				UIManager.setFocus(this._prev_focus);
			this._prev_focus = null;
		}
		
		this._hide_sub_popups();
		if (this._hide_point)
			this._hide_point();
		Destruction.destructor.apply(this, []);
	},
	_hide_callback:function(){
		if (!this.$destructed){
			this._viewobj.style.display = "none";
			this._settings.hidden = true;
			this.callEvent("onHide",[]);
		}
	},
	close:function(){
		this.destructor(); 
	},
	_inner_body_set:function(value){
		if (typeof value.borderless == "undefined")
			value.borderless = true;
	},
	body_setter:function(value){
		if (typeof value != "object")
			value = {template:value };
		this._inner_body_set(value);

		state._parent_cell = this;
		this._body_cell = ui._view(value);

		this._bodyobj.appendChild(this._body_cell._viewobj);
		return value;
	},
	head_setter:function(value){
		if (value === false) return value;
		if (typeof value != "object"){
			this._viewobj.setAttribute("aria-label", value);
			value = { template:value, padding:0 };
		}
		
		value.borderless = true;

		state._parent_cell = this;
		this._head_cell = ui._view(value);

		this._headobj.appendChild(this._head_cell._viewobj);
		return value;
	},
	getBody:function(){
		return this._body_cell;
	},
	getHead:function(){
		return this._head_cell;
	},
	adjust:function(){ return this.resize(); },
	resizeChildren:function(){
		if (this._body_cell)
			this.resize();
	},
	resize:function(){
		baseview.api.adjust.call(this);
		if (this.isVisible()){
			this._setPosition(this._settings.left, this._settings.top);
		}
	},
	_checkFixedPosition: function() {
		if(this._settings.master) {
			var top = $$(this._settings.master).getTopParentView().$view;
			return top && top.style.position === "fixed";
		}
		return false;
	},
	_setPosition:function(x,y){
		if ((this._settings.position || this._checkFixedPosition())){
			this.$view.style.position = "fixed";

			var width = this._content_width;
			var height = this._content_height;
			if (width <= 0 || height <= 0) return;

			var maxWidth = (window.innerWidth||document.documentElement.offsetWidth);
			var maxHeight = (window.innerHeight||document.documentElement.offsetHeight);
			var left = Math.round((maxWidth-width)/2);
			var top = Math.round((maxHeight-height)/2);

			if (typeof this._settings.position == "function"){
				var state = { 	left:left, top:top, 
					width:width, height:height, 
					maxWidth:maxWidth, maxHeight:maxHeight };
				this._settings.position.call(this, state);

				if (state.width != width || state.height != height)
					this.$setSize(state.width, state.height);

				this.setPosition(state.left, state.top);
			} else {
				if (this._settings.position == "top"){
					if (animate.isSupported())
						top = -1*height;
					else
						top = 10;
				}
				//popup inside a fixed win
				if(!this._settings.position){
					left = this._settings.left || left;
					top = this._settings.top || top;
				}
				this.setPosition(left, top);
			}
			
			if (this._settings.position == "top")
				animate(this._viewobj, {type: "slide", x:0, y:height-((this._settings.padding||0)*2), duration: 300 ,callback:this._topPositionCallback, master:this});
		} else 
			this.setPosition(x,y);
	},
	_topPositionCallback:function(node){
		animate.clear(node);
		this._settings.top=-((this._settings.padding||0)*2);
		this.setPosition(this._settings.left, this._settings.top);
	},
	setPosition:function(x,y){
		this._viewobj.style.top = y+"px";
		this._viewobj.style.left = x+"px";
		this._settings.left = x; this._settings.top=y;
	},
	$getSize:function(dx, dy){
		var _borders = this._settings._inner;
		if (_borders){
			dx += (_borders.left?0:1)+(_borders.right?0:1);
			dy += (_borders.top?0:1)+(_borders.bottom?0:1);
		}
		//line between head and body
		if (this._settings.head)
			dy += 1;

		var size =  this._body_cell.$getSize(0,0);
		var headMinWidth = 0;
		if (this._head_cell){
			var head_size = this._head_cell.$getSize(0,0);
			if (head_size[3]==head_size[2])
				this._settings.headHeight = head_size[3];
			dy += this._settings.headHeight;
			headMinWidth = head_size[0];
		}

		if (this._settings.fullscreen){
			var width = window.innerWidth || document.body.clientWidth;
			var height = window.innerHeight || document.body.clientHeight;
			return [width, width, height, height];
		}

		//get layout sizes
		var self_size = base.api.$getSize.call(this, 0, 0);

		//use child settings if layout's one was not defined
		if (headMinWidth && size[1] > 100000)
			size[0] = Math.max(headMinWidth, size[0]);

		self_size[1] = Math.min(self_size[1],(size[1]>=100000&&self_size[1]>=100000?Math.max(size[0], self_size[0]):size[1])+dx);
		self_size[3] = Math.min(self_size[3],(size[3]>=100000&&self_size[3]>=100000?Math.max(size[2], self_size[2]):size[3])+dy);

		self_size[0] = Math.min(Math.max(self_size[0],size[0] + dx), self_size[1]);
		self_size[2] = Math.min(Math.max(self_size[2],size[2] + dy), self_size[3]);

		return self_size;
	},
	$setSize:function(x,y){
		base.api.$setSize.call(this,x,y);
		x = this._content_width;
		y = this._content_height;
		if (this._settings.head === false) {
			this._headobj.style.display="none";
			this._body_cell.$setSize(x,y);
		} else { 
			this._head_cell.$setSize(x,this._settings.headHeight);
			this._body_cell.$setSize(x,y-this._settings.headHeight);
		}
	},
	$skin:function(){
		this.defaults.headHeight = $active.barHeight;
	},
	defaults:{
		top:0,
		left:0,
		autofit:true,
		relative:"bottom",
		body:"",
		head:"",
		hidden: true,
		autofocus:true,
		minWidth:300,
		minHeight:200
	}
};

const view = protoUI(api, base.view, Movable, Modality, EventSystem, ResizeArea);
export default {api, view};