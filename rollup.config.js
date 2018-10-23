import less from "rollup-plugin-less";
import babel from "rollup-plugin-babel";
import replace from "rollup-plugin-replace";
import license from "rollup-plugin-license";
import { uglify } from "rollup-plugin-uglify";
import { eslint } from "rollup-plugin-eslint";

module.exports = function(cli){
	const pkg = require("./package.json");

	const mode = cli["config-mode"] || "fast";
	const outname = cli["config-name"] || ( mode === "min" ? "webix.min" : "webix" );
	const skin = cli["config-skin"] || "material";

	const plugins = [
		replace({
			DEBUG: mode !== "min",
			VERSION: pkg.version
		}),
		less({
			output:"codebase/webix.css",
			option:{
				paths:[ `${__dirname}/sources/css/skins/${skin}` ]
			}
		}),
		license({
			sourceMap: true,
			banner: `@license
webix UI v.<%= pkg.version %>
This software is allowed to use under GPL or you need to obtain Commercial License 
 to use it in non-GPL project. Please contact sales@webix.com for details`
		})
	];

	let sourcemap = false;
	let treeshake = false;


	if (mode !== "fastest"){
		plugins.push(eslint({
			
		}));
		plugins.push(babel({
			exclude: "node_modules/**",
			presets: [
				[
					"@babel/preset-env",
					{
						targets: { "ie": "8" }
					}
				]
			]
		}));

		if (mode !== "fast"){
			sourcemap = (mode === "normal" || mode === "min");
			treeshake = true;
		}
	}

	if (mode === "min"){
		plugins.push(uglify({
			mangle:{
				properties:{ regex:/^_/ },
				reserved:["log", "assert"]
			},
			compress: {
				pure_funcs:["log", "assert"]
			}
		}));
	}

	return {
		treeshake,
		input: "sources/webix.js",
		plugins,
		output: {
			file: `codebase/${outname}.js`,
			format: "umd",
			name: "webix",
			sourcemap
		},
		watch:{
			chokidar: false,
			include: "sources/**/*.js"
		}
	};
};