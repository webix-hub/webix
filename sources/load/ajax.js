import { log, assert } from "../webix/debug";
import { isArray, toArray, extend } from "../webix/helpers";
import { stringify } from "../webix/stringify";
import { callEvent } from "../webix/customevents";
import promise from "../thirdparty/promiz";

import xml from "./drivers/xml";
import json from "./drivers/json";


export const _xhr_aborted = toArray();

export function ajax(url,params,call){
	//if parameters was provided - made fast call
	if (arguments.length!==0){
		return (new ajax()).get(url,params,call);
	}

	if (!this || !this.getXHR) return new ajax(); //allow to create new instance without direct new declaration

	return this;
}

ajax.count = 0;
ajax.prototype={
	master:null,
	//creates xmlHTTP object
	getXHR:function(){
		return new XMLHttpRequest();
	},
	stringify:function(obj){
		return stringify(obj);
	},
	/*
		send data to the server
		params - hash of properties which will be added to the url
		call - callback, can be an array of functions
	*/
	_send:function(url, params, call, mode){
		var master;
		if (params && (isArray(params) || (typeof (params.success || params.error || params) == "function"))){
			master = call;
			call = params;
			params = null;
		}

		var defer = promise.defer();

		var x=this.getXHR();
		if (!isArray(call))
			call = [call];

		call.push({ success: function(_, d){ defer.resolve(d);	},
			error: function(){ defer.reject(x);	}});

		var headers = this._header || {};

		if (!callEvent("onBeforeAjax", [mode, url, params, x, headers, null, defer])) return;

		//add content-type to POST|PUT|DELETE
		var json_mode = false;
		if (mode !== "GET"){
			var found = false;
			for (let key in headers)
				if (key.toString().toLowerCase() == "content-type"){
					found = true;
					if (headers[key] == "application/json")
						json_mode = true;
				}
			if (!found && !(window.FormData && (params instanceof window.FormData)))
				headers["Content-Type"] = "application/x-www-form-urlencoded";
		}

		//add extra params to the url
		if (typeof params == "object" && !(window.FormData && (params instanceof window.FormData))){
			if (json_mode)
				params = this.stringify(params);
			else {
				var t=[];
				for (var a in params){
					var value = params[a];
					if (value === null || value === undefined)
						value = "";
					if(typeof value==="object")
						value = this.stringify(value);
					t.push(a+"="+encodeURIComponent(value)); // utf-8 escaping
				}
				params=t.join("&");
			}
		}

		if (params && mode==="GET"){
			url=url+(url.indexOf("?")!=-1 ? "&" : "?")+params;
			params = null;
		}

		x.open(mode, url, !this._sync);

		var type = this._response;
		if (type) x.responseType = type;

		//if header was provided - use it
		for (let key in headers)
			x.setRequestHeader(key, headers[key]);
		
		//async mode, define loading callback
		var self=this;
		this.master = this.master || master;
		x.onreadystatechange = function(){
			if (!x.readyState || x.readyState == 4){
				ajax.count++;
				if (call && self && !x.aborted){
					//IE8 and IE9, handling .abort call
					if (_xhr_aborted.find(x) != -1)
						return _xhr_aborted.remove(x);

					var owner = self.master||self;

					var is_error = x.status >= 400 || x.status === 0;
					var text, data;
					if (x.responseType == "blob" || x.responseType == "arraybuffer"){
						text = "";
						data = x.response;
					} else {
						text = x.responseText||"";
						data = self._data(x);
					}

					ajax.$callback(owner, call, text, data, x, is_error);
				}
				if (self) self.master=null;
				call=self=master=null;	//anti-leak
			}
		};

		if (this._timeout)
			x.timeout = this._timeout;

		//IE can use sync mode sometimes, fix it
		if (!this._sync)
			setTimeout(function(){
				if (!x.aborted){
					//abort handling in IE9
					if (_xhr_aborted.find(x) != -1)
						_xhr_aborted.remove(x);
					else
						x.send(params||null);
				}
			}, 1);
		else
			x.send(params||null);

		if (this.master && this.master._ajax_queue)
			this.master._ajax_queue.push(x);

		return this._sync?x:defer; //return XHR, which can be used in case of sync. mode
	},
	_data:function(x){
		return {
			xml:function(){ 
				try{
					return xml.tagToObject(xml.toObject(x.responseText, this));
				}
				catch(e){
					log(x.responseText);
					log(e.toString()); assert(0, "Invalid xml data for parsing"); 
				}
			},
			rawxml:function(){ 
				if (!window.XPathResult)
					return xml.fromString(x.responseText);
				return x.responseXML;
			},
			text:function(){ return x.responseText; },
			json:function(){
				return json.toObject(x.responseText, false);
			}
		};
	},
	//GET request
	get:function(url,params,call){
		return this._send(url,params,call,"GET");
	},
	//POST request
	post:function(url,params,call){
		return this._send(url,params,call,"POST");
	},
	//PUT request
	put:function(url,params,call){
		return this._send(url,params,call,"PUT");
	},
	//DELETE request
	del:function(url,params,call){
		return this._send(url,params,call,"DELETE");
	},
	//PATCH request
	patch:function(url,params,call){
		return this._send(url,params,call,"PATCH");
	},

	sync:function(){
		this._sync = true;
		return this;
	},
	timeout:function(num){
		this._timeout = num;
		return this;
	},
	response:function(value){
		this._response = value;
		return this;
	},
	//deprecated, remove in 3.0
	//[DEPRECATED]
	header:function(header){
		assert(false, "ajax.header is deprecated in favor of ajax.headers");
		this._header = header;
		return this;
	},
	headers:function(header){
		this._header = extend(this._header||{},header);
		return this;
	},
	bind:function(master){
		this.master = master;
		return this;
	}
};
ajax.$callback = function(owner, call, text, data, x, is_error){
	if (owner.$destructed) return;
	if (x === -1 && data && typeof data.json == "function")
		data = data.json();

	if (is_error)
		callEvent("onAjaxError", [x]);

	if (!isArray(call))
		call = [call];

	if (!is_error)
		for (let i=0; i < call.length; i++){
			if (call[i]){
				var before = call[i].before;
				if (before)
					before.call(owner, text, data, x);
			}
		}

	for (let i=0; i < call.length; i++)	//there can be multiple callbacks
		if (call[i]){
			var method = (call[i].success||call[i]);
			if (is_error)
				method = call[i].error;
			if (method && method.call)
				method.call(owner,text,data,x);
		}
};