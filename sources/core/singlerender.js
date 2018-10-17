import AtomRender from "../core/atomrender";
import {proto} from "../ui/core";
import template from "../webix/template";

import type from "../webix/type";
/*
	REnders single item. 
	Can be used for elements without datastore, or with complex custom rendering logic
	
	@export
		render
*/

const SingleRender = proto({
	template_setter:function(value){
		this.type.template=template(value);
	},
	//convert item to the HTML text
	_toHTML:function(obj){
		var type = this.type;
		return (type.templateStart?type.templateStart(obj,type):"") + type.template(obj,type) + (type.templateEnd?type.templateEnd(obj,type):"");
	},
	customize:function(obj){
		type(this,obj);
	}
}, AtomRender);


export default SingleRender;