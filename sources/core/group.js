import {extend} from "../webix/helpers";
import GroupStore from "../core/groupstore";


const Group = {
	$init:function(){
		extend(this.data, GroupStore);
	},
	group:function(config, target){
		if (!target && target !== 0)
			this.data.ungroup(true);
		this.data.group(config, target);
	},
	ungroup:function(skipRender){
		this.data.ungroup(skipRender);
	}
};

export default Group;