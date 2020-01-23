import layout from "../views/layout";
import IdSpace from "../core/idspace";
import UIManager from "../core/uimanager";
import {protoUI} from "../ui/core";
import {$active} from "../webix/skin";
import i18n from "../webix/i18n";
import {_event} from "../webix/htmlevents";


const api = {
	name: "richtext",
	defaults:{
		label:"",
		labelWidth:80,
		labelPosition:"left"
	},
	$init: function() {
		this._viewobj.className += " webix_richtext";
		this.$ready.unshift(this._setLayout);
	},
	$skin:function(){
		layout.api.$skin.call(this);

		this.defaults.paddingX = $active.inputSpacing/2;
		this.defaults.paddingY = $active.inputPadding;
	},
	getInputNode:function(){
		return this.$view.querySelector(".webix_richtext_editor"); 
	},
	_button:function(name){
		return {
			view: "toggle",
			type: "icon",
			icon: "wxi-"+name, name: name, id:name,
			label: i18n.richtext[name],
			autowidth: true, 
			action:name,
			click: this._add_data
		};
	},
	_setLayout: function() {
		var top = this;

		var editField = {
			view: "template",
			css: "webix_richtext_container",
			borderless: true,
			template: "<div class='webix_richtext_editor' contenteditable='true'>"+this.getValue()+"</div>",
			on: {
				onAfterRender: function() {
					top._rendered_input = true;
					top.refresh();
					_event( 
						top.getInputNode(),
						"blur",
						function(){
							top._updateValue(this.innerHTML);
						}
					);
					_event( 
						top.getInputNode(),
						"keyup",
						function(){
							top._getselection();
						}
					);
				}
			},
			onClick: {
				webix_richtext_editor: function() {
					top._getselection();
				}
			}
		};

		var controls = [
			this._button("underline"),
			this._button("bold"),
			this._button("italic"),
			{ }
		];

		var editorToolbar = {
			view: "toolbar",
			id:"toolbar",
			elements: controls
		};

		var rows = [
			editorToolbar,
			editField
		];

		if (this.config.labelPosition === "top"){
			editorToolbar.elements = controls.concat([
				{ view:"label", label: this.config.label, align:"right"},
				{ width:4 }
			]);
			this.rows_setter(rows);
		} 
		else if (this.config.labelWidth){
			this.config.margin = 0;
			this.cols_setter([{ 
				template: (this.config.label || " "),
				css: "webix_richtext_inp_label"+(this.config.required?" webix_required":""),
				borderless: true,
				width: this.config.labelWidth
			}, {
				rows:rows
			}]);
		}
		else this.rows_setter(rows);
	},
	labelWidth_setter:function(value){
		return value ? Math.max(value, $active.dataPadding) : 0;
	},
	_getselection: function() {
		var top = this;
		var bar = top.$$("toolbar");
		var sel;

		bar.setValues({
			italic:false, underline:false, bold:false
		});

		if(window.getSelection) {
			sel = window.getSelection();
		} else {
			sel = document.selection.createRange();
		}

		for (var i = 0; i < sel.rangeCount; ++i) {
			if (top.$view.contains(this.getInputNode())){
				if (document.queryCommandState("bold")) {
					top.$$("bold").setValue(true);
				} 
				if (document.queryCommandState("underline")) {
					top.$$("underline").setValue(true);
				}
				if (document.queryCommandState("italic")) {
					top.$$("italic").setValue(true);
				}
			}
		}
	},
	refresh: function() {
		if(this._rendered_input)
			this.getInputNode().innerHTML = this.config.value || "";
	},
	_execCommandOnElement:function(commandName) {
		let sel, selText;

		if (window.getSelection) {
			sel = window.getSelection();
			selText = sel.toString().length;

			const input = this.getInputNode();
			if (!input.contains(sel.anchorNode) || !input.contains(sel.focusNode)) return;
		} else return; //ie8

		if(selText > 0) {
			for (var i = 0; i < sel.rangeCount; ++i) {
				var range = sel.getRangeAt(i);
				if (!sel.isCollapsed) {
					document.execCommand(commandName, false, "");
				} else {
					var textValue = sel.focusNode.textContent;
					var focusEl = sel.focusNode;
					var focustext = sel.anchorOffset;
					var wordBegining = textValue.substring(0, focustext).match(/[A-Za-z]*$/)[0];
					var wordEnd = textValue.substring(focustext).match(/^[A-Za-z]*/)[0];

					var startWord = focustext - wordBegining.length;
					var endWord = focustext + wordEnd.length;

					range.setStart(focusEl, startWord);
					range.setEnd(focusEl, endWord);
					sel.removeAllRanges();

					sel.addRange(range);
					document.execCommand(commandName, false, "");
				}   
			}
		}
	},
	_add_data:function() {
		const top = this.getTopParentView();
		top._execCommandOnElement(this.config.action);
	},
	focus: function() {
		if(!UIManager.canFocus(this))
			return false;

		var editableElement = this.getInputNode();
		editableElement.focus();
	},
	_updateValue: function(value){
		var old = this.config.value;
		this.config.value = value || "";

		if (old !== value)
			this.callEvent("onChange", [value, old]);
	},
	setValue: function(value) {
		this._updateValue(value);
		this.refresh();
	},
	getValue: function() {
		var input = this.getInputNode();
		if (input)
			this.config.value = this.getInputNode().innerHTML;

		var value = this.config.value;
		return value || (value ===0?"0":"");
	}
};


const view = protoUI(api,  IdSpace, layout.view);
export default {api, view};