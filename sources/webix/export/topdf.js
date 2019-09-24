import {errorMessage, getExportScheme, getExportData} from "./common";

import i18n from "../../webix/i18n";
import promise from "../../thirdparty/promiz";
import require from "../../load/require";
import env from "../../webix/env";

import {download} from "../../webix/html";
import {isArray} from "../../webix/helpers";
import {extend, isUndefined} from "../../webix/helpers";
import {$$} from "../../ui/core";
import {assert} from "../../webix/debug";

let font = {};
export const toPDF = function(id, options){
	return require([
		env.cdn + "/extras/pdfjs.js", env.cdn + "/extras/html2canvas-1.0.min.js"
	]).then(function(){
		options = options || {};
		
		options.export_mode = "pdf";
		options._export_font = font;
		options.fontName = options.fontName || "pt-sans.regular";
		options.display = options.display || "table";

		id = isArray(id)?id:[id];
		let views = [];

		for (let i = 0; i < id.length; i++) {
			if(!id[i].id) id[i]  = { id:id[i] }; 
			
			let view = $$(id[i].id);
			let viewOptions  = extend(id[i].options || {}, options);

			if (view && view.$exportView)
				view = view.$exportView(viewOptions);

			if(view){
				if(viewOptions.display !== "table"){
					views.push({ node:  view.$view, viewOptions:viewOptions });
					if(options.autowidth)
						options.width = Math.max( options.width||0, view.$view.$width );
				}

				if(viewOptions.display !== "image" && view.data && view.data.pull){
					const scheme = getExportScheme(view, viewOptions);
					views.push({
						scheme: scheme, 
						data: getExportData(view, viewOptions, scheme),
						viewOptions: viewOptions
					});
					if(options.autowidth)
						getAutowidth(scheme, options);
				}
			}
			assert(view, errorMessage);
		}

		if(views.length == 0)
			return promise.reject(errorMessage);

		if(font[options.fontName]){
			options._export_font = font[options.fontName];
			return getPdfData(views, options).then(function(pdf){
				return getBlob(pdf, options);
			});
		}
		else{
			const defer = promise.defer();
			/* global pdfjs */
			pdfjs.load(env.cdn + "/extras/"+options.fontName+".ttf", function(err, buf){
				if(err) throw err;
				options._export_font = font[options.fontName] = new pdfjs.TTFFont(buf);
				defer.resolve(
					getPdfData(views, options).then(function(pdf){
						return getBlob(pdf, options);
					})
				);
			});
			return defer;
		}
	});
};

function getBlob(pdf, options){
	const filename = (options.filename || "Data")+".pdf";
	const blob = new Blob([pdf.toString()], { type: "application/pdf" });

	if(options.download !== false)
		download(blob, filename);
	return blob;
}

function getPdfData(views, options){
	const doc = addPDFDoc(options);
	let promises = [];
	for (let i = 0; i < views.length; i++) {
		if(views[i].node)
			promises.push(getPDFImage(views[i].node));
		else
			promises.push(promise.resolve());
	}

	return promise.all(promises).then(function(images){
		for(let i = 0; i < promises.length; i++){
			const viewOptions = views[i].viewOptions;
			if(viewOptions.textBefore)
				addText(doc, "before", viewOptions.textBefore);

			if(images[i])
				doc.image(images[i], {align:"center"});
			else
				addPDFTable(views[i].scheme, views[i].data, viewOptions, doc);
			
			if(viewOptions.textAfter)
				addText(doc, "after", viewOptions.textAfter);
			if(i != views.length - 1)
				doc.pageBreak();
		}
		return addPDFHeader(doc, options);
	});
}

function addText(doc, type, text){
	if(type == "after")
		doc.text().br();
	if(typeof text == "string")
		text = {text:text};

	doc.text(text.text, text.options || {});
	if(type == "before")
		doc.text().br();
}

function getPDFImage(node){
	return window.html2canvas(node, {background:"#fff", logging:false, useCORS:true}).then(function(canvas){
		const image = canvas.toDataURL("image/jpeg");
		const binary_string =  window.atob(image.split("base64,")[1]);
		const length = binary_string.length;
		const bytes = new Uint8Array(length);
		for (let i = 0; i < length; i++)
			bytes[i] = binary_string.charCodeAt(i);
		return new pdfjs.Image(bytes.buffer);
	});
}

