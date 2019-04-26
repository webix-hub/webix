import {toArray, uid, copy} from "../webix/helpers";
import {assert} from "../webix/debug";
import GroupMethods from "../core/groupmethods";


const GroupStore = {
	$init:function(){
		this.attachEvent("onClearAll", this._reset_groups);
	},
	_reset_groups:function(){
		if (this.getBranchIndex)
			this._not_grouped_branches = this._created_groupes = null;
		else
			this._not_grouped_order = this._not_grouped_pull = null;
	},
	ungroup:function(skipRender){
		if (this.getBranchIndex)
			return this._ungroup_tree.apply(this, arguments);

		if (this._not_grouped_order){
			this.order = this._not_grouped_order;
			this.pull = this._not_grouped_pull;
			this._not_grouped_pull = this._not_grouped_order = null;
		}
		if(!skipRender)
			this.callEvent("onStoreUpdated",[]);
	},
	_group_processing:function(scheme){
		this.blockEvent();
		this.group(scheme);
		this.unblockEvent();
	},
	_group_prop_accessor:function(val){
		if (typeof val == "function")
			return val;
		const acc = function(obj){ return obj[val]; };
		acc.$name = val;
		return acc;
	},	
	group:function(config, target){
		assert(config, "Empty config");
		let input;

		if (typeof config === "string"){
			input = config;
			config = { by:this._group_prop_accessor(config), map:{} };
		} else if (typeof config === "function"){
			config = { by:config, map:{} };
		} else if (typeof config.by === "string"){
			input = config.by;
			config.by = this._group_prop_accessor(config.by);
		}
		config.map = config.map || {};
		if (input && !config.map[input])
			config.map[input] = [input];
		config.missing = (config.missing === undefined) ? true : config.missing;

		if (this.getBranchIndex)
			return this._group_tree(config, target);
			
		const groups = {};
		const labels = [];
		const missed = [];
		this.each(function(data){
			let current = config.by(data);
			if (!current && current !== 0)
				if (config.missing === false) return;
				else if (config.missing === true){
					missed.push(data);
					return;
				} else current = config.missing;

			if (!groups[current]){
				labels.push({ id:current, value:current, $group:true, $row:config.row });
				groups[current] = toArray();
			}
			groups[current].push(data);
		});

		for (let i=0; i<labels.length; i++){
			let group = labels[i];
			this._map_group(config.map, group, groups[labels[i].id]);

			if (this.hasEvent("onGroupCreated"))
				this.callEvent("onGroupCreated", [group.id, group.value, groups[labels[i].id]]);
		}

		if (!this._not_grouped_order){
			this._not_grouped_order = this.order;
			this._not_grouped_pull = this.pull;
		}
		
		this.order = toArray();
		this.pull = {};
		this._fill_pull(labels);
		this._fill_pull(missed);

		this.callEvent("onStoreUpdated",[]);
	},
	_fill_pull:function(arr){
		for (let i=0; i < arr.length; i++){
			let id = this.id(arr[i]);
			if (this.pull[id])
				id = arr[i].id = uid();

			this.pull[id] = arr[i];
			this.order.push(id);
			if (this._scheme_init)
				this._scheme_init(arr[i]);
		}
	},
	_map_group:function(map, group, data){
		for (let prop in map){
			let functor = (map[prop][1]||"any");
			let property = this._group_prop_accessor(map[prop][0]);
			if (typeof functor != "function"){
				assert(GroupMethods[functor], "Unknown grouping rule: "+functor);
				functor = GroupMethods[functor];
			}

			group[prop] = functor.call(this, property, data);
		}
	},
	_group_tree:function(config, parent){
		//prepare
		let level = 0;
		if (parent)
			level = this.getItem(parent).$level;
		else parent = 0;

		if (!this._not_grouped_branches){
			this._not_grouped_branches = copy(this.branch);
			this._created_groupes = [];
		}
		
		//run
		const topbranch = [];
		const labels = [];
		const missed = [];

		let order = this.branch[parent];
		for (let i=0; i<order.length; i++){
			const data = this.getItem(order[i]);
			let current = config.by(data);

			if (!current && current !== 0)
				if (config.missing === false) continue;
				else if (config.missing === true){
					missed.push(data.id);
					continue;
				} else current = config.missing;

			let current_id = level+"$"+current;
			let ancestor = this.branch[current_id];

			if (!ancestor){
				let newitem = this.pull[current_id] = { id:current_id, value:current, $group:true, $row:config.row};
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
		this._created_groupes = this._created_groupes.concat(topbranch);

		this.branch[parent] = topbranch.concat(missed);
		for (let i=0; i<labels.length; i++){
			let group = labels[i];
			this._map_group(config.map, group, this.branch[labels[i].id]._formath);

			if (this.hasEvent("onGroupCreated"))
				this.callEvent("onGroupCreated", [group.id, group.value, this.branch[group.id]._formath]);

			if (config.footer){
				let id = "footer$"+group.id;
				let footer = this.pull[id] = { id:id, $footer:true, value: group.value, $level:level, $count:0, $parent:group.id, $row:config.footer.row};

				this._map_group(config.footer, footer, this.branch[labels[i].id]._formath);
				
				this.branch[group.id].push(footer.id);
				this.callEvent("onGroupFooter", [footer.id, footer.value, this.branch[group.id]._formath]);
			}
			delete this.branch[group.id]._formath;
		}

		this._fix_group_levels(this.branch[parent], parent, level+1);
		this.callEvent("onStoreUpdated",[]);
	},
	_ungroup_tree:function(skipRender){
		if (this._not_grouped_branches){
			this.branch = this._not_grouped_branches;
			while (this._created_groupes.length)
				delete this.pull[ this._created_groupes.pop() ];

			this._not_grouped_branches = this._created_groupes = null;
			this._fix_group_levels(this.branch[0], 0, 1);
		}
		if (!skipRender)
			this.callEvent("onStoreUpdated",[]);
	},
	_fix_group_levels:function(branch, parent, level){
		if (parent)
			this.getItem(parent).$count = branch.length;

		for (let i = 0; i < branch.length; i++) {
			const item = this.pull[branch[i]];
			item.$level = level;
			item.$parent = parent;

			const next = this.branch[item.id];
			if (next)
				this._fix_group_levels(next, item.id, level+1);
		}
	}
};

export default GroupStore;