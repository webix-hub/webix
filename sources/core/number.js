import i18n from "../webix/i18n";
import rules from "../webix/rules";

const Number={
	getConfig: function(value){
		var config = {
			decimalSize:0,
			groupSize:999,
			prefix:"",
			sufix:""
		};
		var parts = value.split(/[0-9].*[0-9]/g);
		if (parts[0].length)
			config.prefix = parts[0];
		if (parts[1].length)
			config.sufix = parts[1];
		if (config.prefix || config.sufix){
			value = value.substr(config.prefix.length, value.length - config.prefix.length - config.sufix.length);
		}

		var num = value.indexOf("1");
		if (num > 0){
			config.prefix = value.substr(0, num);
			value = value.substr(num);
		}

		var dot = value.indexOf("0");
		if (dot > 0){
			config.decimalSize = value.length - dot;
			config.decimalDelimiter = value[dot-1];
			value = value.substr(0, dot-1);
		}
		var sep = value.match(/[^0-9]/);
		if (sep){
			config.groupSize = value.length - sep.index - 1;
			config.groupDelimiter = value[sep.index];
		}
		return config;
	},
	parse:function(value, config){
		if (!value || typeof value !== "string")
			return value;

		const initialValue = value;

		if (config.prefix)
			value = value.replace(config.prefix, "");
		if (config.sufix)
			value = value.replace(config.sufix, "");

		value = value.trim();

		let decimal = "";
		if (config.decimalDelimiter){
			const ind = value.indexOf(config.decimalDelimiter);
			if (ind > -1){
				decimal = value.substr(ind+1);

				if(!rules.isNumber(decimal))
					return initialValue;

				const count = config.decimalOptional ? Infinity : config.decimalSize;
				decimal = decimal.substr(0, Math.min(decimal.length, count));
				value = value.substr(0, ind);
			}
		}

		let sign = 1;
		if(value[0] == "-"){
			sign = -1;
			value = value.substr(1);
		}

		if(config.groupSize){
			const groups = value.split(config.groupDelimiter);

			//validate groups
			for(let i = 0; i < groups.length; i++){
				const correctSize = (!i && groups[i].length <= config.groupSize) || groups[i].length == config.groupSize;
				if(!correctSize || !rules.isNumber(groups[i]))
					return initialValue;
			}

			value = groups.join("");
		}

		if (!value)
			value = "0";

		if (decimal)
			value += "."+decimal;

		return rules.isNumber(value) ? value * sign : initialValue;
	},
	format: function(value, config){ 
		if (value === "" || typeof value === "undefined") return value;
		
		config = config||i18n;
		value = parseFloat(value);

		var sign = value < 0 ? "-":"";
		value = Math.abs(value);

		if (!config.decimalOptional)
			value = value.toFixed(config.decimalSize);

		var str = value.toString();
		str = str.split(".");

		var int_value = "";
		if (config.groupSize){
			var step = config.groupSize;
			var i=str[0].length;
			do {
				i-=step;
				var chunk = (i>0)?str[0].substr(i,step):str[0].substr(0,step+i);
				int_value = chunk+(int_value?config.groupDelimiter+int_value:"");
			} while(i>0);
		} else
			int_value = str[0];

		if (config.decimalSize || config.decimalOptional)
			str = sign + int_value + (str[1] ? (config.decimalDelimiter + str[1]) : "");
		else
			str = sign + int_value;

		if(config.prefix)
			str = config.prefix + str;
		if(config.sufix)
			str += config.sufix;

		return str;
	},
	numToStr:function(config){
		return function(value){
			return Number.format(value, config);
		};
	}
};

export default Number;