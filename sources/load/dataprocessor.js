import {assert} from "../webix/debug";
import {copy, isUndefined, bind} from "../webix/helpers";
import {callEvent} from "../webix/customevents";
import {define} from "../services";

import {$$, proto} from "../ui/core";

import {ajax} from "../load/ajax";
import proxy from "../load/proxy";

import Settings from "../core/settings";
import EventSystem from "../core/eventsystem";
import ValidateData from "../core/validatedata";

const _pull = {};

export function dp(name,getOnly){
	if (typeof name == "object" && name._settings)
		name = name._settings.id;
	if (_pull[name] || getOnly)
		return _pull[name];

	if (typeof name == "string"||typeof name == "number")
		name = { master:$$(name) };

	var dp = new DataProcessor(name);
	var masterId = dp._settings.master._settings.id;
	_pull[masterId]=dp;

	$$(masterId).attachEvent("onDestruct",function(){
		_pull[this._settings.id] = null;
		delete _pull[this._settings.id];
	});

	return dp;
}

define("dp", dp);

dp.$$ = function(id){
	return _pull[id];
};


export const DataProcessor = proto({
	defaults: {
		autoupdate:true,
		updateFromResponse:false,
		mode:"post",
		operationName:"webix_operation",
		trackMove:false
	},


	/*! constructor
	 **/
	$init: function() {
		this.reset();
		this._ignore = false;
		this.name = "DataProcessor";
		this.$ready.push(this._after_init_call);
	},
	reset:function(){
		this._updates = [];
	},
	url_setter:function(value){
		/*
			we can use simple url or mode->url
		*/
		var mode = "";
		if (typeof value == "string"){
			var parts = value.split("->");
			if (parts.length > 1){
				value = parts[1];
				mode = parts[0];
			}
		} else if (value && value.mode){
			mode = value.mode;
			value = value.url;
		}

		if (mode)
			return proxy(mode, value);

		return value;
	},
	master_setter:function(value){
		var store = value;
		if (value.name != "DataStore")
			store = value.data;

		this._settings.store = store;
		return value;
	},
	/*! attaching onStoreUpdated event
	 **/
	_after_init_call: function(){
		assert(this._settings.store, "store or master need to be defined for the dataprocessor");
		this._settings.store.attachEvent("onStoreUpdated", bind(this._onStoreUpdated, this));
		this._settings.store.attachEvent("onDataMove", bind(this._onDataMove, this));
	},
	ignore:function(code,master){
		var temp = this._ignore;
		this._ignore = true;
		code.call((master||this));
		this._ignore = temp;
	},
	off:function(){
		this._ignore = true;
	},
	on:function(){
		this._ignore = false;
	},

	_copy_data:function(source){
		var obj = {};
		for (var key in source)	
			if (key.indexOf("$")!==0)
				obj[key]=source[key];
		return obj;
	},
	save:function(id, operation, obj){
		operation = operation || "update";
		this._save_inner(id, (obj || this._settings.store.getItem(id)), operation);
	},
	_save_inner:function(id, obj, operation){
		if (typeof id == "object") id = id.toString();
		if (!id || this._ignore === true || !operation || operation == "paint") return true;

		var store = this._settings.store;
		if (store && store._scheme_serialize)
			obj = store._scheme_serialize(obj);

		var update = { id: id, data:this._copy_data(obj), operation:operation };
		//save parent id
		if (!isUndefined(obj.$parent)) update.data.parent = obj.$parent;

		if (update.operation != "delete"){
			//prevent saving of not-validated records
			var master = this._settings.master;
			if (master && master.data && master.data.getMark && master.data.getMark(id, "webix_invalid"))
				update._invalid = true;

			if (!this.validate(null, update.data))
				update._invalid = true;
		}

		if (this._check_unique(update))
			this._updates.push(update);

		if (this._settings.autoupdate)
			this.send();
			
		return true;
	},
	_onDataMove:function(sid, tindex, parent, targetid){
		if (this._settings.trackMove){
			var obj = copy(this._settings.store.getItem(sid));

			obj.webix_move_index = tindex;
			obj.webix_move_id = targetid;
			obj.webix_move_parent = parent;
			this._save_inner(sid, obj, "order");
		}
	},
	_onStoreUpdated: function(id, obj, operation){
		switch (operation) {
			case "save":
				operation = "update";
				break;
			case "update":
				operation = "update";
				break;
			case "add":
				operation = "insert";
				break;
			case "delete":
				operation = "delete";				
				break;
			default:
				return true;
		}
		return this._save_inner(id, obj, operation);
	},
	_check_unique:function(check){
		for (var i = 0; i < this._updates.length; i++){
			var one = this._updates[i];
			if (one.id == check.id && !one._in_progress){
				if (check.operation == "delete"){
					if (one.operation == "insert")
						this._updates.splice(i,1);
					else 
						one.operation = "delete";
				}
				one.data = check.data;
				one._invalid = check._invalid;
				return false;
			}
		}
		return true;
	},
	send:function(){
		this._sendData();
	},
	_sendData: function(){
		if (!this._settings.url)
			return;

		var marked = this._updates;
		var to_send = [];
		var url = this._settings.url;

		for (var i = 0; i < marked.length; i++) {
			var tosave = marked[i];

			if (tosave._in_progress) continue;
			if (tosave._invalid) continue;

			var id = tosave.id;
			var operation = tosave.operation;
			var precise_url = (typeof url == "object" && !url.$proxy) ? url[operation] : url;
			var proxy = precise_url && (precise_url.$proxy || typeof precise_url === "function");

			if (!precise_url) continue;

			if (this._settings.store._scheme_save)
				this._settings.store._scheme_save(tosave.data);

			if (!this.callEvent("onBefore"+operation, [id, tosave]))
				continue;
			tosave._in_progress = true;

			if (!this.callEvent("onBeforeDataSend", [tosave])) return;

			tosave.data = this._updatesData(tosave.data);

			var callback = this._send_callback({ id:tosave.id, status:tosave.operation });
			if (precise_url.$proxy){
				if (precise_url.save)
					precise_url.save(this.config.master, tosave, this, callback);
				to_send.push(tosave);
			} else {
				if (operation == "insert") delete tosave.data.id;

				
				if (proxy){
					//promise
					precise_url(tosave.id, tosave.operation, tosave.data).then(
						function(data){
							if (data && typeof data.json == "function")
								data = data.json();
							callback.success("", data, -1);
						},
						function(error){
							callback.error("", null, error);
						}
					);
				} else {
					//normal url
					tosave.data[this._settings.operationName] = operation;

					this._send(precise_url, tosave.data, this._settings.mode, operation, callback);
				}
			}

			this.callEvent("onAfterDataSend", [tosave]);
		}

		if (url.$proxy && url.saveAll && to_send.length)
			url.saveAll(this.config.master, to_send, this, this._send_callback({}));
	},


	/*! process updates list to POST and GET params according dataprocessor protocol
	 *	@param updates
	 *		list of objects { id: "item id", data: "data hash", operation: "type of operation"}
	 *	@return
	 *		object { post: { hash of post params as name: value }, get: { hash of get params as name: value } }
	 **/



	_updatesData:function(source){
		var target = {};
		for (var j in source){
			if (j.indexOf("$")!==0)
				target[j] = source[j];
		}
		return target;
	},



	/*! send dataprocessor query to server
	 *	and attach event to process result
	 *	@param url
	 *		server url
	 *	@param get
	 *		hash of get params
	 *	@param post
	 *		hash of post params
	 *	@mode
	 *		'post' or 'get'
	 **/
	_send: function(url, post, mode, operation, callback) {
		assert(url, "url was not set for DataProcessor");

		if (typeof url == "function")
			return url(post, operation, callback);

		ajax()[mode](url, post, callback);
	},
	_send_callback:function(id){
		var self = this;
		return {
			success:function(t,d,l){ return self._processResult(id, t,d,l); },
			error  :function(t,d,l){ return self._processError(id, t,d,l); }
		};
	},
	attachProgress:function(start, end, error){
		this.attachEvent("onBeforeDataSend", start);
		this.attachEvent("onAfterSync", end);
		this.attachEvent("onAfterSaveError", error);
		this.attachEvent("onLoadError", error);
	},
	_processError:function(id, text, data, loader){
		if (id)
			this._innerProcessResult(true, id.id, false, id.status, false, {text:text, data:data, loader:loader});
		else {
			this.callEvent("onLoadError", arguments);
			callEvent("onLoadError", [text, data, loader, this]);
		}
	},
	_innerProcessResult:function(error, id, newid, status, obj, details){
		var master = this._settings.master;
		var update = this.getItemState(id);
		update._in_progress = false;

		if (error){
			if (this.callEvent("onBeforeSaveError", [id, status, obj, details])){
				update._invalid = true;
				if(this._settings.undoOnError && master._settings.undo){
					this.ignore(function(){
						master.undo(id);
					});
					this.setItemState(id, false);
				}
				this.callEvent("onAfterSaveError", [id, status, obj, details]);
			}
			return;
		} else
			this.setItemState(id, false);

		//update from response
		if (newid && id != newid)
			this._settings.store.changeId(id, newid);

		if (obj && status != "delete" && this._settings.updateFromResponse)
			this.ignore(function(){				
				this._settings.store.updateItem(newid || id, obj);
			});
			

		//clean undo history, for the saved record
		if(this._settings.undoOnError && master._settings.undo)
			master.removeUndo(newid||id);

		this.callEvent("onAfterSave",[obj, id, details]);
		this.callEvent("onAfter"+status, [obj, id, details]);
	},
	processResult: function(state, hash, details){
		//compatibility with custom json response
		var error = (hash && (hash.status == "error" || hash.status == "invalid"));
		var newid = (hash ? ( hash.newid || hash.id ) : false);

		this._innerProcessResult(error, state.id, newid, state.status, hash, details);
	},
	// process saving from result
	_processResult: function(state, text, data, loader){
		this.callEvent("onBeforeSync", [state, text, data, loader]);

		if (loader === -1){
			//callback from promise
			this.processResult(state, data, {});
		} else {
			var proxy = this._settings.url;
			if (proxy.$proxy && proxy.result)
				proxy.result(state, this._settings.master, this, text,  data, loader);
			else {
				var hash;
				if (text){
					hash = data.json();
					//invalid response
					if (text && (hash === null || typeof hash == "undefined"))
						hash = { status:"error" };
				}
				this.processResult(state, hash,  {text:text, data:data, loader:loader});
			}
		}

		this.callEvent("onAfterSync", [state, text, data, loader]);
	},


	/*! if it's defined escape function - call it
	 *	@param value
	 *		value to escape
	 *	@return
	 *		escaped value
	 **/
	escape: function(value) {
		if (this._settings.escape)
			return this._settings.escape(value);
		else
			return encodeURIComponent(value);
	},
	getState:function(){
		if (!this._updates.length) return false;
		for (var i = this._updates.length - 1; i >= 0; i--)
			if (this._updates[i]._in_progress)
				return "saving";

		return true;
	},
	getItemState:function(id){
		var index = this._get_stack_index(id);
		return this._updates[index] || null;
	},
	setItemState:function(id, state){
		if (state)
			this.save(id, state);
		else{
			var index = this._get_stack_index(id);
			if (index > -1)
				this._updates.splice(index, 1);
		}
	},
	_get_stack_index: function(id) {
		var index = -1;
		for (var i=0; i < this._updates.length; i++)
			if (this._updates[i].id == id) {
				index = i;
				break;
			}

		return index;
	}

}, Settings, EventSystem, ValidateData);