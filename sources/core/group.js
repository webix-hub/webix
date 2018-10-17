import {extend, bind} from "../webix/helpers";
import GroupStore from "../core/groupstore";


const Group = {
	$init:function(){
		extend(this.data, GroupStore);
		//in case of plain store we need to remove store original dataset
		this.data.attachEvent("onClearAll",bind(function(){
			this.data._not_grouped_order = this.data._not_grouped_pull = null;
			this._group_level_count = 0;
		},this));
	},
	group:function(config){
		this.data.ungroup(true);
		this.data.group(config);
	},
	ungroup:function(skipRender){
		this.data.ungroup(skipRender);
	}
};

export default Group;