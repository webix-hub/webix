import {ui, $$} from "../ui/core";
import {isUndefined} from "../webix/helpers";
import {create} from "../webix/html";
import {assert} from "../webix/debug";

const fullscreen = {
	set:function(view, config){
		config = config || {};

		if(this._view)
			this.exit();

		if($$(view))
			view = $$(view);
		else{
			if(typeof view == "string")
				view = document.getElementById(view);
			if(view instanceof Element)
				view = {$view: view, $html: true};
			assert(view, "Incorrect view for fullscreen mode");
		}

		this._view = view;

		const viewConfig = view.config;
		if(view.setPosition){
			this._pos = {left: view.config.left, top: view.config.top};
			view.setPosition(0,0);
			viewConfig.fullscreen = true;
			view.resize();
		}
		else{
			this._fullscreen = ui({
				view:"window",
				head: this._getHeadConfig(config),
				fullscreen:true,
				//better resize logic
				body:{rows:[]}
			});

			if(viewConfig)
				this._sizes = {
					width: viewConfig.width, minWidth: viewConfig.minWidth, maxWidth: viewConfig.maxWidth,
					height: viewConfig.height, minHeight: viewConfig.minHeight, maxHeight: viewConfig.maxHeight
				};

			if(view.getParentView && view.getParentView()){
				this._parent = view.getParentView();

				if(this._parent.index)
					this._pos = {
						index: this._parent.index(view),
						active: (this._parent.getActiveId ? this._parent.getActiveId() == viewConfig.id : false)
					};
			}
			else{
				this._parent = view.$view.parentNode;
				this._pos = create("div");

				//save old position
				this._parent.replaceChild(this._pos, view.$view);
			}

			this._fullscreen.getBody().addView(view.$html ? {view:"template", content:view.$view, css:"webix_fullscreen_html"} : view);

			this._fullscreen.show();
			this._setSizes(view);
		}
	},
	exit:function(){
		if(this._view){
			const viewConfig = this._view.config;
			if(this._view.setPosition){
				viewConfig.fullscreen = false;
				this._view.setPosition(this._pos.left, this._pos.top);
				this._view.resize();
			}
			else{
				if(this._parent instanceof Element){
					this._view._parent_cell = null;
					if(this._view._set_inner)
						this._view._set_inner(this._view.config);
					this._parent.replaceChild(this._view.$view, this._pos);
				}
				else{
					if(!isUndefined(this._pos)){
						this._parent.addView(this._view, this._pos.index);
						if(this._pos.active)
							this._view.show(false, false);
					}
					else{
						this._view._parent_cell = this._parent;
						this._parent._replace(this._view);
					}
				}

				this._setSizes(this._view, this._sizes);

				//prevent view destruction (with layout)
				if(!this._view.$html)
					this._fullscreen.getBody()._cells = [];

				//we can't set head false with replace, so we need to close win
				this._fullscreen.close();
			}
			this._clearValues();
		}
	},
	_clearValues:function(){
		delete this._parent;
		delete this._view;
		delete this._sizes;
		delete this._pos;
	},
	_setSizes:function(view, sizes){
		if(!view.$html){
			sizes = sizes || {height:0, minHeight:0, maxHeight:0, width:0, minWidth:0, maxWidth:0};
			view.define(sizes);
			view.resize();
		}
	},
	_getHeadConfig:function(config){
		if(config.head === false || typeof config.head == "object")
			return config.head;
		else{
			return {
				cols:[
					{template:config.head||"", type:"header", borderless:true},
					{view:"icon", icon:"wxi-close", click:()=>{
						this.exit();
					}}
				]
			};
		}
	}
};

export default fullscreen;