import {protoUI} from "../ui/core";
import {delay, uid} from "../webix/helpers";
import {_event} from "../webix/htmlevents";
import text from "./text";
import {create, remove, addCss, removeCss} from "../webix/html";
import {$active} from "../webix/skin";

const autoheight = {
	$init: function(){
		this.$ready.push(function(){
			if(this._settings.autoheight){
				addCss(this.$view, "webix_noscroll");
				if(!this._settings.maxHeight)
					this._settings.maxHeight = 100;
				_event(this.$view,"input", ()=>{
					this._sizeToContent(true);
				},{capture: true});
				this.attachEvent("onAfterRender", ()=>{
					this._sizeToContent();
				});
			}
		});
	},
	_sizeToContent: function(focus){
		if(this._skipSizing)
			return (this._skipSizing = false);
		let txt = this.getInputNode();
		let height = this._getTextHeight(txt.value, txt.offsetWidth);
		const padding = 2*$active.inputPadding + 2*$active.borderWidth;
		height = Math.max(height+padding, this._settings.minHeight);
		if(height > this._settings.maxHeight){
			removeCss(this.$view, "webix_noscroll");
			height = this._settings.maxHeight;
		}
		else
			addCss(this.$view, "webix_noscroll",true);
		const topView = this.getTopParentView();
		clearTimeout(topView._template_resize_timer);
		topView._template_resize_timer = delay(()=>{
			if (this.config.height != height){
				this.config.height = height;
				let caretPos = txt.selectionEnd;
				this._skipSizing = true;
				const value = text.api.getValue.call(this);
				this.resize();
				this.callEvent("onInputResize",[]);
				if(focus){
					txt = this.getInputNode();
					// needed to restore "\n" value after resize
					text.api.$setValue.call(this,value);
					txt.setSelectionRange(caretPos,caretPos);
					txt.focus();
				}
			}
		});
	},
	_getTextHeight: function(value, width){
		const d = create("textarea",{"class":"webix_textarea_measure", rows: "1"},"");
		d.style.cssText = "height:auto;visibility:hidden; position:absolute; top:0px; left:0px; width:"+width+"px;";
		document.body.appendChild(d);
		d.value = value;
		const height = d.scrollHeight;
		remove(d);
		return  height;
	},
	$setValue: function(value){
		text.api.$setValue.call(this,value);
		if(this._settings.autoheight)
			this._sizeToContent();
	}
};

const api = {
	name:"textarea",
	defaults:{
		template:function(obj, common){
			var name = obj.name || obj.id;
			var id = "x"+uid();

			var html = common._baseInputHTML("textarea")+"style='width:"+common._get_input_width(obj)+"px;'";
			html +=" id='"+id+"' name='"+name+"' class='webix_inp_textarea'>"+common._pattern(obj.value)+"</textarea>";

			return common.$renderInput(obj, html, id);
		},
		minHeight:60,
	},

	$skin:function(){
		text.api.$skin.call(this);
		this.defaults.height = 0;
	},
	_skipSubmit: true,
	_getLabelHeight:function(top){
		return top ? this._labelTopHeight-this._settings.inputPadding : "";
	},
	$renderIcon:function(){
		return "";
	},
	//get input element
	getInputNode: function() {
		return this._dataobj.getElementsByTagName("textarea")[0];
	}
};

const view = protoUI(api, autoheight, text.view);
export default {api, view, autoheight};