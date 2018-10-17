import popup from "../views/popup";
import UIManager from "../core/uimanager";

import {preventEvent} from "../webix/html";
import {protoUI, $$} from "../ui/core";
import {toFunctor, extend, copy, isUndefined, delay, bind, toNode} from "../webix/helpers";
import {_event} from "../webix/htmlevents";
import {callEvent} from "../webix/customevents";
import template from "../webix/template";


// #include ui/window.js

const api = {
	name:"suggest",
	defaults:{
		autofocus:false,
		type:"list",
		keyPressTimeout:1,
		body:{
			yCount:10,
			autoheight:true,
			body:true,
			select:true,
			borderless:true,
			navigation:true
		},
		filter:function(item,value){
			if (item.value.toString().toLowerCase().indexOf(value.toLowerCase())===0) return true;
			return false;
		}
	},
	template_setter:template,
	filter_setter:function(value){
		return toFunctor(value, this.$scope);
	},
	$init:function(obj){
		var temp = {};
		extend(temp, copy(this.defaults.body));
		temp.view = obj.type || this.defaults.type;

		var etemp = this._get_extendable_cell(temp);
		if (obj.body)
			extend(etemp, obj.body, true);

		if (obj.data)
			etemp.data = obj.data;
		if (obj.url)
			etemp.url = obj.url;
		if (obj.datatype)
			etemp.datatype = obj.datatype;

		if (obj.id)
			temp.id = temp.id || (obj.id+"_"+temp.view);

		obj.body = temp;
		this.$ready.push(this._set_on_popup_click);

		this.attachEvent("onShow", function(){
			if (this._settings.master){
				var master = $$(this._settings.master);
				if(master){
					var node = master._getInputDiv ? master._getInputDiv() : master.getInputNode();
					node.setAttribute("aria-expanded", "true");
				}
					
			}
			this._show_selection();
		});
		this.attachEvent("onHide", function(){
			if (this._settings.master){
				var master = $$(this._settings.master);
				if(master){
					var node = master._getInputDiv ? master._getInputDiv() : master.getInputNode();
					node.setAttribute("aria-expanded", "false");
				}
					
			}
		});
		this._old_text = {};
	},
	_get_extendable_cell:function(obj){
		return obj;
	},
	_preselectMasterOption: function(data){
		var master, node, text = "";

		if (data){
			if (this._settings.master){
				master = $$(this._settings.master);
				node = master.getInputNode();
				if(node && master.$setValueHere){
					master.$setValueHere(data.value);
				}
				else if (node){
					if(master.options_setter)
						text = this.getItemText(data.id);
					else if(data.value)
						text = master._get_visible_text ? master._get_visible_text(data.value) : data.value.toString();

					if (isUndefined(node.value))
						node.innerHTML = text;
					else
						node.value = text.replace(/<[^>]*>/g,"");
				}
			}
		}
		node = node || this._last_input_target;
		if(node)
			node.focus();
	},
	setMasterValue:function(data, refresh){
		var text = data.id ? this.getItemText(data.id) : (data.text||data.value);

		if (this._settings.master){
			var master = $$(this._settings.master);
			if (refresh && data.id)
				master.refresh();
			else if (master.options_setter)
				master.setValue(data.$empty?"":data.id);
			else if(master.setValueHere)
				master.setValueHere(text);
			else
				master.setValue(text);
		} else if (this._last_input_target){
			this._last_input_target.value = text;
		}

		if (!refresh){
			this.hide(true);
			if (this._last_input_target)
				this._last_input_target.focus();
		}
		this.callEvent("onValueSuggest", [data, text]);
		delay(function(){
			callEvent("onEditEnd",[]);
		});
	},
	getMasterValue:function(){
		if (this._settings.master)
			return $$(this._settings.master).getValue();
		return null;
	},
	getItemId:function(text){
		var list = this.getList();
		for (var key in list.data.pull){
			var obj = list.getItem(key);
			if (this._settings.filter.call(this, obj, text))
				return obj.id;
		}
	},
	getItemText:function(id){
		var item = this.getList().getItem(id);

		if (!item)
			return this._old_text[id] || "";

		if (this._settings.template)
			return this._settings.template.call(this, item, this.type);

		if (this._settings.textValue)
			return ""+item[this._settings.textValue]+"";
		
		var type = this.getList().type;
		var text = type.template.call(type, item, type);

		return (this._old_text[id] = text);
	},
	getSuggestion:function(text){
		var id,
			list = this.getList(),
			order = list.data.order;

		if (list.getSelectedId)
			id = list.getSelectedId();

		if (text && order.length && (!id || order.find(id) <0) ){
			id = order[0];
			//ensure that option really does match client-side filtering rules
			if (!list.config.dataFeed && !this.config.filter.call(this, list.data.pull[id], text)) return null;
		}

		//complex id in datatable
		if (id && typeof id == "object") id = id+"";
		return id;
	},
	getList:function(){
		return this._body_cell;
	},
	_set_on_popup_click:function(){
		var list = this.getList();
		var type = this._settings.type;

		if (list.count){
			list.attachEvent("onItemClick", bind(function(item){
				this.setMasterValue(list.getItem(item));
			}, this));
			list.data.attachEvent("onstoreupdated",bind(function(id, obj, mode){
				if (mode == "delete" && id == this.getMasterValue())
					this.setMasterValue({ id:"", text:"" }, 1);
				else if (mode == "update" && id == this.getMasterValue()){
					this.setMasterValue(obj, 1);
				}
			}, this));
			list.data.attachEvent("onAfterFilter", bind(this._suggest_after_filter, this));
			list.data.attachEvent("onStoreLoad", bind(this._suggest_after_filter, this));
			if (isUndefined(this._settings.fitMaster))
				this._settings.fitMaster = true;
		} else if (type == "calendar"){
			list.attachEvent("onDateSelect", function(){
				this.getParentView().setMasterValue({ value:list.getSelectedDate() }, list.config.multiselect);
			});
			list.attachEvent("onTodaySet", function(date){
				this.getParentView().setMasterValue({ value:date});
			});
			list.attachEvent("onDateClear", function(date){
				this.getParentView().setMasterValue({ value:date});
			});
		} else if (type == "colorboard"){
			list.attachEvent("onItemClick", function(value){
				this.getParentView().setMasterValue({ value:value });
			});
		}
	},
	input_setter: function(value) {
		this.linkInput(value);
		return 0;
	},
	linkInput: function(input){
		var node;
		if (input.getInputNode){
			node = input.getInputNode();
			node.webix_master_id = input._settings.id;
		} else
			node = toNode(input);

		_event(node,"keydown",function(e){
			if ((node != document.body || this.isVisible()) && (input.config ? (!input.config.readonly) : (!node.getAttribute("readonly"))))
				this._suggestions(e);
		},{bind:this});
		
		if(input._getInputDiv)
			node = input._getInputDiv();
		
		node.setAttribute("aria-autocomplete", "list");
		node.setAttribute("aria-expanded", "false");

		if(node.tagName === "DIV"){
			node.setAttribute("aria-live", "assertive");
			node.setAttribute("aria-atomic", "true");
		}

		this._non_ui_mode = true;
	},
	_suggestions: function(e){
		e = (e||event);
		var list = this.getList();
		var trg = e.target||e.srcElement;
		if((trg == document.body && !this.isVisible()) || trg.className =="webix_clipbuffer")
			return;

		this._last_input_target = trg;
		this._settings.master = trg.webix_master_id;

		window.clearTimeout(this._key_timer);

		var code = e.keyCode;
		//shift and ctrl
		if (code == 16 || code == 17) return;

		// tab - hide popup and do nothing
		if (code == 9)
			return this._tab_key(this,list);

		// escape - hide popup
		if (code == 27)
			return this._escape_key(this,list);

		// enter
		if (code == 13)
			return this.$enterKey(this,list);

		// up/down/right/left are used for navigation
		if (this._navigate(e)) {
			preventEvent(e);
			return false;
		}

		if (isUndefined(trg.value)) return;

		clearTimeout(this._last_delay);
		this._last_delay = delay(function(){
			//focus moved to the different control, suggest is not necessary
			if (!this._non_ui_mode && 
					UIManager.getFocus() != $$(this._settings.master)) return;

			this._resolve_popup = true;
			//for multicombo
			var val = trg.value;

			// used to prevent showing popup when it was initialized
			if (list.config.dataFeed)
				list.filter("value", val);
			else if (list.filter){
				list.filter(bind(function(item){
					return this._settings.filter.call(this,item,val);
				}, this));
			}
		},this, [], this._settings.keyPressTimeout);
	},
	_suggest_after_filter: function() {
		if (!this._resolve_popup) return true;
		this._resolve_popup = false;

		var list = this.getList();
		
		// filtering is complete
		// if there are as min 1 variant it must be shown, hidden otherwise
		if (list.count() >0){
			this.adjust();
			if(!this.isVisible())
				this._dont_unfilter = true;
			this.show(this._last_input_target,null,true);
			this._dont_unfilter = false;
		} else {
			this.hide(true);
			this._last_input_target = null;
		}
	},

	show:function(node){
		if (!this.isVisible()){
			var list = this.getList();
			if (list.filter && !this._dont_unfilter){
				list.filter("");
			}

			if(this.$customWidth&&((this._settings.fitMaster||!this._settings.width)||isUndefined(this._settings.fitMaster))){
				this.$customWidth(node);
			}
			if (node.tagName && this._settings.fitMaster){
				this._settings.width = node.offsetWidth -2 ; //2 - borders
			}
			if (list._zoom_level)
				list.render();

			this.adjust();

			// needed to return focus
			if(node.tagName == "INPUT")
				this._last_input_target = node;
		}
		popup.api.show.apply(this, arguments);
	},
	_show_selection:function(list){
		list = list||this.getList();
		var value = this.getMasterValue();

		if( list.select && list.showItem ){

			if (value && list.exists && list.exists(value)){
				list.select(value);
				list.showItem(value);
			}
			else{
				list.unselect();
				list.showItem(list.getFirstId());
			}
		}
		else if(list.setValue){
			if (this._settings.master)
				value = $$(this._settings.master).$prepareValue(value);
			list.setValue(value);
		}
	},
	$enterKey: function(popup,list) {
		var value;

		if (popup.isVisible()) {
			if (list.count && list.count()){
				value = list.getSelectedId(false, true);
				if(list.count()==1 && list.getFirstId()!=value)
					value = list.getFirstId();
				if(value)
					value = list.getItem(value);
			}
			else if(list.getSelectedDate && list.getSelectedDate())
				value = { value:list.getSelectedDate() };
			else if(list.getValue && list.getValue())
				value = {value: list.getValue() };
			
			if (value)
				this.setMasterValue(value);
			
			popup.hide(true);
		}
		else
			popup.show(this._last_input_target);
	},
	_escape_key: function(popup) {
		return popup.hide(true);
	},
	_tab_key: function(popup) {
		return popup.hide(true);
	},
	/*! suggestions navigation: up/down buttons move selection
	 *	@param e
	 *		event object
	 **/
	_navigate: function(e) {
		var list = this.getList();
		var code = e.keyCode;
		var data;

		if( list.moveSelection && code < 41 && code > 32 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
			// down arrow
			if (code === 40 ) {
				var visible = this.isVisible();
				if (!visible)
					this.show(this._last_input_target);
				
				list.moveSelection("down", false, false);
			}// other arrows
			else {
				if((list.count && code !==38) || (!list.count && !list.isVisible()))
					return false;

				var dir;
				if(code == 33) dir = "pgup";
				if(code == 34) dir = "pgdown";
				if(code == 35) dir = "bottom";
				if(code == 36) dir = "top";
				if(code == 37) dir = "left";
				if(code == 38) dir = "up";
				if(code == 39) dir = "right";

				list.moveSelection(dir, false, false);
			}

			if(list.count)
				data = list.getSelectedItem();
			else if(list.getSelectedDate)
				data = { value:list.getVisibleDate()};
			else if(list.getValue)
				data = { value:list.getValue() };
			
			this._preselectMasterOption(data);
			return true;
		}

		return false;
	},
	getValue:function(){
		var list = this.getList();
		var  value = (list.getValue ? list.getValue() : list.getSelectedId()) || "";
		value = value.id || value;

		// check empty
		if(list.getItem){
			var item = list.getItem(value);
			if(item && item.$empty)
				return "";
		}
		return value;
	},
	setValue:function(value){
		var list = this.getList();
		if(value){
			if(list.exists(value)){
				list.select(value);
				list.showItem(value);
			}
		}else{
			list.unselect();
			list.showItem(list.getFirstId());
		}
	}
};


const view = protoUI(api,  popup.view);
export default {api, view};