import { ajax } from "../ajax";
import { callEvent } from "../../webix/customevents";
import promise from "../../thirdparty/promiz";

function unbox(data) {
	if (!data || !typeof data === "object" || Array.isArray(data))
		return data;

	var lkey = "";
	var count = 0;
	for (var key in data) {
		count++;
		if (count == 2) return data;
		lkey = key;
	}

	return data[lkey];
}

const GraphQL = {
	$proxy: true,
	save: function (data) {
		return this.load(data);
	},
	load: function (view) {
		var params = {
			query: this.source
		};
		if (arguments.length === 1) {
			params.variables = view;
		}
		let x;  // variable to pass the XmlHttpRequest from the post() callback because its `then` handler doesn't receive it
		return ajax()
			.headers({ "Content-type": "application/json" })
			.post(this.url, params, function (text, data, XmlHttpRequest) {
				x = XmlHttpRequest;
			}).then((data) => {
				const parsed = data.json();
				// GraphQL responses (status codes 2xx) can still contain errors. See https://github.com/apollographql/apollo-server/issues/1709
				if (parsed.errors) {
					if (parsed.data === null) {
						// error only
						callEvent("onAjaxError", [x]);
						return promise.defer().reject(x);
					}
					return unbox(parsed);	// mixed errors and data
				}
				return unbox(parsed.data);	// data only
			});
	}
};

export default GraphQL;
