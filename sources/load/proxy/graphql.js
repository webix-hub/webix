import { ajax } from "../ajax";
import promise from "../../thirdparty/promiz";

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
	$proxy: true,
	ignoreErrors: true,
	save:function(data){
		return this.load(data);
	},
	load:function(view){
		const params = {
			query: this.source
		};
		const isView = arguments.length > 1;
		let xhr;
		
		if (!isView) params.variables = view;

		return ajax()
			.headers({ "Content-type": "application/json" })
			.post(this.url, params, (...args) => {
				xhr = args[2];
			})
			.then(data => {
				const res = data.json();
				const { data: resData, errors } = res;

				if (errors && !GraphQL.ignoreErrors) {
					if (isView) {
						return promise.reject(xhr);
					} else {
						// promise rejection for external callers
						// the error must be handled via fail/catch in such cases
						return promise.reject({ xhr, errors });
					}
				}

				return unbox(resData);
			});
	}
};

export default GraphQL;