function getAutowidth(scheme, options){
	const prop = options.orientation && options.orientation == "landscape" ? "height" : "width";
	let width = 80; //paddings
	for(let i = 0; i<scheme.length; i++)
		width += scheme[i].width;
	options[prop] = Math.max(options[prop] || 0, width);
}

function addPDFDoc(options){
	var width = options.width||595.296, height = options.height || 841.896;// default A4 size

	if(options.orientation && options.orientation ==="landscape")
		height = [width, width = height][0];

	return new pdfjs.Document({
		padding: 40,
		font: options._export_font,
		threshold:256,
		width:width,
		height:height
	});
}

function addPDFTable(scheme, data, options, doc){
	options.header = (isUndefined(options.header) || options.header === true) ? {} : options.header;
	options.footer = (isUndefined(options.footer) || options.footer === true) ? {} : options.footer;
	options.table = options.table || {};

	//render table
	var h_count = options.header === false ? 0: scheme[0].header.length;
	var f_count = (options.footer === false || !scheme[0].footer) ? 0: scheme[0].footer.length;

	var colWidths = [];
	for(let i = 0; i<scheme.length; i++)
		colWidths[i] = scheme[i].width;

	var tableOps = extend(options.table, {
		borderWidth: 1,height:20, lineHeight:1.1,
		borderColor: 0xEEEEEE, backgroundColor: 0xFFFFFF, color:0x666666,
		textAlign:"left", paddingRight:10, paddingLeft:10,
		headerRows:h_count, widths: colWidths.length?colWidths:["100%"]
	});

	var table = doc.table(tableOps);

	//render table header
	if(h_count){
		var headerOps = extend(options.header, {
			borderRightColor:0xB0CEE3, borderBottomColor:0xB0CEE3,
			color:0x4A4A4A, backgroundColor:0xD2E3EF,
			height:27, lineHeight:1.2
		});

		for(let i = 0; i<h_count; i++){
			var header = table.tr(headerOps);
			for(var s=0; s<scheme.length; s++)
				header.td(scheme[s].header[i].toString());
		}
	}

	//render table data
	for(let r=0; r<data.length;r++){
		let row = table.tr({});
		for(let c=0; c< data[r].length; c++)
			row.td(data[r][c]);
	}

	//render table footer
	if(f_count){
		let footerOps = extend(options.footer, {
			borderRightColor:0xEEEEEE, borderBottomColor:0xEEEEEE,
			backgroundColor: 0xFAFAFA, color:0x666666,
			height:27, lineHeight:1.2
		});

		for(let i = 0; i<f_count; i++){
			let footer = table.tr(footerOps);
			for(let s=0; s<scheme.length; s++)
				footer.td(scheme[s].footer[i].toString());
		}
	}
}

function addPDFHeader(doc, options){
	//doc footer
	if(options.docFooter !== false){
		let ft = doc.footer();
		ft.text({
			color: 0x666666, textAlign:"center"
		}).append((i18n.dataExport.page||"Page")).pageNumber().append("  "+(i18n.dataExport.of || "of")+"  ").pageCount();
	}

	var horder = { text:0, image:1};

	//doc header, configurable
	if(options.docHeader){
		if(typeof options.docHeader == "string") options.docHeader = {text:options.docHeader};
		extend(options.docHeader, {
			color: 0x666666, textAlign:"right", order:0
		});
		horder.text = options.docHeader.order;
	}

	if (options.docHeaderImage){
		if(typeof options.docHeaderImage == "string") options.docHeaderImage = {url:options.docHeaderImage};
		extend(options.docHeaderImage, {
			align:"right", order:1
		});
		horder.image = options.docHeaderImage.order;
	}

	if(options.docHeader && horder.image > horder.text)
		doc.header({paddingBottom:10}).text(options.docHeader.text, options.docHeader);

	if (options.docHeaderImage){
		const defer = promise.defer();
		pdfjs.load(options.docHeaderImage.url, function(err, buffer){
			if (!err){
				var img = new pdfjs.Image(buffer);
				doc.header({paddingBottom:10}).image(img, options.docHeaderImage);

				if(options.docHeader && horder.image < horder.text)
					doc.header({paddingBottom:10}).text(options.docHeader.text, options.docHeader);
			}
			//render pdf and show in browser
			defer.resolve(doc.render());
		});
		return defer;
	}
	else
		return promise.resolve(doc.render());
}