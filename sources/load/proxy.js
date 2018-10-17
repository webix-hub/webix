import {assert} from "../webix/debug";
import {extend, copy as makeCopy} from "../webix/helpers";

import binary from "./proxy/binary";
import connector from "./proxy/connector";
import debug from "./proxy/debug";
import faye from "./proxy/faye";
import indexdb from "./proxy/indexdb";
import json from "./proxy/json";
import post from "./proxy/post";
import rest from "./proxy/rest";
import sync from "./proxy/sync";
import offline from "./proxy/offline";
import cache from "./proxy/cache";
import local from "./proxy/local";
import graphql from "./proxy/graphql";

function proxy(name, source, extra){
	assert(proxy[name], "Invalid proxy name: "+name);

	var copy = makeCopy(proxy[name]);
	copy.source = source;

	if (extra)
		extend(copy, extra, true);

	if (copy.init) copy.init();
	return copy;
}

proxy.$parse = function(value){
	if (typeof value == "string" && value.indexOf("->") != -1){
		var parts = value.split("->");
		return proxy(parts[0], parts[1]);
	}
	return value;
};

proxy.binary = binary;
proxy.connector = connector;
proxy.debug = debug;
proxy.faye = faye;
proxy.indexdb = indexdb;
proxy.json = json;
proxy.post = post;
proxy.rest = rest;
proxy.sync = sync;
proxy.offline = offline;
proxy.cache = cache;
proxy.local = local;
proxy.local = local;
proxy.GraphQL = graphql;

export default proxy;