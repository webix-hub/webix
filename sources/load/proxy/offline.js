import env from "../../webix/env";
import storage from "../../webix/storage";

import {callEvent} from "../../webix/customevents";
import {ajax} from "../ajax";


const proxy = {
	$proxy:true,

	storage: storage.local,
	cache:false,
	local:false,
	data:"",

	_is_offline : function(){
		if (!this.cache && !env.offline){
			callEvent("onOfflineMode",[]);
			env.offline = true;
		}
	},
	_is_online : function(){
		if (!this.cache && env.offline){
			env.offline = false;
			callEvent("onOnlineMode", []);
		}
	},

	load:function(view, callback){
		var mycallback = {
			error:function(){
				//assuming offline mode
				var text = this.getCache() || this.data;

				var loader = { responseText: text };
				var data = ajax.prototype._data(loader);

				this._is_offline();
				ajax.$callback(view, callback, text, data, loader);
			},
			success:function(text, data, loader){
				this._is_online();
				ajax.$callback(view, callback, text, data, loader);

				this.setCache(text);
			}
		};

		//in cache mode - always load data from cache
		if (this.cache && this.getCache())
			mycallback.error.call(this);
		else {
			//else try to load actual data first
			if (this.source.$proxy)
				this.source.load(this, mycallback);
			else
				ajax(this.source, mycallback, this);
		}
	},
	getCache:function(){
		return this.storage.get(this._data_name());
	},
	clearCache:function(){
		this.storage.remove(this._data_name());
	},
	setCache:function(text){
		this.storage.put(this._data_name(), text);
	},
	_data_name:function(){
		if (this.source.$proxy)
			return this.source.source + "_$proxy$_data";
		else 
			return this.source + "_$proxy$_data";
	},
	save:function(master, data, view, callback){
		if (!env.offline && !this.cache){
			if (this.source.$proxy){
				this.source.save(master, data, view, callback);
			} else {
				ajax().post(this.source, data.data, callback);
			}
		}
	},
	saveAll:function(view, update, dp, callback){
		this.setCache(view.serialize());
		if (this.cache || env.offline){
			ajax.$callback(view, callback, "", update);
		}
	},
	result:function(id, master, dp, text, data){
		for (var i = 0; i < data.length; i++)
			dp.processResult({ id: data[i].id, status: data[i].operation }, {}, {});
	}
};

export default proxy;