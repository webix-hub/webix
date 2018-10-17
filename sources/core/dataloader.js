import {ajax, _xhr_aborted} from "../load/ajax";
import {toArray, bind, delay, extend, toFunctor} from "../webix/helpers";
import {proto} from "../ui/core";

import {dp} from "../load/dataprocessor";
import proxy from "../load/proxy";
import promise from "../thirdparty/promiz";

import DataStore from "../core/datastore";
import AtomDataLoader from "../core/atomdataloader";


/*
	Behavior:DataLoader - load data in the component
	
	@export
		load
		parse
*/
const DataLoader =proto({
	$init:function(config){
		//prepare data store
		config = config || "";
		
		//list of all active ajax requests
		this._ajax_queue = toArray();
		this._feed_last = {};

		this.data = new DataStore();

		this.data.attachEvent("onClearAll",bind(this._call_onclearall,this));
		this.data.attachEvent("onServerConfig", bind(this._call_on_config, this));
		this.attachEvent("onDestruct", this._call_onclearall);

		this.data.feed = this._feed;
		this.data.owner = config.id;
	},
	_feed:function(from,count,callback){
		//allow only single request at same time
		if (this._load_count)
			return (this._load_count=[from,count,callback]);	//save last ignored request
		else
			this._load_count=true;
		this._feed_last.from = from;
		this._feed_last.count = count;
		this._feed_common.call(this, from, count, callback);
	},
	_feed_common:function(from, count, callback, url, details){
		var state = null;
		url = url || this.data.url;

		var final_callback = [
			{ success: this._feed_callback, error: this._feed_callback },
			callback
		];

		if (from<0) from = 0;

		if(!details)
			details = { start: from, count:count };

		if(this.count())
			details["continue"] = "true";

		if (this.getState)
			state = this.getState();

		// proxy
		if (url && typeof url != "string"){
			if (state){
				if (state.sort)
					details.sort = state.sort;
				if (state.filter)
					details.filter = state.filter;
			}
			this.load(url, final_callback, details);
		} else { // GET
			url = url+((url.indexOf("?")==-1)?"?":"&");

			var params = [];
			for(var d in details){
				params.push(d+"="+details[d]);
			}
			if (state){
				if (state.sort)
					params.push("sort["+state.sort.id+"]="+encodeURIComponent(state.sort.dir));
				if (state.filter)
					for (var key in state.filter){
						var filterValue = state.filter[key];
						if(typeof filterValue == "object")
							filterValue = ajax().stringify(filterValue); //server daterangefilter
						params.push("filter["+key+"]="+encodeURIComponent(filterValue));
					}
			}

			url += params.join("&");
			if (this._feed_last.url !== url){
				this._feed_last.url = url;
				this.load(url, final_callback);
			} else {
				this._load_count = false;
			}
		}
	},
	_feed_callback:function(){
		//after loading check if we have some ignored requests
		var temp = this._load_count;
		this._load_count = false;
		if (typeof temp =="object")
			this.data.feed.apply(this, temp);	//load last ignored request
	},
	//loads data from external URL
	load:function(url){
		url = proxy.$parse(url);
		var ajax = AtomDataLoader.load.apply(this, arguments);

		//prepare data feed for dyn. loading
		if (!this.data.url)
			this.data.url = url;

		return ajax;
	},
	//load next set of data rows
	loadNext:function(count, start, callback, url, now){
		var config = this._settings;
		if (config.datathrottle && !now){
			if (this._throttle_request)
				window.clearTimeout(this._throttle_request);
			this._throttle_request = delay(function(){
				this.loadNext(count, start, callback, url, true);
			},this, 0, config.datathrottle);
			return;
		}

		if (!start && start !== 0) start = this.count();
		if (!count)
			count = config.datafetch || this.count();

		this.data.url = this.data.url || url;
		if (this.callEvent("onDataRequest", [start,count,callback,url]) && this.data.url)
			this.data.feed.call(this, start, count, callback);
	},
	_maybe_loading_already:function(count, from){
		var last = this._feed_last;
		if(this._load_count && last.url){
			if (last.from<=from && (last.count+last.from >= count + from )) return true;
		}
		return false;
	},
	removeMissed_setter:function(value){
		return (this.data._removeMissed = value);
	},
	//init of dataprocessor delayed after all settings processing
	//because it need to be the last in the event processing chain
	//to get valid validation state
	_init_dataprocessor:function(){
		var url = this._settings.save;

		if (url === true)
			url = this._settings.save = this._settings.url;

		var obj = { master: this };
		
		if (url && url.url)
			extend(obj, url);
		else
			obj.url = url;

		dp(obj);
	},
	save_setter:function(value){
		if (value)
			this.$ready.push(this._init_dataprocessor);

		return value;
	},
	scheme_setter:function(value){
		this.data.scheme(value);
	},
	dataFeed_setter:function(value){
		value = proxy.$parse(value);

		this.data.attachEvent("onBeforeFilter", bind(function(text, filtervalue){
			//complex filtering, can't be routed to dataFeed
			if (typeof text == "function") return true;

			//we have dataFeed and some text
			if (this._settings.dataFeed && (text || filtervalue)){
				text = text || "id";
				if (filtervalue && typeof filtervalue == "object")
					filtervalue = filtervalue.id;

				this.clearAll();
				var url = this._settings.dataFeed;

				//js data feed
				if (typeof url == "function"){
					var filter = {};
					filter[text] = filtervalue;
					url.call(this, filtervalue, filter);
				} else if (url.$proxy) {
					if (url.load){
						var filterobj = {}; filterobj[text] = filtervalue;
						url.load(this, {
							success: this._onLoad,
							error: this._onLoadError
						}, { filter: filterobj });
					}
				} else {
				//url data feed
					var urldata = "filter["+text+"]="+encodeURIComponent(filtervalue);
					this.load(url+(url.indexOf("?")<0?"?":"&")+urldata, this._settings.datatype);
				}
				return false;
			}
		},this));
		return value;
	},
	_call_onready:function(){
		if (this._settings.ready && !this._ready_was_used){
			var code = toFunctor(this._settings.ready, this.$scope);
			if (code)
				delay(code, this, arguments);
			if (this.callEvent)
				delay(this.callEvent, this, ["onReady", []]);
			this._ready_was_used = true;
		}
	},
	_call_onclearall:function(soft){
		for (var i = 0; i < this._ajax_queue.length; i++){
			var xhr = this._ajax_queue[i];

			//IE9 and IE8 deny extending of ActiveX wrappers
			try { xhr.aborted = true; } catch(e){ 
				_xhr_aborted.push(xhr);
			}
			xhr.abort();
		}
		if (!soft){
			this._load_count = false;
			this._feed_last = {};
			this._ajax_queue = toArray();
			this.waitData = promise.defer();
		}
	},
	_call_on_config:function(config){
		this._parseSeetingColl(config);
	}
},AtomDataLoader);



export default DataLoader;