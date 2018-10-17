import {bind} from "../webix/helpers";
import DataLoader from "../core/dataloader";


const TreeDataLoader = {
	$init:function(){
		this.data.attachEvent("onStoreUpdated", bind(this._sync_hierarchy, this), null, true);
		//redefine methods
		this._feed_common = this._feed_commonA;
	},
	_feed_commonA:function(id, count, callback, url){
		// branch loading
		var details = (count === 0?{parent: encodeURIComponent(id)}:null);

		DataLoader.prototype._feed_common.call(this,id, count, callback, url, details);
	},
	//load next set of data rows
	loadBranch:function(id, callback, url){
		id = id ||0;
		this.data.url = url || this.data.url;
		if (this.callEvent("onDataRequest", [id,callback,this.data.url]) && this.data.url)
			this.data.feed.call(this, id, 0, callback, url);
	},
	_sync_hierarchy:function(id, data, mode){
		if (!mode || mode == "add" || mode == "delete" || mode == "branch"){
			this.data._sync_to_order(this);
		}
	}
};

export default TreeDataLoader;