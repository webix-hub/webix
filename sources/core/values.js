import {addCss, removeCss} from "../webix/html";
import {isUndefined, copy} from "../webix/helpers";
import {assert} from "../webix/debug";

import CodeParser from "../core/codeparser";


// #include core/parsing.js

const Values = {
	$init:function(){
		this.elements = {};
	},
	focus:function(name){
		if (name){
			assert(this.elements[name],"unknown input name: "+name);
			this._focus(this.elements[name]);
		} else{
			for(var n in this.elements){
				if(this._focus(this.elements[n]))
					return true;
			}
		}
	},
	_focus: function(target){
		if (target && target.focus){
			target.focus();
			return true;
		}
	},
	setValues:function(data, update){
		if (this._settings.complexData)
			data = CodeParser.collapseNames(data);

		this._inner_setValues(data, update);
	},
	_inner_setValues:function(data, update){
		this._is_form_dirty = update;
		//prevent onChange calls from separate controls
		this.blockEvent();

		if (!update || !this._values)
			this._values = {};

		for (let name in data)
			if (!this.elements[name])
				this._values[name] = data[name];

		for (let name in this.elements){
			var input = this.elements[name];
			if (input){
				if (!isUndefined(data[name]))
					input.setValue(data[name]);
				else if (!update && input.$allowsClear)
					input.setValue("");
				this._values[name] = input.getValue();
			}
		}

		this.unblockEvent();
		this.callEvent("onValues",[]);
	},
	isDirty:function(){
		if (this._is_form_dirty) return true;
		if (this.getDirtyValues(1) === 1)
			return true;

		return false;
	},
	setDirty:function(flag){
		this._is_form_dirty = flag;
		if (!flag)
			this._values = this._inner_getValues();
	},
	getDirtyValues:function(){
		var result = {};
		if (this._values){
			for (var name in this.elements){
				var value = this.elements[name].getValue();
				if (this._values[name] != value){
					result[name] = value;
					//FIXME - used by isDirty
					if (arguments[0])
						return 1;
				}
			}
		}
		return result;
	},
	getCleanValues:function(){
		return this._values;
	},
	getValues:function(filter){
		var data = this._inner_getValues(filter);
		if (this._settings.complexData)
			data = CodeParser.expandNames(data);

		return data;
	},
	_inner_getValues:function(filter){
		//get original data		
		var success,
			elem = null,
			data = (this._values?copy(this._values):{});

		//update properties from linked controls
		for (var name in this.elements){
			elem = this.elements[name];
			success = true;
			if(filter){
				if(typeof filter == "object"){
					if(filter.hidden === false)
						success = elem.isVisible();
					if(success && filter.disabled === false)
						success = elem.isEnabled();
				}
				else
					success = filter.call(this,elem);
			}
			if(success)
				data[name] = elem.getValue();
			else
				delete data[name]; //in case of this._values[name]
		}
		return data;
	},
	clear:function(){
		this._is_form_dirty = false;
		var data = {};
		for (var name in this.elements)
			if (this.elements[name].$allowsClear)
				data[name] = "";
		
		this._inner_setValues(data);
	},
	markInvalid: function(name, state){
		// remove 'invalid' mark
		if(state === false){
			this._clear_invalid(name);
		}
		// add 'invalid' mark
		else{
			// set invalidMessage
			if(typeof state == "string"){
				var input = this.elements[name];
				if(input)
					input._settings.invalidMessage = state;
			}
			this._mark_invalid(name);
		}
	},
	_mark_invalid:function(id){
		var input = this.elements[id];
		if (id && input){
			this._clear_invalid(id,true);
			addCss(input._viewobj, "webix_invalid");
			input._settings.invalid = true;
			var message = input._settings.invalidMessage;
			if(typeof message === "string" && input.setBottomText)
				input.setBottomText();
		}
	},
	_clear_invalid:function(id,silent){
		var input = this.elements[id];
		if(id && input && input.$view && input._settings.invalid){
			removeCss(input._viewobj, "webix_invalid");
			input._settings.invalid = false;
			var message = input._settings.invalidMessage;
			if(typeof message === "string" && !silent && input.setBottomText)
				input.setBottomText();
		}
	}
};


export default Values;