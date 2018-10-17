import promise from "../thirdparty/promiz";
import proxy from "../load/proxy";
import DataDriver from "../load/drivers/index";


import {ajax} from "../load/ajax";

import {bind, isArray} from "../webix/helpers";
import {callEvent} from "../webix/customevents";

const AtomDataLoader={
	$init:function(config){
		//prepare data store
		this.data = {};
		this.waitData = promise.defer();

		if (config)
			this._settings.datatype = config.datatype||"json";
		this.$ready.push(this._load_when_ready);
	},
	_load_when_ready:function(){
		this._ready_for_data = true;
		
		if (this._settings.url)
			this.url_setter(this._settings.url);
		if (this._settings.data)
			this.data_setter(this._settings.data);
	},
	url_setter:function(value){
		value = proxy.$parse(value);

		if (!this._ready_for_data) return value;
		this.load(value, this._settings.datatype);	
		return value;
	},
	data_setter:function(value){
		if (!this._ready_for_data) return value;
		this.parse(value, this._settings.datatype);
		return true;
	},
	//loads data from external URL
	load:function(url,call){
		var details = arguments[2] || null;

		if(!this.callEvent("onBeforeLoad",[]))
			return promise.reject();		

		if (typeof call == "string"){	//second parameter can be a loading type or callback
			//we are not using setDriver as data may be a non-datastore here
			this.data.driver = DataDriver[call];
			call = arguments[2];
		} else if (!this.data.driver)
			this.data.driver = DataDriver.json;

		//load data by async ajax call
		//loading_key - can be set by component, to ignore data from old async requests
		var callback = [{
			success: this._onLoad,
			error: this._onLoadError
		}];
		
		if (call){
			if (isArray(call))
				callback.push.apply(callback,call);
			else
				callback.push(call);
		}
		
		//proxy	
		url = proxy.$parse(url);
		if (url.$proxy && url.load)
			return url.load(this, callback, details);

		//promize
		if (typeof url === "function"){
			return url(details).then(
				bind(function(data){
					ajax.$callback(this, callback, "", data, -1);
				}, this),
				bind(function(x){
					ajax.$callback(this, callback, "", null, x, true);
				}, this)
			);
		}

		//normal url
		return ajax(url,callback,this);
	},
	//loads data from object
	parse:function(data,type){
		if (data && data.then && typeof data.then == "function"){
			return data.then(bind(function(data){ 
				if (data && typeof data.json == "function")
					data = data.json();
				this.parse(data, type); 
			}, this));
		}

		//loading data from other component
		if (data && data.sync && this.sync)
			return this._syncData(data);

		if(!this.callEvent("onBeforeLoad",[]))
			return promise.reject();

		this.data.driver = DataDriver[type||"json"];
		this._onLoad(data,null);
	},
	_syncData: function(data){
		if(this.data)
			this.data.attachEvent("onSyncApply",bind(function(){
				if(this._call_onready)
					this._call_onready();
			},this));

		this.sync(data);
	},
	_parse:function(data){
		var parsed, record,
			driver = this.data.driver;

		record = driver.getRecords(data)[0];
		parsed = record?driver.getDetails(record):{};

		if (this.setValues)
			this.setValues(parsed);
		else
			this.data = parsed;
	},
	_onLoadContinue:function(data, text, response, loader){
		if (data){
			if(!this.$onLoad || !this.$onLoad(data, this.data.driver)){
				if(this.data && this.data._parse)
					this.data._parse(data); //datastore
				else
					this._parse(data);
			}
		}
		else
			this._onLoadError(text, response, loader);

		//data loaded, view rendered, call onready handler
		if(this._call_onready)
			this._call_onready();

		this.callEvent("onAfterLoad",[]);
		this.waitData.resolve();
	},
	//default after loading callback
	_onLoad:function(text, response, loader){
		var driver = this.data.driver;
		var data;

		if (loader === -1)
			data = driver.toObject(response);
		else{
			//ignore data loading command if data was reloaded 
			if(this._ajax_queue)
				this._ajax_queue.remove(loader);
			data = driver.toObject(text, response);
		}
			
		if(!data || !data.then)
			this._onLoadContinue(data);
		else if(data.then && typeof data.then == "function")
			data.then(bind(this._onLoadContinue, this));
	},
	_onLoadError:function(text, xml, xhttp){
		this.callEvent("onAfterLoad",[]);
		this.callEvent("onLoadError",arguments);
		callEvent("onLoadError", [text, xml, xhttp, this]);
	},
	_check_data_feed:function(data){
		if (!this._settings.dataFeed || this._ignore_feed || !data) return true;
		var url = this._settings.dataFeed;
		if (typeof url == "function")
			return url.call(this, (data.id||data), data);
		url = url+(url.indexOf("?")==-1?"?":"&")+"action=get&id="+encodeURIComponent(data.id||data);
		if(!this.callEvent("onBeforeLoad",[])) 
			return false;
		ajax(url, function(text,xml,loader){
			this._ignore_feed=true;
			var driver = DataDriver.json;
			var data = driver.toObject(text, xml);
			if (data)
				this.setValues(driver.getDetails(driver.getRecords(data)[0]));
			else
				this._onLoadError(text,xml,loader);
			this._ignore_feed=false;
			this.callEvent("onAfterLoad",[]);
		}, this);
		return false;
	}
};

export default AtomDataLoader;