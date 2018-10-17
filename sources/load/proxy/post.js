import {extend} from "../../webix/helpers";

import {ajax} from "../ajax";

const proxy = {
	$proxy:true,
	load:function(view, callback, params){
		params = extend(params||{}, this.params || {}, true);
		ajax().bind(view).post(this.source, params, callback);
	}
};

export default proxy;