import ready from "../webix/ready";

import {assert} from "../webix/debug";
import {event, _event} from "../webix/htmlevents";
import {bind,delay,uid,PowerArray,isUndefined,isArray} from "../webix/helpers";
import {callEvent} from "../webix/customevents";
import {locate,preventEvent} from "../webix/html";

import {$$} from "../ui/core";
import state from "../core/state";

import {define} from "../services";


const UIManager = {
	_view: null,
	_hotkeys: {},
	_focus_time:0,
	_tab_time:0,
	_mouse_time:0,
	_controls: {
		"enter": 13,
		"tab": 9,
		"esc": 27,
		"escape": 27,
		"up": 38,
		"down": 40,
		"left": 37,
		"right": 39,
		"pgdown": 34,
		"pagedown": 34,
		"pgup": 33,
		"pageup": 33,
		"end": 35,
		"home": 36,
		"insert": 45,
		"delete": 46,
		"backspace": 8,
		"space": 32,
		"meta": 91,
		"win": 91,
		"mac": 91,
		"multiply": 106,
		"add": 107,
		"subtract": 109,
		"decimal": 110,
		"divide": 111,
		"scrollock":145,
		"pausebreak":19,
		"numlock":144,
		"5numlocked":12,
		"shift":16,
		"capslock":20
	},
	_inputs:{
		"input": 1,
		"button":1,
		"textarea":1,
		"select":1
	},
	_enable: function() {
		// attaching events here
		event(document.body, "click", bind(this._focus_click, this));
		event(document, "keydown", bind(this._keypress, this));
		_event(document.body, "mousedown", bind(function(){ this._mouse_time = new Date();}, this));

		if (document.body.addEventListener)
			event(document.body, "focus", this._focus_tab, { capture:true, bind: this });

		state.destructors.push({obj:this});
	},
	destructor:function(){
		UIManager._view = null;
	},
	getFocus: function() {
		return this._view;
	},
	_focus_action:function(view){
		this._focus_was_there = this._focus_was_there || view._settings.id;
	},
	setFocus: function(view, only_api, tab){
		//view can be empty
		view = $$(view);
		//unfocus if view is hidden
		if (view && !view.$view) view = null;

		//store last click time, it is necessary to prevent refocusing
		//for example when user moves focus from onclick handler somewher
		//and we want to prevent autofocusing, when event will reach document.body
		this._focus_time = state._focus_time = new Date();

		if (this._view === view) return true;
		if (this._view && this._view.callEvent)
			this._view.callEvent("onBlur", [this._view]);

		if (view && view.callEvent){
			view.callEvent("onFocus", [view, this._view]);
			if(tab) view.callEvent("onTabFocus", [view, this._view]);
		}
		callEvent("onFocusChange", [view, this._view]);

		if (this._view && this._view.blur && !only_api) this._view.blur();
		this._view = view;
		if (view && view.focus && !only_api) view.focus();
		return true;
	},
	applyChanges: function(element){
		var view = this.getFocus();
		if (view && view != element && view._applyChanges)
			view._applyChanges(element);
	},
	hasFocus: function(view) {
		return (view === this._view) ? true : false;
	},
	_focus: function(e, dont_clear) {
		var view = locate(e, "view_id") || this._focus_was_there;

		//if html was repainted we can miss the view, so checking last processed one
		view = $$(view);
		this._focus_was_there = null;

		//set timer, to fix issue with Android input focusin
		state._focus_time = new Date();

		if (view == this._view) return;

		if (!dont_clear)
			this._focus_was_there = null;
		
		if (view){
			view = $$(view);
			if (this.canFocus(view)){
				//[ACTIVECONTENT] focus operations for active content
				if (view.getNode) view.getNode(e);
				this.setFocus(view);
			}
		} else if (!dont_clear)
			this.setFocus(null);

		return true;
	},
	_focus_click:function(e){
		// if it was onfocus/onclick less then 100ms behore then we ignore it
		if ((new Date())-this._focus_time < 100) {
			this._focus_was_there = null;
			return false;
		}
		return this._focus(e);
	},
	_focus_tab: function(e) {
		if(!this._inputs[e.target.nodeName.toLowerCase()])
			return false;
		return this._focus(e, true);
	},
	canFocus:function(view){
		return view.isVisible() && view.isEnabled();
	},

	_moveChildFocus: function(check_view){
		var focus = this.getFocus();
		//we have not focus inside of closing item
		if (check_view && !this._is_child_of(check_view, focus))
			return false;

		if (!this._focus_logic("getPrev", check_view))
			this._view = null;
	},
	_translation_table:{
	},
	_is_child_of: function(parent, child) {
		if (!parent) return false;
		if (!child) return false;
		while (child) {
			if (child === parent) return true;
			child = child.getParentView();
		}
		return false;
	},
	_keypress_timed:function(){
		if (this && this.callEvent)
			this.callEvent("onTimedKeyPress",[]);
	},
	_isNumPad: function(code){
		return code < 112 &&  code>105;
	},
	_keypress: function(e) {
		var code = e.which || e.keyCode;
		if(code>95 && code< 106)
			code -= 48; //numpad support (numbers)
		code = this._translation_table[code] || code;
		
		var ctrl = e.ctrlKey;
		var shift = e.shiftKey;
		var alt = e.altKey;
		var meta = e.metaKey;
		var codeid = this._keycode(code, ctrl, shift, alt, meta);
		var view = this.getFocus();
		if (view && view.callEvent) {
			if (view.callEvent("onKeyPress", [code,e]) === false)
				preventEvent(e);
			if (view.hasEvent("onTimedKeyPress")){
				clearTimeout(view._key_press_timeout);
				view._key_press_timeout = delay(this._keypress_timed, view, [], (view._settings.keyPressTimeout||250));
			}
		}

		if(!this._isNumPad(code))
			codeid = this._keycode(String.fromCharCode(code), ctrl, shift, alt, meta);
		//flag, that some non-special key was pressed
		var is_any = !ctrl && !alt && !meta && (code!=9)&&(code!=27)&&(code!=13);

		if (this._check_keycode(codeid, is_any, e) === false) {
			preventEvent(e);
			return false;
		}
	},

	// dir - getNext or getPrev
	_focus_logic: function(dir) {
		if (!this.getFocus()) return null;

		dir = dir || "getNext";
		var next = this.getFocus();
		var start = next;
		var marker = uid();

		while (true) { // eslint-disable-line
			next = this[dir](next);
			// view with focus ability
			if (next && this.canFocus(next))
				return this.setFocus(next);

			// elements with focus ability not found
			if (next === start || next.$fmarker == marker)
				return null;
			
			//prevents infinity loop
			next.$fmarker = marker;
		}
	},
	_tab_logic:function(view, e){
		var mode = !e.shiftKey;
		UIManager._tab_time = new Date();
		if (view && view._custom_tab_handler && !view._custom_tab_handler(mode, e))
			return false;

		if (view && view._in_edit_mode){
			if (view.editNext)
				return view.editNext(mode);
			else if (view.editStop){
				view.editStop();
				return true;
			}
		} else
			delay(function(){
				UIManager.setFocus($$(document.activeElement), true, true);
			},1);
	},
	getTop: function(id) {
		var next, view = $$(id);

		while (view && (next = view.getParentView()))
			view = next;
		return view;
	},

	getNext: function(view, _inner_call) {
		var cells = view.getChildViews();
		//tab to first children
		if (cells.length && !_inner_call) return cells[0];

		//unique case - single view without child and parent
		var parent = view.getParentView();
		if (!parent)
			return view;

		var p_cells = parent.getChildViews();
		if (p_cells.length){
			var index = PowerArray.find.call(p_cells, view)+1;
			while (index < p_cells.length) {
				//next visible child
				if (this.canFocus(p_cells[index])) 
					return p_cells[index];

				index++;
			}
		} 

		//sibling of parent
		return this.getNext(parent, true);
	},

	getPrev: function(view, _inner_call) {
		var cells = view.getChildViews();
		//last child of last child
		if (cells.length && _inner_call) 
			return this.getPrev(cells[cells.length - 1], true);
		if (_inner_call) return view;

		//fallback from top to bottom
		var parent = view.getParentView();
		if (!parent) return this.getPrev(view, true);


		var p_cells = parent.getChildViews();
		if (p_cells) {
			var index = PowerArray.find.call(p_cells, view)-1;
			while (index >= 0) {
				if (this.canFocus(p_cells[index]))
					return this.getPrev(p_cells[index], true);
				index--;
			}
		}

		return parent;
	},
	addHotKey: function(keys, handler, view) {
		assert(handler, "Hot key handler is not defined");
		var pack = this._parse_keys(keys);
		assert(pack.letter, "Unknown key code");
		if (!view) view = null;
		pack.handler = handler;
		pack.view = view;
		

		var code = this._keycode(pack.letter, pack.ctrl, pack.shift, pack.alt, pack.meta);
		if (!this._hotkeys[code]) this._hotkeys[code] = [];
		this._hotkeys[code].push(pack);

		return keys;
	},
	removeHotKey: function(keys, func, view){
		var pack = this._parse_keys(keys);
		var code = this._keycode(pack.letter, pack.ctrl, pack.shift, pack.alt, pack.meta);
		if (!func && !view)
			delete this._hotkeys[code];
		else {
			var t = this._hotkeys[code];
			if (t){
				for (var i = t.length - 1; i >= 0; i--) {
					if (view && t[i].view !== view) continue;
					if (func && t[i].handler !== func) continue;
					t.splice(i,1);
				}
				if (!t.length)
					delete this._hotkeys[code];
			}

		}
	},
	_keycode: function(code, ctrl, shift, alt, meta) {
		return code+"_"+["", (ctrl ? "1" : "0"), (shift ? "1" : "0"), (alt ? "1" : "0"), (meta ? "1" : "0")].join("");
	},

	_check_keycode: function(code, is_any, e){
		var focus = this.getFocus();
		if (this._hotkeys[code])
			return  this._process_calls(this._hotkeys[code], focus, e);
		else if (is_any && this._hotkeys["ANY_0000"])
			return  this._process_calls(this._hotkeys["ANY_0000"], focus, e);

		return true;
	},
	_process_calls:function(calls, focus, e){
		for (var i = 0; i < calls.length; i++) {
			var key = calls[i];
			if ((key.view !== null) &&		//common hot-key
				(focus !== key.view) &&		//hot-key for current view
				//hotkey for current type of view
				(typeof(key.view) !== "string" || !focus || focus.name !== key.view)) continue;

			var temp_result = key.handler(focus, e);
			if (!!temp_result === temp_result) return temp_result;
		}
		return true;
	},
	_parse_keys: function(keys) {
		var controls = this._controls;
		var parts = keys.toLowerCase().split(/[+\-_]/);
		var ctrl, shift, alt, meta;
		ctrl = shift = alt = meta = 0;
		var letter = "";
		for (var i = 0; i < parts.length; i++) {
			if (parts[i] === "ctrl") ctrl = 1;
			else if (parts[i] === "shift") shift = 1;
			else if (parts[i] === "alt") alt = 1;
			else if (parts[i] === "command") meta = 1;
			else {
				if (controls[parts[i]]) {
					var code = controls[parts[i]];
					if(this._isNumPad(code))
						letter = code.toString();
					else
						letter = String.fromCharCode(code);
				} else {
					letter = parts[i];
				}
			}
		}
		return {
			letter: letter.toUpperCase(),
			ctrl: ctrl,
			shift: shift,
			alt: alt,
			meta: meta,
			debug:keys
		};
	},
	getState:function(node, children) {
		children = (children||false);
		node = $$(node);
		var state = {
			id: node.config.id,
			width: node.config.width,
			height: node.config.height,
			gravity: node.config.gravity
		};
		if (!isUndefined(node.config.collapsed)) state.collapsed = node.config.collapsed;
		if (node.name === "tabs" || node.name === "tabbar") state.activeCell = node.getValue();
		
		if (children) {
			state = [state];
			if (node._cells) {
				for (var i = 0; i < node._cells.length; i++)
					state = state.concat(this.getState(node._cells[i], children));
			}
		}
		return state;
	},
	setState:function(states) {
		if (!isArray(states)) states = [states];
	
		for (var i = 0; i < states.length; i++) {
			var state = states[i];
			var node = $$(state.id);
			if (!node) continue;
	
			if (!isUndefined(state.collapsed)) node.define("collapsed", state.collapsed);
			if (!isUndefined(state.activeCell)) node.setValue(state.activeCell);
	
			node.define("width", state.width);
			node.define("height", state.height);
			node.define("gravity", state.gravity);
		}
		var top = $$(states[0].id);
		if (top) top.resize();
	}
};

ready(function() {
	UIManager._enable();

	UIManager.addHotKey("enter", function(view, ev){
		if (view && view.callEvent)
			view.callEvent("onEnter", [ev]);
		if (view && view.editStop && view._in_edit_mode){
			view.editStop();
			return true;
		} else if (view && view.touchable){
			var form = view.getFormView();
			if (form && !view._skipSubmit)
				form.callEvent("onSubmit",[view,ev]);
		}
	});
	UIManager.addHotKey("esc", function(view){
		if (view){
			if (view.editCancel && view._in_edit_mode){
				view.editCancel();
				return true;
			}
			var top = view.getTopParentView();
			if (top && top.setPosition)
				top._hide();
		}
	});
	UIManager.addHotKey("shift+tab", UIManager._tab_logic);
	UIManager.addHotKey("tab", UIManager._tab_logic);
});

define("UIManager", UIManager);

export default UIManager;