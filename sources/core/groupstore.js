import {toArray} from "../webix/helpers";
import {assert} from "../webix/debug";
import GroupMethods from "../core/groupmethods";


const GroupStore = {
	$init:function(){
		this.attachEvent("onClearAll", this._reset_groups);
	},
	_reset_groups:function(){
		this._not_grouped_order = this._not_grouped_pull = null;
		this._group_level_count = 0;
	},
	ungroup:function(skipRender){
		if (this.getBranchIndex)
			return this._ungroup_tree.apply(this, arguments);

		if (this._not_grouped_order){
			this.order = this._not_grouped_order;
			this.pull = this._not_grouped_pull;
			this._not_grouped_pull = this._not_grouped_order = null;
			if(!skipRender)
				this.callEvent("onStoreUpdated",[]);
		}

	},
	_group_processing:function(scheme){
		this.blockEvent();
		this.group(scheme);
		this.unblockEvent();
	},
	_group_prop_accessor:function(val){
		if (typeof val == "function")
			return val;
		var acc = function(obj){ return obj[val]; };
		acc.$name = val;
		return acc;
	},	
	group:function(stats){ 
		if (this.getBranchIndex)
			return this._group_tree.apply(this, arguments);

		if(typeof stats == "string")
			stats = { by:stats, map:{}};
		var input = typeof stats.by == "function" ? "value" : stats.by;
		var key = this._group_prop_accessor(stats.by);

		if (!stats.map[input])
			stats.map[input] = [input, this._any];
			
		var groups = {};
		var labels = [];
		this.each(function(data){
			var current = key(data);
			if (!groups[current]){
				labels.push({ id:current, $group:true, $row:stats.row });
				groups[current] = toArray();
			}
			groups[current].push(data);
		});
		for (var prop in stats.map){
			var functor = (stats.map[prop][1]||"any");
			var property = this._group_prop_accessor(stats.map[prop][0]);
			if (typeof functor != "function"){
				assert(GroupMethods[functor], "unknown grouping rule: "+functor);
				functor = GroupMethods[functor];
			}

			for (let i=0; i < labels.length; i++) {
				labels[i][prop]=functor.call(this, property, groups[labels[i].id]);
			}
		}
			
		this._not_grouped_order = this.order;
		this._not_grouped_pull = this.pull;
		
		this.order = toArray();
		this.pull = {};
		for (let i=0; i < labels.length; i++){
			var id = this.id(labels[i]);
			this.pull[id] = labels[i];
			this.order.push(id);
			if (this._scheme_init)
				this._scheme_init(labels[i]);
		}
		
		this.callEvent("onStoreUpdated",[]);
	},
	_group_tree:function(input, parent){
		this._group_level_count = (this._group_level_count||0) + 1;

		//supports simplified group by syntax
		var stats;
		if (typeof input == "string"){
			stats = { by:this._group_prop_accessor(input), map:{} };
			stats.map[input] = [input];
		} else if (typeof input == "function"){
			stats = { by:input, map:{} };
		} else
			stats = input;
		
		//prepare
		var level;
		if (parent)
			level = this.getItem(parent).$level;
		else {
			parent  = 0;
			level = 0;
		}
		
		var order = this.branch[parent];
		var key = this._group_prop_accessor(stats.by);
		
		//run
		var topbranch = [];
		var labels = [];
		for (let i=0; i<order.length; i++){
			var data = this.getItem(order[i]);
			var current = key(data);
			var current_id = level+"$"+current;
			var ancestor = this.branch[current_id];

			if (!ancestor){
				var newitem = this.pull[current_id] = { id:current_id, value:current, $group:true, $row:stats.row};
				if (this._scheme_init)
					this._scheme_init(newitem);
				labels.push(newitem);
				ancestor = this.branch[current_id] = [];
				ancestor._formath = [];
				topbranch.push(current_id);
			}
			ancestor.push(data.id);
			ancestor._formath.push(data);
		}

		this.branch[parent] = topbranch;
		for (let prop in stats.map){
			let functor = (stats.map[prop][1]||"any");
			let property = this._group_prop_accessor(stats.map[prop][0]);
			if (typeof functor != "function"){
				assert(GroupMethods[functor], "unknown grouping rule: "+functor);
				functor = GroupMethods[functor];
			}
				
			for (let i=0; i < labels.length; i++)
				labels[i][prop]=functor.call(this, property, this.branch[labels[i].id]._formath);
		}

		for (let i=0; i < labels.length; i++){
			var group = labels[i];

			if (this.hasEvent("onGroupCreated"))
				this.callEvent("onGroupCreated", [group.id, group.value, this.branch[group.id]._formath]);

			if (stats.footer){
				var id = "footer$"+group.id;
				var footer = this.pull[id] = { id:id, $footer:true, value: group.value, $level:level, $count:0, $parent:group.id, $row:stats.footer.row};
				for (let prop in stats.footer){
					let functor = (stats.footer[prop][1]||"any");
					let property = this._group_prop_accessor(stats.footer[prop][0]);
					if (typeof functor != "function"){
						assert(GroupMethods[functor], "unknown grouping rule: "+functor);
						functor = GroupMethods[functor];
					}

					footer[prop]=functor.call(this, property, this.branch[labels[i].id]._formath);
				}
				
				this.branch[group.id].push(footer.id);
				this.callEvent("onGroupFooter", [footer.id, footer.value, this.branch[group.id]._formath]);
			}

			delete this.branch[group.id]._formath;
		}
			

		this._fix_group_levels(topbranch, parent, level+1);
			
		this.callEvent("onStoreUpdated",[]);
	},
	_ungroup_tree:function(skipRender, parent, force){
		//not grouped
		if (!force && !this._group_level_count) return;
		this._group_level_count = Math.max(0, this._group_level_count -1 );

		parent = parent || 0;
		var order = [];
		var toporder = this.branch[parent];
		for (let i=0; i<toporder.length; i++){
			var id = toporder[i];
			var branch = this.branch[id];
			if (branch)
				order = order.concat(branch);

			delete this.pull[id];
			delete this.branch[id];
		}

		this.branch[parent] = order;
		for (let i = order.length - 1; i >= 0; i--) {
			if (this.pull[order[i]].$footer)
				order.splice(i,1);
		}
		this._fix_group_levels(order, 0, 1);

		if (!skipRender)
			this.callEvent("onStoreUpdated",[]);
	},
	_fix_group_levels:function(branch, parent, level){
		if (parent)
			this.getItem(parent).$count = branch.length;

		for (var i = 0; i < branch.length; i++) {
			var item = this.pull[branch[i]];
			item.$level = level;
			item.$parent = parent;
			var next = this.branch[item.id];
			if (next)
				this._fix_group_levels(next, item.id, level+1);
		}
	}
};

export default GroupStore;