

const GroupMethods = {
	sum:function(property, data){
		data = data || this;
		var summ = 0;
		for (var i = 0; i < data.length; i++)
			summ+=property(data[i])*1;

		return summ;
	},
	min:function(property, data){
		data = data || this;
		var min = Infinity;

		for (var i = 0; i < data.length; i++)
			if (property(data[i])*1 < min) min = property(data[i])*1;

		return min*1;
	},
	max:function(property, data){
		data = data || this;
		var max = -Infinity;

		for (var i = 0; i < data.length; i++)
			if (property(data[i])*1 > max) max = property(data[i])*1;

		return max*1;
	},
	count:function(property, data){
		var count = 0;
		for (var i = 0; i < data.length; i++) {
			var some = property(data[i]);
			if (some !== null && typeof some !== "undefined")
				count++;
		}
		return count;
	},
	any:function(property, data){
		return property(data[0]);
	},
	string:function(property){
		return property.$name;
	}
};

export default GroupMethods;