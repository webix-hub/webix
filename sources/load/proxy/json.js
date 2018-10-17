import {ajax} from "../ajax";
import rest from "./rest";

const proxy = {
	$proxy:true,
	load:function(view, callback){
		ajax(this.source, callback, view);
	},
	save:function(view, update, dp, callback){
		var xhr = ajax().headers({ "Content-Type":"application/json" });
		return rest._save_logic.call(this, view, update, dp, callback, xhr);
	}
};

export default proxy;