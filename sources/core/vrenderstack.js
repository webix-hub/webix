import {offset, insertBefore, remove} from "../webix/html";
import {bind} from "../webix/helpers";
import base from "../views/view";
import {_event} from "../webix/htmlevents";
import Touch from "../core/touch";

/*
	Renders collection of items on demand
*/
const VRenderStack = {
	$init:function(){
		this._htmlmap = {};

		if (Touch.$active){
			this.attachEvent("onBeforeScroll", function(){ 
				this._in_touch_scroll = true;
			});
			this.attachEvent("onAfterScroll", function(){
				this.render(null, null, "paint");
				this._in_touch_scroll = false;
			});
			this.attachEvent("onTouchMove", function(){
				if (this._in_touch_scroll){
					this.blockEvent();
					this.render(null, null, "paint");
					this.unblockEvent();
				}
			});
		} else {
			_event(this._viewobj, "scroll", bind(function(){
				this.render(null, null, "paint");
			}, this));
		}
	},
	_sync_scroll:function(x,y,t){

		if (this._settings.footer)
			Touch._set_matrix(this._footer.childNodes[1].firstChild,x,0,t);

		this.callEvent("onSyncScroll", [x,y,t]);
	},
	//return html container by its ID
	//can return undefined if container doesn't exists
	getItemNode:function(search_id){
		return this._htmlmap && this._htmlmap[search_id];
	},
	/*change scrolling state of top level container, so related item will be in visible part*/
	showItem:function(id){
		var index = this.data.getIndexById(id);
		if (index > -1){
			var top = index*this.type.height;
			var bottom = top + this.type.height;
			var scroll = this.getScrollState();
			var box = offset(this.$view);
			if (top < scroll.y)
				this.scrollTo(0, top);
			else if (bottom > scroll.y+box.height)
				this.scrollTo(0, bottom-box.height);
		}
	},
	//update view after data update
	//when called without parameters - all view refreshed
	render:function(id,data,type){
		if (!this.isVisible(this._settings.id) || this.$blockRender)
			return;
		
		var parent = (this._renderobj||this._dataobj);

		if (id){
			if (type == "paint" || type == "update"){
				var cont = this.getItemNode(id); //get html element of updated item
				if (cont){
					var t = this._htmlmap[id] = this._toHTMLObject(data);
					t.style.top = cont.style.top;
					t.style.position = "absolute";
					t.style.left = 0; t.style.width = "100%";

					insertBefore(t, cont); 
					remove(cont);
					return;
				}
				//updating not rendered yet item
				return;
			}
		}

		if (type != "paint"){
			//repaint all
			this._htmlmap = {};
			parent.innerHTML = "";
		}

		//full reset
		if (this.callEvent("onBeforeRender",[this.data])){
			var count = this.data.count();
			var scroll = this.getScrollState();
			var box = offset(this._viewobj);

			var top = Math.floor(scroll.y / this.type.height)-2;
			var bottom = Math.ceil((scroll.y + box.height)/ this.type.height)+2;

			top = Math.max(0, top);
			bottom = Math.min(this.data.count()-1, bottom);

			var html = [];
			for (let i=top; i<=bottom; i++){
				var sid = this.data.order[i];
				if (!this._htmlmap[sid]){
					var item = this.data.getItem(sid);
					if (!item){
						this._run_load_next({ 
							count:bottom-i+(this._settings.loadahead || 0),
							start:i 
						});
						break;
					}
					html.push(this._toHTML(item));
				} else {
					html.push("<div></div>");
				}
			}

			this._html.innerHTML = html.join("");

			parent.style.position = "relative";
			parent.style.height = count*this.type.height+"px";

			var kids = this._html.childNodes;
			for (let i=kids.length-1; i>=0; i--){
				var child = kids[i];
				var cid = child.getAttribute(this._id);

				if (cid){
					child.style.position = "absolute";
					child.style.top = (top+i)*this.type.height+"px";
					child.style.left = 0; child.style.width = "100%";

					parent.appendChild(child);
					this._htmlmap[cid] = child;
				}
			}
			
			this.callEvent("onAfterRender",[]);
		}
	},
	$setSize:function(){
		if (base.api.$setSize.apply(this, arguments)){
			this.render(null, null, "paint");
		}
	},
	_run_load_next:function(conf){
		var count = Math.max(conf.count, (this._settings.datafetch||this._settings.loadahead||0));
		if (this._maybe_loading_already(conf.count, conf.start)) return;
		this.loadNext(count, conf.start);
	}
};

export default VRenderStack;