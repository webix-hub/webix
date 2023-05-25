import {addCss, addStyle, removeCss, removeStyle, remove, insertBefore, create} from "../webix/html";
import env from "../webix/env";
import {$$} from "../ui/core";
import {assert} from "../webix/debug";


env.printPPI = 96;
env.printMargin = 0.75*env.printPPI;

//inches, real size is value*ppi
env.printSizes = [
	{ id:"a3", preset:"A3", width: 11.7, height: 16.5 },
	{ id:"a4", preset:"A4", width: 8.27, height: 11.7 },
	{ id: "letter", preset:"letter", width: 8.5, height:11 }
];

var fits = { page:true, data:true};
var modes = { portrait:true, landscape:true};

const print = function(id, options){
	let view = $$(id);
	if (view && view.$printView)
		view = view.$printView();

	assert(view, "non-existing view for printing");
	if(!view) return;

	if(view.callEvent)
		view.callEvent("onBeforePrint", [options]);

	options = _checkOptions(options);
	_beforePrint(options);

	//try widget's custom logic first, sometimes it may deny
	let customPrint;
	if(view.$customPrint){
		customPrint = view.$customPrint(options);
		if(customPrint){
			if(customPrint.then)
				return customPrint.then(()=>_afterPrint(options));
			_print(view, options);
		}
	}
	else
		_print(view, options);

	_afterPrint(options);
};

/*processing print options*/
function _checkOptions(options){
	options = options || {};

	options.paper = options.paper || "a4";
	options.size = env.printSizes.find(size => size.id == options.paper);
	if(!options.size){
		options.size = env.printSizes[0];
		options.paper = options.size.id;
	}

	options.mode = modes[options.mode] ? options.mode : "portrait";
	options.fit = fits[options.fit] ? options.fit: "page";
	options.scroll = options.scroll || false;

	options.margin = (options.margin || options.margin === 0) ? options.margin : {};

	const margin = isNaN(options.margin*1) ? env.printMargin : options.margin;
	options.margin = {
		top:(options.margin.top || options.margin.top === 0) ? options.margin.top: margin, 
		bottom:(options.margin.bottom || options.margin.bottom === 0) ? options.margin.bottom: margin, 
		right:(options.margin.right || options.margin.right === 0) ? options.margin.right: margin, 
		left:(options.margin.left || options.margin.left === 0) ? options.margin.left: margin
	};

	return options;
}

/*preparing printing environment*/
function _beforePrint(options){
	addCss(document.body,"webix_print");

	if(options.docHeader) _getHeaderFooter("Header", options);
	if(options.docFooter) _getHeaderFooter("Footer", options);

	/* static print styles are located at 'css/print.less'*/

	const size = options.size;
	const pageSize =
		size.preset ?
			size.preset + " " + options.mode :
			options.mode == "portrait" ? `${size.width}in ${size.height}in` : `${size.height}in ${size.width}in`;

	const cssString = "@media print { "+
		"@page{ size:"+pageSize+";"+
			"margin-top:"+options.margin.top+"px;margin-bottom:"+options.margin.bottom+
			"px;margin-right:"+options.margin.right+"px;margin-left:"+options.margin.left+
		"px;}"+
	"}";

	addStyle(cssString, "print");
}

/*cleaning environment*/
function _afterPrint(options){
	removeCss(document.body, "webix_print");
	removeStyle("print");

	if(options.docHeader) remove(options.docHeader);
	if(options.docFooter) remove(options.docFooter);
}

/*common print actions */
function _print(view, options){
	var doc = view.$view.cloneNode(true);

	//copy data from all canvases
	var canvases = view.$view.getElementsByTagName("canvas");
	if(canvases.length)
		for(var i = canvases.length-1; i >=0; i--){
			var destCtx = doc.getElementsByTagName("canvas")[i].getContext("2d");
			destCtx.drawImage(canvases[i], 0, 0);
		}

	insertBefore(doc, options.docFooter, document.body);

	addCss(doc,"webix_ui_print");
	if(!options.scroll && ((view._dataobj && view.data && view.data.pull) || view.getBody))
		addCss(doc, "webix_print_noscroll");

	window.print();

	remove(doc);
}
/*custom header nad footer*/
function _getHeaderFooter(group, options){
	var header =  create("div", { 
		"class":"webix_view webix_print_"+group.toLowerCase(),
		"style":"height:0px;visibility:hidden;"
	}, options["doc"+group]);

	if(group ==="Header")
		insertBefore(header, document.body.firstChild);
	else
		document.body.appendChild(header);

	options["doc"+group] = header;
}

export default print;