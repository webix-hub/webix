import UIManager from "../core/uimanager";
import {isUndefined} from "../webix/helpers";
import template from "../webix/template";

import clipbuffer from "../webix/clipbuffer";

const CopyPaste = {
	clipboard_setter: function(value) {
		if (value === true || value === 1) value = "modify";
		this.attachEvent("onAfterSelect", function(id) {
			var item = this.getItem(id);
			var text = this.type.templateCopy(item);
			clipbuffer.set(text, this);
			clipbuffer.focus();
			UIManager.setFocus(this);
		});
		this.attachEvent("onPaste", function(text) {
			if (!isUndefined(this._paste[this._settings.clipboard]))
				this._paste[this._settings.clipboard].call(this, text);
		});
		this.attachEvent("onFocus", function() {
			clipbuffer.focus();
		});
		// solution for clicks on selected items
		this.attachEvent("onItemClick",function(id){
			if(!this._selected || this._selected.find(id)!==-1){
				clipbuffer.focus();
				UIManager.setFocus(this);
			}
		});
		return value;
	},
	_paste: {
		// insert new item with pasted value
		insert: function(text) {
			this.add({ value: text });
		},
		// change value of each selected item
		modify: function(text) {
			var sel = this.getSelectedId(true);
			for (var i = 0; i < sel.length; i++) {
				this.getItem(sel[i]).value = text;
				this.refresh(sel[i]);
			}
		},
		// do nothing
		custom: function() {}
	},
	templateCopy_setter: function(value) {
		this.type.templateCopy = template(value);
	},
	type:{
		templateCopy: function(item) {
			return this.template(item);
		}
	}
};

export default CopyPaste;