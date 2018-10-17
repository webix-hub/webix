import {isDate, isArray} from "../webix/helpers";

const CodeParser = {
	//converts a complex object into an object with primitives properties
	collapseNames:function(base, prefix, data){
		data = data || {};
		prefix = prefix || "";

		if(!base || typeof base != "object")
			return null;

		for(var prop in base){
			if(base[prop] && typeof base[prop] == "object" && !isDate(base[prop]) && !isArray(base[prop])){
				CodeParser.collapseNames(base[prop], prefix+prop+".", data);
			} else {
				data[prefix+prop] = base[prop];
			}
		}
		return data;
	},

	//converts an object with primitive properties into an object with complex properties
	expandNames:function(base){
		var data = {},
			i, lastIndex, name, obj, prop;

		for(prop in base){
			name = prop.split(".");
			lastIndex = name.length-1;
			obj = data;
			for( i =0; i < lastIndex; i++ ){
				if(!obj[name[i]])
					obj[name[i]]  = {};
				obj = obj[name[i]];
			}
			obj[name[lastIndex]] = base[prop];
		}

		return data;
	}
};

export default CodeParser;