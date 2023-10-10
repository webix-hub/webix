import env from "../webix/env";
import ready from "../webix/ready";

import {event} from "../webix/htmlevents";
import {callEvent} from "../webix/customevents";
import {preventEvent, removeCss, addCss, addStyle} from "../webix/html";

//late binding
import {$$} from "../ui/core";

const Touch = {
	config:{
		longTouchDelay:700,
		scrollDelay:150,
		gravity:500,
		deltaStep:10,
		speed:"0ms",
		finish:1000,
		elastic:true
	},
	limit:function(value){
		Touch._limited = value !== false;	
	},
	disable:function(){
		Touch._disabled = true;
	},
	enable:function(){
		Touch._disabled = false;
	},
	$init:function(){
		Touch.$init = function(){};

		event(document.body, env.touch.down,	Touch._touchstart, {passive:false});
		event(document.body, env.touch.move, 	Touch._touchmove, {passive:false});
		event(document, env.touch.up, 	Touch._touchend);

		event(document.body,"dragstart",function(e){
			if(Touch._disabled || Touch._limited) return;
			return preventEvent(e);
		});

		Touch._clear_artefacts();
		Touch._scroll = [null, null];
		Touch.$active = true;
	},
	_clear_artefacts:function(){
		Touch._start_context = Touch._current_context = Touch._prev_context = Touch._scroll_context = null;
		Touch._scroll_mode = Touch._scroll_node = Touch._scroll_stat = Touch._long_touched = null;
		Touch._delta = 	{ _x_moment:0, _y_moment:0, _time:0 };

		if (Touch._css_button_remove){
			removeCss(Touch._css_button_remove,"webix_touch");
			Touch._css_button_remove = null;
		}
		
		window.clearTimeout(Touch._long_touch_timer);
		Touch._was_not_moved = true;
		Touch._axis_x = true;
		Touch._axis_y = true;
		if (!Touch._active_transion)
			Touch._scroll_end();
	},
	_touchend:function(e){
		if (Touch._start_context) {
			if (!Touch._scroll_mode) {
				if (!Touch._long_touched && !(Touch._axis_x * Touch._axis_y)) {
					const delta = Touch._get_delta(e);
					if (!Touch._axis_x && delta._x/(delta._y||1) > 4) {
						Touch._translate_event("onSwipeX");
					} else if (!Touch._axis_y && delta._y/(delta._x||1) > 4) {
						Touch._translate_event("onSwipeY");
					}
				}
			} else {
				let finish = Touch.config.finish;
				const temp = Touch._get_matrix(Touch._scroll_node);
				const x = temp.e;
				const y = temp.f;

				const delta = Touch._get_delta(e);
				const view = $$(Touch._scroll_node);

				const gravity = (view && view.$scroll) ? view.$scroll.gravity : Touch.config.gravity;
				if (delta._time) {
					const nx = x + gravity * delta._x_moment / delta._time;
					const ny = y + gravity * delta._y_moment / delta._time;

					const cnx = Touch._scroll[0] ? Touch._correct_minmax(nx, false, false, Touch._scroll_stat.dx, Touch._scroll_stat.px) : x;
					const cny = Touch._scroll[1] ? Touch._correct_minmax(ny, false, false, Touch._scroll_stat.dy, Touch._scroll_stat.py) : y;

					const size = Math.max(Math.abs(cnx - x), Math.abs(cny - y));
					if (size < 150)
						finish = finish * size / 150;

					if (cnx != x || cny != y)
						finish = Math.round(finish * Math.max((cnx - x) / (nx - x), (cny - y) / (ny - y)));

					const result = {e: cnx, f: cny};
					if (view && view.adjustScroll)
						view.adjustScroll(result);

					finish = Math.min(Touch.config.finish, Math.max(100, finish));
					if (x != result.e || y != result.f) {
						Touch._set_matrix(Touch._scroll_node, result.e, result.f, finish + "ms");
						if (Touch._scroll_master)
							Touch._scroll_master._sync_scroll(result.e, result.f, finish + "ms");
					} else {
						Touch._scroll_end();
					}
				} else
					Touch._scroll_end();
			}
			Touch._translate_event("onTouchEnd");
			Touch._clear_artefacts();
		}
	},
	_touchmove:function(e){
		if (!Touch._scroll_context || !Touch._start_context) return;

		var	delta = Touch._get_delta(e);
		Touch._translate_event("onTouchMove");

		if (Touch._scroll_mode){
			Touch._set_scroll_pos();
		} else {
			Touch._axis_x = Touch._axis_check(delta._x, "x", Touch._axis_x);
			Touch._axis_y = Touch._axis_check(delta._y, "y", Touch._axis_y);
			if (Touch._scroll_mode){
				var view = Touch._get_event_view("onBeforeScroll", true);
				if (view){
					var data = {};
					view.callEvent("onBeforeScroll",[data]);
					if (data.update){
						Touch.config.speed = data.speed;
						Touch.config.scale = data.scale;
					}
				}
				Touch._init_scroller(); //apply scrolling
			} else {
				const state = Touch._is_scroll();
				const view = $$(state && state[0]);		// support subviews
				if (view && view.$hasYScroll && view.$hasYScroll() && e.cancelable){
					return preventEvent(e);
				}
			}
		}

		if (Touch._scroll_mode && e.cancelable)
			return preventEvent(e);
	},
	_set_scroll_pos:function(){
		if (!Touch._scroll_node) return;
		var temp = Touch._get_matrix(Touch._scroll_node);
		var prev = Touch._prev_context || Touch._start_context;

		var view = $$(Touch._scroll_node);
		var elastic = (view && view.$scroll) ? view.$scroll.elastic : Touch.config.elastic;

		if (Touch._scroll[0])
			temp.e = Touch._correct_minmax( temp.e - prev.x + Touch._current_context.x , elastic, temp.e, Touch._scroll_stat.dx, Touch._scroll_stat.px);
		if (Touch._scroll[1])
			temp.f = Touch._correct_minmax( temp.f - prev.y + Touch._current_context.y , elastic, temp.f, Touch._scroll_stat.dy, Touch._scroll_stat.py);

		Touch._set_matrix(Touch._scroll_node, temp.e, temp.f, "0ms");
		if (Touch._scroll_master)
			Touch._scroll_master._sync_scroll(temp.e, temp.f, "0ms");
	},
	scrollTo:function(node, x, y, speed){
		Touch._set_matrix(node,x,y,speed);
	},
	_set_matrix:function(node, xv, yv, speed){
		if (!speed){
			node.style[env.transform] = "";
			return;
		}

		Touch._active_transion = true;
		if (node){
			var trans = Touch.config.translate || env.translate;
			node.style[env.transform] = trans+"("+Math.round(xv)+"px, "+Math.round(yv)+"px"+((trans=="translate3d")?", 0":"")+")";
			node.style[env.transitionDuration] = speed;
		}
	},
	_get_matrix:function(node){
		var matrix = window.getComputedStyle(node)[env.transform];
		var tmatrix;

		if (matrix == "none")
			tmatrix = {e:0, f:0};
		else {
			if(window.WebKitCSSMatrix)
				/* global WebKitCSSMatrix */
				tmatrix = new WebKitCSSMatrix(matrix);
			else {
				// matrix(1, 0, 0, 1, 0, 0) --> 1, 0, 0, 1, 0, 0
				var _tmatrix = matrix.replace(/(matrix\()(.*)(\))/gi, "$2");
				// 1, 0, 0, 1, 0, 0 --> 1,0,0,1,0,0
				_tmatrix = _tmatrix.replace(/\s/gi, "");
				_tmatrix = _tmatrix.split(",");

				tmatrix = {};
				var tkey = ["a", "b", "c", "d", "e", "f"];
				for(var i=0; i<tkey.length; i++){
					tmatrix[tkey[i]] = parseInt(_tmatrix[i], 10);
				}
			}
		}

		if (Touch._scroll_master)
			Touch._scroll_master._sync_pos(tmatrix);

		return tmatrix;
	},	
	_correct_minmax:function(value, allow, current, dx, px){
		if (value === current) return value;

		if (px > dx) return 0;

		const delta = Math.abs(value-current);
		const sign = delta/(value-current);
		if (value > 0)
			return allow ? (current + sign*Math.sqrt(delta)) : 0;

		const max = dx - px;
		if (max + value < 0)
			return allow ? (current + sign*Math.sqrt(delta)) : -max;

		return value;
	},	
	_init_scroll_node:function(node){
		if (!node.scroll_enabled){
			node.scroll_enabled = true;
			node.parentNode.style.position = "relative";
			node.style.cssText += "transition:transform; user-select:none; transform-style:flat;";
			node.addEventListener(env.transitionEnd, function(e){
				if (e.target === this) Touch._scroll_end.call(this);
			}, false);
		}
	},
	_init_scroller:function(){
		if (Touch._scroll_mode.indexOf("x") !== -1) Touch._scroll[0] = true;
		if (Touch._scroll_mode.indexOf("y") !== -1) Touch._scroll[1] = true;

		if (Touch._scroll[0] || Touch._scroll[1])
			Touch._scroll[2] = Touch._scroll_node;

		Touch._init_scroll_node(Touch._scroll_node);
	},
	_axis_check:function(value, mode, old){
		if (value > Touch.config.deltaStep){
			if (Touch._was_not_moved){
				Touch._long_move(mode);
				Touch._locate(mode);
				if ((Touch._scroll_mode||"").indexOf(mode) == -1) Touch._scroll_mode = "";
			}
			return false;
		}
		return old;
	},
	_scroll_end:function(){
		//sending event to the owner of the scroll only
		var result,state,view;
		view = $$(Touch._scroll_node||this);
		if (view){
			if (Touch._scroll_node)
				result = Touch._get_matrix(Touch._scroll_node);
			else if(view.getScrollState){
				state = view.getScrollState();
				result = {e:-state.x, f:-state.y};
			}
			callEvent("onAfterScroll", [result]);
			if (view.callEvent)
				view.callEvent("onAfterScroll",[result]);
		}
		if (!Touch._scroll_mode)
			Touch._scroll = [null, null];
		Touch._active_transion = false;
	},
	_long_move:function(){
		window.clearTimeout(Touch._long_touch_timer);
		Touch._was_not_moved = false;	
	},	
	_stop_old_scroll:function(e){
		if (Touch._scroll[2]){
			Touch._stop_scroll(e, (Touch._scroll[0] ? "x" : "y"));
		} else
			return true;
	},
	_touchstart :function(e){
		if (Touch._disabled) return;

		Touch._long_touched = null;
		Touch._scroll_context = Touch._start_context = env.touch.context(e);

		if (Touch._limited && !Touch._is_scroll())
			Touch._scroll_context = null;

		Touch._translate_event("onTouchStart");

		if (Touch._stop_old_scroll(e))
			Touch._long_touch_timer = window.setTimeout(Touch._long_touch, Touch.config.longTouchDelay);

		const element = $$(e);
		if (element && element.touchable && (!e.target.className || e.target.className.indexOf("webix_view") !== 0)){
			Touch._css_button_remove = element.getNode(e);
			addCss(Touch._css_button_remove,"webix_touch");
		}
	},
	_long_touch:function(){
		if(Touch._start_context){
			Touch._long_touched = true;
			Touch._translate_event("onLongTouch");
			callEvent("onClick", [Touch._start_context]);
		}
	},
	_stop_scroll:function(e, stop_mode){
		Touch._locate(stop_mode);
		if (Touch._scroll[2]){
			var view = Touch._get_event_view("onBeforeScroll", true);
			if (view)
				view.callEvent("onBeforeScroll", [Touch._start_context,Touch._current_context]);

			if (!Touch._scroll_node || Touch._scroll_node.parentNode !== Touch._scroll[2].parentNode){
				Touch._clear_artefacts();
				Touch._scroll_end();
				Touch._start_context = env.touch.context(e);
			}
		}
		Touch._touchmove(e);
	},	
	_get_delta:function(e){
		Touch._prev_context = Touch._current_context;
		Touch._current_context = env.touch.context(e);

		Touch._delta._x = Math.abs(Touch._start_context.x - Touch._current_context.x);
		Touch._delta._y = Math.abs(Touch._start_context.y - Touch._current_context.y);

		if (Touch._prev_context){
			if (Touch._current_context.time - Touch._prev_context.time < Touch.config.scrollDelay){
				Touch._delta._x_moment = Touch._delta._x_moment/1.3+Touch._current_context.x - Touch._prev_context.x;
				Touch._delta._y_moment = Touch._delta._y_moment/1.3+Touch._current_context.y - Touch._prev_context.y;
			} else {
				Touch._delta._y_moment = Touch._delta._x_moment = 0;
			}
			Touch._delta._time = Touch._delta._time/1.3+(Touch._current_context.time - Touch._prev_context.time);
		}

		return Touch._delta;
	},
	_get_sizes:function(node){
		return {
			dx:node.offsetWidth,
			dy:node.offsetHeight,
			px:node.parentNode.offsetWidth,
			py:node.parentNode.offsetHeight
		};
	},
	_is_scroll:function(locate_mode){
		var node = Touch._start_context.target;
		while(node && node.tagName != "BODY"){
			if (node.getAttribute){
				var mode = node.getAttribute("touch_scroll");
				if (mode && (!locate_mode || mode.indexOf(locate_mode) != -1))
					return [node, mode];
			}
			node = node.parentNode;
		}
		return null;
	},
	_locate:function(locate_mode){
		var state = Touch._is_scroll(locate_mode);
		if (state){
			Touch._scroll_mode = state[1];
			Touch._scroll_node = state[0];
			Touch._scroll_stat = Touch._get_sizes(state[0]);
		}
		return state;
	},
	_translate_event:function(name){
		callEvent(name, [Touch._start_context,Touch._current_context]);
		var view = Touch._get_event_view(name);
		if (view)
			view.callEvent(name, [Touch._start_context,Touch._current_context]);
	},
	_get_event_view:function(name, active){
		var view = $$(active ? Touch._scroll_node : Touch._start_context);
		if(!view) return null;

		while (view){
			if (view.hasEvent && view.hasEvent(name))
				return view;
			view = view.getParentView();
		}

		return null;
	},	
	_get_context:function(e){
		if (!e.touches[0]) {
			var temp = Touch._current_context;
			temp.time = new Date();
			return temp;
		}

		return {
			target:e.target,
			x:e.touches[0].pageX,
			y:e.touches[0].pageY,
			time:new Date()
		};
	},
	_get_context_m:function(e){
		return {
			target:e.target,
			x:e.pageX,
			y:e.pageY,
			time:new Date()
		};
	}
};

function touchInit(){
	if (env.touch){
		Touch.$init();

		//not full screen mode
		if (document.body.className.indexOf("webix_full_screen") === -1)
			Touch.limit(true);

		if (env.isSafari && CSS.supports("-webkit-overflow-scrolling: touch"))
			addStyle(".webix_view{ -webkit-overflow-scrolling:touch; } .webix_scroll_cont{ transform:translateZ(0px); }");
	}
}

ready(touchInit);

env.mouse = {
	down: "mousedown",
	move: "mousemove",
	up: "mouseup",
	context: Touch._get_context_m
};

env.touch = env.touch && {
	down: "touchstart",
	move: "touchmove",
	up: "touchend",
	context: Touch._get_context
};
	

export default Touch;