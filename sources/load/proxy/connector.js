import {ajax} from "../ajax";
import state from "../../core/state";

const proxy = {
	$proxy:true,

	connectorName:"!nativeeditor_status",
	load:function(view, callback){
		ajax(this.source, callback, view);
	},
	saveAll:function(view, updates, dp, callback){
		var url = this.source;

		var data = {};
		var ids = [];
		for (var i = 0; i < updates.length; i++) {
			var action = updates[i];
			ids.push(action.id);

			for (var j in action.data)
				if (j.indexOf("$")!==0)
					data[action.id+"_"+j] = action.data[j];
			data[action.id+"_"+this.connectorName] = action.operation;
		}

		data.ids = ids.join(",");
		data.webix_security = state.securityKey;
	
		url += (url.indexOf("?") == -1) ? "?" : "&";
		url += "editing=true";

		ajax().post(url, data, callback);
	},
	result:function(state, view, dp, text, data, loader){
		data = data.xml();
		if (!data)
			return dp._processError(null, text, data, loader);
		

		var actions = data.data.action;
		if (!actions.length)
			actions = [actions];


		var hash = [];

		for (var i = 0; i < actions.length; i++) {
			var obj = actions[i];
			hash.push(obj);

			obj.status = obj.type;
			obj.id = obj.sid;
			obj.newid = obj.tid;

			dp.processResult(obj, obj, {text:text, data:data, loader:loader});
		}

		return hash;
	}
};

export default proxy;
