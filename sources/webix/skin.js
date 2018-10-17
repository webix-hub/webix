import {assert} from "../webix/debug";
import {ui} from "../ui/core";

import material from "../css/skins/material/config";
import mini from "../css/skins/mini/config";
import flat from "../css/skins/flat/config";
import compact from "../css/skins/compact/config";
import contrast from "../css/skins/contrast/config";

const skin = { material, mini, flat, compact, contrast };

export var $active, $name;

export function set(name){
	assert(skin[name], "Incorrect skin name: "+name);
	if ($name === name) return;

	$active = skin[name];
	$name = name;

	if (ui){
		for (var key in ui){
			var view = ui[key];
			if (view && view.prototype && view.prototype.$skin)
				view.prototype.$skin(view.prototype);
		}
	}		
}

set(window.webix_skin || "material");

//necessary for skin builder
export { material, mini, flat, compact, contrast };