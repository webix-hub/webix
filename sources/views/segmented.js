import {addCss, removeCss} from "../webix/html";
import {protoUI, $$} from "../ui/core";
import {once, uid, PowerArray} from "../webix/helpers";
import {assert} from "../webix/debug";
import template from "../webix/template";

import HTMLOptions from "../core/htmloptions";

import text from "./text";


const api = {
	name:"segmented",
	$allowsClear:false,
	$init:function(){
		this.attachEvent("onChange", function(value){
			if (this._settings.multiview)
				this._show_view(value);
		});
		this.attachEvent("onAfterRender", once(function(){
			if (this._settings.multiview && this._settings.value)
				this._show_view(this._settings.value);
		}));
	},
	_show_view:function(value){
		var top = this.getTopParentView();
		var view = null;

		//get from local isolate
		if (top && top.$$)
			view = top.$$(value);
		//or check globally
		if (!view)
			view = $$(value);

		if(view && view.show)
			view.show();
	},
	defaults:{
		template:function(obj, common){
			if(!obj.options)
				assert(false, "segmented: options undefined");
			var options = obj.options;
			common._check_options(options);
			options = common._filterOptions(options);

			var width = common._get_input_width(obj);

			var id = uid();
			var html = "<div style='width:"+width+"px' class='webix_all_segments' role='tablist' aria-label='"+template.escape(obj.label)+"'>";
			var optionWidth = obj.optionWidth || Math.floor(width/options.length);
			if(!obj.value)
				obj.value = options[0].id;

			for(var i=0; i<options.length; i++){
				html+="<button type='button' style='width:"+(options[i].width || optionWidth)+"px' role='tab' aria-selected='"+(obj.value==options[i].id?"true":"false")+"' tabindex='"+(obj.value==options[i].id?"0":"-1")+"'";
				html+="class='"+"webix_segment_"+((i==options.length-1)?"N":(i>0?1:0))+((obj.value==options[i].id)?" webix_selected ":"")+"' button_id='"+options[i].id+"' "+(options[i].tooltip?("title='"+options[i].tooltip+"'"):"")+">";
				html+= options[i].value+"</button>";
			}
			
			return common.$renderInput(obj, html+"</div>", id);
		}
	},
	_getInputNode:function(){
		return this.$view.getElementsByTagName("BUTTON");
	},
	focus: function(){ this._focus(); },
	blur: function(){ this._blur(); },
	$setValue:function(value){

		var options = this._getInputNode();

		for(var i=0; i<options.length; i++){
			var id = options[i].getAttribute("button_id");
			options[i].setAttribute("aria-selected", (value==id?"true":"false"));
			options[i].setAttribute("tabindex", (value==id?"0":"-1"));
			if(value==id)
				addCss(options[i], "webix_selected");
			else
				removeCss(options[i], "webix_selected");
		}
		//refresh tabbar if the option is in the popup list
		var popup = this.config.tabbarPopup;
		if(popup && $$(popup) && $$(popup).getBody().exists(value))
			this.refresh();
	},
	getValue:function(){
		return this._settings.value;
	},
	getInputNode:function(){
		return null;
	},
	optionIndex:function(id){
		var pages = this._settings.options;
		for (var i=0; i<pages.length; i++)
			if (pages[i].id == id)
				return i;
		return -1;
	},
	addOption:function(id, value, show, index){
		var obj = id;
		if (typeof id != "object"){
			value = value || id;
			obj = { id:id, value:value };
		} else {
			id = obj.id;
			index = show;
			show = value;
		}

		if (this.optionIndex(id) < 0)
			PowerArray.insertAt.call(this._settings.options, obj, index);
		this.refresh();

		if (show)
			this.setValue(id);
	},
	removeOption:function(id){
		var index = this.optionIndex(id);
		var options = this._settings.options;

		if (index >= 0)
			PowerArray.removeAt.call(options, index);

		// if we remove a selected option
		if(this._settings.value == id)
			this._setNextVisible(options, index);
			
		this.refresh();
		this.callEvent("onOptionRemove", [id, this._settings.value]);
	},
	_setNextVisible: function(options, index){
		var size = options.length;

		if(size){
			index = Math.min(index, size-1);
			//forward search
			for (let i=index; i<size; i++)
				if (!options[i].hidden)
					return this.setValue(options[i].id);
			//backward search
			for (let i=index; i>=0; i--)
				if (!options[i].hidden)
					return this.setValue(options[i].id);
		}
		
		//nothing found		
		this.setValue("");
	},
	_filterOptions: function(options){
		var copy = [];
		for(var i=0; i<options.length;i++)
			if(!options[i].hidden)
				copy.push(options[i]);
		return copy;
	},
	_setOptionVisibility: function(id, state){
		var options = this._settings.options;
		var index = this.optionIndex(id);
		var option = options[index];
		if (option && state == !!option.hidden){  //new state differs from previous one
			option.hidden = !state;
			if (state || this._settings.value != id){ 	//show item, no need for extra steps
				this.refresh();
			} else {									//hide item, switch to next visible one
				this._setNextVisible(options, index);
			}
		}
	},
	hideOption: function(id){
		this._setOptionVisibility(id,false);
	},
	showOption: function(id){
		this._setOptionVisibility(id,true);
	},
	_set_inner_size:false
};

const view = protoUI(api, HTMLOptions, text.view);
export default {api, view};