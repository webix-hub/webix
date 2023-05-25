import {preventEvent} from "../webix/html";
import UIManager from "../core/uimanager";
import {$$} from "../ui/core";
import {assert} from "../webix/debug";


const KeysNavigation = {
	$init:function(){
		if(this.getSelectedId)
			this.attachEvent("onAfterRender", this._set_focusable_item);
		if(this.moveSelection)
			this.attachEvent("onTabFocus", this._set_item_focus);
	},
	_set_item_focus:function(){
		if(this.getSelectedId){
			var sel = this.getSelectedId(true);
			if(!sel.length || !this.getItemNode(sel[0]))
				this.moveSelection("down"); //select and show
		}
	},
	_set_focusable_item:function(){
		var sel = this.getSelectedId(true);
		if(!sel.length || !this.getItemNode(sel[0])){
			var node =  this._dataobj.querySelector("["+this._id+"]");
			if(node)
				node.setAttribute("tabindex", "0");
		}
	},
	_navigation_helper:function(mode){
		return function(view, e){
			var tag = e.target;

			//ignore clipboard listener
			if (!tag.getAttribute(/*@attr*/"webixignore")){
				//ignore hotkeys if focus in the common input
				//to allow normal text edit operations
				var name = tag.tagName;
				if (name == "INPUT" || name == "TEXTAREA" || name == "SELECT") return true;
			}

			if (view && view.moveSelection && view.config.navigation && !view._in_edit_mode){
				preventEvent(e);
				return view.moveSelection(mode, {shift:e.shiftKey, ctrl:e.ctrlKey, e});
			}
		};
	},
	moveSelection:function(mode, details, focus){
		const config = this._settings;
		if (config.disabled) return;

		if ((mode == "right" || mode == "left") && this._parent_menu){
			const parent = $$(this._parent_menu);
			parent._hide_sub_menu(true);
			if (parent.config.layout === "x")
				parent.moveSelection(mode);
			else
				UIManager.setFocus(parent);
			return;
		}

		//get existing selection
		let selected = this.getSelectedId(true);
		const x_layout = (this.count && (config.layout =="x" || config.xCount > 1));

		let prev = true;
		if (!selected.length && this.count()){
			if (mode == "down" || (mode == "right" && x_layout)) mode = "top";
			else if (mode == "up" || (mode == "left" && x_layout)) mode = "bottom";
			else return;
			selected = [this.getFirstId()];
			prev = false;
		}

		if (selected.length == 1){  //if we have a selection
			selected = selected[0];
			prev = (prev === true) ? selected : null;

			if (mode == "left"){
				if (this.close && !this._ignore_clicks) return this.close(selected);	//tree (not window)
				if (this._level_up && this._level_up(selected)) return this.render();	//grouplist
			} else if (mode == "right"){
				if (this.open) return this.open(selected);
				if (this._level_down && this._level_down(selected)) return this.render();
			}

			if (mode == "top") {
				selected = this.getFirstId();
			} else if (mode == "bottom") {
				selected = this.getLastId();
			} else if (mode == "up" || mode == "left" || mode == "pgup") {
				const index = this.getIndexById(selected);
				const step = mode == "pgup" ? 10 : 1;
				selected = this.getIdByIndex(Math.max(0, index-step));
			} else if (mode == "down" || mode == "right" || mode == "pgdown") {
				const index = this.getIndexById(selected);
				const step = mode == "pgdown" ? 10 : 1;
				selected = this.getIdByIndex(Math.min(this.count()-1, index+step));
			} else {
				assert(false, "Not supported selection moving mode");
				return;
			}

			const dir = (mode == "up" || mode == "left" || mode == "pgdown" || mode == "bottom")?-1:1;
			if (this._skip_item) {
				selected = this._skip_item(selected, prev, dir);
				if (!selected) return;
			}

			this.showItem(selected);
			this.select(selected);

			if (this.getSubMenu && this.getSubMenu(selected))
				this._mouse_move_activation(selected, this.getItemNode(selected));

			if (!config.clipboard && focus !== false){
				const node = this.getItemNode(selected);
				if (node) node.focus();
			}
		}
		return false;
	},
	navigation_setter:function(value){
		//using global flag to apply hotkey only once
		if (value && !UIManager._global_nav_grid_hotkeys){
			UIManager._global_nav_grid_hotkeys = true;
			//hotkeys will react on any component but will not work in edit mode
			//you can define moveSelection method to handle navigation keys
			UIManager.addHotKey("up",         this._navigation_helper("up"));
			UIManager.addHotKey("down",       this._navigation_helper("down"));
			UIManager.addHotKey("right",      this._navigation_helper("right"));
			UIManager.addHotKey("left",       this._navigation_helper("left"));

			UIManager.addHotKey("shift+up",   this._navigation_helper("up"));
			UIManager.addHotKey("shift+down", this._navigation_helper("down"));
			UIManager.addHotKey("shift+right",   this._navigation_helper("right"));
			UIManager.addHotKey("shift+left", this._navigation_helper("left"));

			UIManager.addHotKey("ctrl+shift+up",   this._navigation_helper("up"));
			UIManager.addHotKey("ctrl+shift+down", this._navigation_helper("down"));
			UIManager.addHotKey("ctrl+shift+right",   this._navigation_helper("right"));
			UIManager.addHotKey("ctrl+shift+left", this._navigation_helper("left"));

			UIManager.addHotKey("pageup", 	this._navigation_helper("pgup"));
			UIManager.addHotKey("pagedown",   this._navigation_helper("pgdown"));
			UIManager.addHotKey("home", 	    this._navigation_helper("top"));
			UIManager.addHotKey("end", 		this._navigation_helper("bottom"));

			UIManager.addHotKey("shift+pageup", 	this._navigation_helper("pgup"));
			UIManager.addHotKey("shift+pagedown",   this._navigation_helper("pgdown"));
			UIManager.addHotKey("shift+home", 	    this._navigation_helper("top"));
			UIManager.addHotKey("shift+end", 		this._navigation_helper("bottom"));

			UIManager.addHotKey("ctrl+up",   this._navigation_helper("up"));
			UIManager.addHotKey("ctrl+down", this._navigation_helper("down"));
			UIManager.addHotKey("ctrl+left",   this._navigation_helper("left"));
			UIManager.addHotKey("ctrl+right", this._navigation_helper("right"));
		}

		return value;
	}
};

export default KeysNavigation;