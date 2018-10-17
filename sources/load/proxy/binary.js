import {ajax} from "../ajax";

const proxy = {
	$proxy:true,
	load:function(view, callback){
		var parts = this.source.split("@");
		var ext = parts[0].split(".").pop();
		return ajax().response("arraybuffer").get(parts[0]).then(function(res){
			var options = { ext:ext, dataurl : parts[1] };
			ajax.$callback(view, callback, "", { data:res, options:options }, -1);
		});
	}
};

export default proxy;