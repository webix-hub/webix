import {ajax} from "../ajax";

function unbox(data){
	if (!data || !typeof data === "object" || Array.isArray(data))
		return data;

	var lkey ="";
	var count = 0;
	for (var key in data){
		count++;
		if (count == 2) return data;
		lkey = key;
	}

	return data[lkey];
}

const GraphQL = {
	$proxy:true,
	save:function(data){
		return this.load(data);
	},
	load:function(view, callback){

		var params = {
			query: this.source
		};

		if (arguments.length === 1){
			params.variables = view;
			view = this;
		}


		return ajax().bind(view)
			.headers({ "Content-type": "application/json" })
			.post(this.url, params)
			.then(function(data){
				var flat = unbox(data.json().data);
				if (callback)
					ajax.$callback(view, callback, "", flat, -1);

				return flat;
			});
	}
};

export default GraphQL;