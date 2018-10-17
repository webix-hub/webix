import segmented from "../views/segmented";
import {protoUI, ui, $$} from "../ui/core";
import {$active} from "../webix/skin";
import {bind, extend} from "../webix/helpers";
import i18n from "../webix/i18n";
import template from "../webix/template";


const api = {
	name:"tabbar",
	$init:function(){
		this.attachEvent("onKeyPress", this._onKeyPress);
	},
	$skin:function(){
		var skin = $active;
		var defaults = this.defaults;

		defaults.topOffset = skin.tabTopOffset||0;
		defaults.tabOffset = (typeof skin.tabOffset != "undefined"?skin.tabOffset:10);
		defaults.bottomOffset = skin.tabBottomOffset||0;
		defaults.height = skin.tabbarHeight;

		defaults.tabMargin = skin.tabMargin;
		defaults.inputPadding = skin.inputPadding;
		defaults.tabMinWidth = skin.tabMinWidth||100;
		defaults.tabMoreWidth = skin.tabMoreWidth||40;
		defaults.borderless = !skin.tabBorder;
	},
	_getTabbarSizes: function(){

		var config = this._settings,
			i, len,
			tabs = this._tabs||config.options,
			totalWidth = this._input_width - config.tabOffset*2,
			limitWidth = config.optionWidth||config.tabMinWidth;

		len = tabs.length;

		if(config.tabMinWidth && totalWidth/len < limitWidth){
			return { max: (parseInt(totalWidth/limitWidth,10)||1)};
		}


		if(!config.optionWidth){
			for(i=0;i< len; i++){
				if(tabs[i].width){
					totalWidth -= tabs[i].width+(!i&&!config .type?config.tabMargin:0);
					len--;
				}
			}
		}

		return {width: (len?totalWidth/len:config.tabMinWidth)};
	},
	_init_popup: function(){
		var obj = this._settings;
		if (!obj.tabbarPopup){
			var popupConfig = {
				view: "popup",
				width: (obj.popupWidth||200),
				body:{
					view: "list",
					borderless: true,
					select: true,
					css: "webix_tab_list",
					autoheight: true, yCount:obj.yCount,
					type:{
						template: obj.popupTemplate
					}
				}
			};
			var view = ui(popupConfig);
			view.getBody().attachEvent("onBeforeSelect",bind(function(id){
				if (id && this.callEvent("onBeforeTabClick", [id])){
					this.setValue(id);
					$$(this._settings.tabbarPopup).hide();
					this.callEvent("onAfterTabClick", [id]);
					return true;
				}
			},this));

			view.getBody().attachEvent("onAfterSelect", bind(function(){
				this.refresh();
			},this));

			obj.tabbarPopup = view._settings.id;
			this._destroy_with_me.push(view);
		}
		this._init_popup = function(){};
	},
	getPopup: function(){
		this._init_popup();
		return $$(this._settings.tabbarPopup);
	},
	moreTemplate_setter: template,
	popupTemplate_setter: template,
	defaults:{
		popupWidth: 200,
		popupTemplate: "#value#",
		yCount: 7,
		moreTemplate: "<span class=\"webix_icon wxi-dots\"></span>",
		template:function(obj,common) {
			var contentWidth, html, i, leafWidth, resultHTML, style, sum, tabs, verticalOffset, width;

			common._tabs = tabs = common._filterOptions(obj.options);

			if (!tabs.length){
				html = "<div class='webix_tab_filler' style='width:"+common._input_width+"px; border-right:0px;'></div>";
			} else {
				common._check_options(tabs);
				if (!obj.value && tabs.length)
					obj.value = tabs[0].id;

				html = "";
				if (obj.tabOffset)
					html += "<div class='webix_tab_filler' style='width:"+obj.tabOffset+"px;'>&nbsp;</div>";
				contentWidth = common._input_width - obj.tabOffset*2-(!obj.type?(obj.tabMargin)*(tabs.length-1):0);
				verticalOffset = obj.topOffset+obj.bottomOffset;

				var sizes = common._getTabbarSizes();

				if(sizes.max && sizes.max < tabs.length){
					//we need popup
					var popup = common.getPopup();
					popup.hide();

					var list = (popup.getBody()||null);
					if(list){
						if(sizes.max){
							var found = false;
							for( i = 0; i < tabs.length && !found; i++)
								if(tabs[i].id== obj.value){
									found = true;
									if((i+1) > sizes.max){
										var selectedTab =  tabs.splice(i, 1);
										var displayTabs = tabs.splice(0, sizes.max-1).concat(selectedTab);
										tabs = displayTabs.concat(tabs);
									}
								}
							list.clearAll();
							list.parse(tabs.slice(sizes.max));
						}
						else{
							list.clearAll();
						}
					}
				} else if (common._settings.tabbarPopup)
					$$(common._settings.tabbarPopup).hide();

				sum = obj.tabOffset;
				var lastTab = false;
				for(i = 0; (i<tabs.length) && !lastTab; i++) {

					// tab width
					if(sizes && sizes.max){
						if(sizes.max == (i + 1)){
							lastTab = true;
						}
						contentWidth = common._input_width - obj.tabOffset*2-(!obj.type&&(sizes.max>1)?(obj.tabMargin)*(sizes.max-1):0);
						width = (contentWidth - obj.tabMoreWidth)/sizes.max ;
					}
					else
						width = sizes.width;

					width = (tabs[i].width||obj.optionWidth||width);

					sum += width + (i&&!obj.type?obj.tabMargin:0);

					if(obj.tabMargin>0&&i&&!obj.type)
						html += "<div class='webix_tab_filler' style='width:"+obj.tabMargin+"px;'></div>";

					// tab innerHTML
					html += common._getTabHTML(tabs[i],width);


					if(lastTab){
						html += "<div role=\"button\" tabindex=\"0\" aria-label=\""+i18n.aria.showTabs+"\" class=\"webix_tab_more_icon\" style=\"width:"+obj.tabMoreWidth+"px;\">"+obj.moreTemplate(obj,common)+"</div>";
						sum += obj.tabMoreWidth;
					}
				}


				leafWidth = common._content_width - sum;

				if (leafWidth>0 && !obj.type)
					html += "<div class='webix_tab_filler' style='width:"+leafWidth+"px;'>&nbsp;</div>";
			}

			resultHTML = "";

			// consider top and bottom offset in tabs height (top tabbar)
			style = (verticalOffset&& !obj.type)?"height:"+(common._content_height-verticalOffset)+"px":"";

			//space above tabs (top tabbar)
			if(obj.topOffset && !obj.type)
				resultHTML += "<div class='webix_before_all_tabs' style='width:100%;height:"+obj.topOffset+"px'></div>";

			// tabs html
			resultHTML +=  "<div style='"+style+"' role='tablist' class='webix_all_tabs "+(obj.type?("webixtype_"+obj.type):"")+"'>"+html+"</div>";

			//space below to tabs (top tabbar)
			if(obj.bottomOffset && !obj.type)
				resultHTML += "<div class='webix_after_all_tabs' style='width:100%;height:"+obj.bottomOffset+"px'></div>";

			return resultHTML;
		}
	},
	_getInputNode:function(){
		return this.$view.querySelectorAll(".webix_item_tab");
	},
	_getTabHTML: function(tab,width){
		var	html,
			className = "",
			config = this.config;

		if(tab.id== config.value)
			className=" webix_selected";

		if (tab.css)
			className+=" "+tab.css;

		width = (tab.width||width);

		html ="<div class=\"webix_item_tab"+className+"\" button_id=\""+tab.id+"\" role=\"tab\" aria-selected=\""+(tab.id== config.value?"true":"false")+"\" tabindex=\""+(tab.id== config.value?"0":"-1")+"\" style=\"width:"+width+"px;\">";

		// a tab title
		if(this._tabTemplate){
			var calcHeight = this._content_height- config.inputPadding*2 - 2;
			var height = this._content_height - 2;
			var temp = extend({ cheight: calcHeight, aheight:height }, tab);
			html+= this._tabTemplate(temp);
		}
		else {
			var icon = tab.icon?("<span class='webix_icon "+tab.icon+"'></span> "):"";
			html+=icon + tab.value;
		}

		if (tab.close || config.close)
			html+="<span role='button' tabindex='0' aria-label='"+i18n.aria.closeTab+"' class='webix_tab_close webix_icon wxi-close'></span>";

		html+="</div>";
		return html;
	},
	_types:{
		image:"<div class='webix_img_btn_top' style='height:#cheight#px;background-image:url(#image#);'><div class='webix_img_btn_text'>#value#</div></div>",
		icon:"<div class='webix_img_btn' style='line-height:#cheight#px;height:#cheight#px;'><span class='webix_icon_btn #icon#' style='max-width:#cheight#px;max-height:#cheight#px;'></span>#value#</div>",
		iconTop:"<div class='webix_img_btn_top' style='height:#cheight#px;width:100%;top:0px;text-align:center;'><span class='webix_icon #icon#'></span><div class='webix_img_btn_text'>#value#</div></div>"
	},
	type_setter:function(value){
		this._settings.tabOffset = 0;
		if (this._types[value])
			this._tabTemplate = template(this._types[value]);
		return value;
	}
};


const view = protoUI(api,  segmented.view);
export default {api, view};