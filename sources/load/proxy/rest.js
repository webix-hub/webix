import {ajax} from "../ajax";

const proxy = {
	$proxy:true,
	load:function(view, callback){
		ajax(this.source, callback, view);
	},
	save:function(view, update, dp, callback){
		return proxy._save_logic.call(this, view, update, dp, callback, ajax());
	},
	_save_logic:function(view, update, dp, callback, ajax){
		var url = this.source;
		var query = "";
		var mark = url.indexOf("?");

		if (mark !== -1){
			query = url.substr(mark);
			url = url.substr(0, mark);
		}

		url += url.charAt(url.length-1) == "/" ? "" : "/";
		var mode = update.operation;


		var data = update.data;
		if (mode == "insert") delete data.id;

		//call rest URI
		if (mode == "update"){
			ajax.put(url + data.id + query, data, callback);
		} else if (mode == "delete") {
			ajax.del(url + data.id + query, data, callback);
		} else {
			ajax.post(url + query, data, callback);
		}
	}
};

export default proxy;
