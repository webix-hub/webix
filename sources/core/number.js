import i18n from "../webix/i18n";
import rules from "../webix/rules";

const Number={
	getConfig: function(value){
		const config = {
			decimalSize:0,
			groupSize:999,
			minusSign:i18n.minusSign,
			minusPosition:i18n.minusPosition,
			prefix:"",
			sufix:""
		};
		const parts = value.split(/[0-9].*[0-9]/g);
		if (parts[0].length)
			config.prefix = parts[0];
		if (parts[1].length)
			config.sufix = parts[1];
		if (config.prefix || config.sufix){
			value = value.substr(config.prefix.length, value.length - config.prefix.length - config.sufix.length);
		}

		const num = value.indexOf("1");
		if (num > 0){
			config.prefix = value.substr(0, num);
			value = value.substr(num);
		}

		const dot = value.indexOf("0");
		if (dot > 0){
			config.decimalSize = value.length - dot;
			config.decimalDelimiter = value[dot-1];
			value = value.substr(0, dot-1);
		}
		const sep = value.match(/[^0-9]/);
		if (sep){
			config.groupSize = value.length - sep.index - 1;
			config.groupDelimiter = value[sep.index];
		}
		return config;
	},
	parse:function(value, config){
		if (!value || typeof value !== "string")
			return value;

		config = config||i18n;

		const initialValue = value;

		if (config.prefix)
			value = value.replace(config.prefix, "");
		if (config.sufix)
			value = value.replace(config.sufix, "");

		let sign = 1;
		switch(config.minusPosition){
			case "before":
			case "after":
				if(value.indexOf(config.minusSign) != -1){
					sign = -1;
					value = value.replace(config.minusSign, "");
				}
				break;
			case "parentheses":
				if(value.indexOf(config.minusSign[0]) != -1 && value.indexOf(config.minusSign[1]) != -1){
					sign = -1;
					value = value.replace(config.minusSign[0], "").replace(config.minusSign[1], "");
				}
				break;
		}

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

		const sign = value < 0 ? "-":"";
		value = Math.abs(value);

		if (!config.decimalOptional)
			value = value.toFixed(config.decimalSize);

		let str = value.toString();
		str = str.split(".");

		let int_value = "";
		if (config.groupSize){
			const step = config.groupSize;
			let i = str[0].length;
			do {
				i -= step;
				const chunk = (i>0)?str[0].substr(i,step):str[0].substr(0,step+i);
				int_value = chunk+(int_value?config.groupDelimiter+int_value:"");
			} while(i>0);
		} else
			int_value = str[0];

		if (config.decimalSize || config.decimalOptional)
			str = int_value + (str[1] ? (config.decimalDelimiter + str[1]) : "");
		else
			str = int_value;

		if(sign){
			switch(config.minusPosition){
				case "before":
					str = config.minusSign + str;
					break;
				case "after":
					str += config.minusSign;
					break;
				case "parentheses":
					str = config.minusSign[0] + str + config.minusSign[1];
					break;
			}
		}

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