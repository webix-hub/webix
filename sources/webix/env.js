const env = {};

env.cdn = "//cdn.webix.com";
env.codebase = "";
env.zIndexBase = 100;
env.scrollSize = 17;
env.strict = !!window.webix_strict;
env.https = document.location.protocol === "https:";

const agent = navigator.userAgentData;
const deprecatedAgent = agent ? null : navigator.userAgent;

const browsers = {
	Chromium: "Chrom", //in userAgent - Chrome, in userAgentData.brands - Chromium
	IE: "Trident",
	Edge: "Edg", // in userAgent - Edg, in userAgentData.brands - Microsoft Edge
	FF: "Firefox",
	Safari: "Safari"
};

for(let browser in browsers){
	const checkBrowser = agent ?
		agent.brands.find(v => v.brand.indexOf(browsers[browser]) != -1) :
		deprecatedAgent.indexOf(browsers[browser]) != -1;

	if(checkBrowser){
		env["is"+browser] = true;
		//Edge is a chromium-based browser (so we set isChromium:true and isEdge:true)
		if(browser != "Chromium")
			break;
	}
}

const platform = agent ? agent.platform : deprecatedAgent;
env.isMac = platform.toLowerCase().indexOf("mac") != -1;
if (/iPad|iPhone|iPod/.test(platform)) env.isIOS = true;
if (platform.indexOf("Android") != -1) env.isAndroid = true;

if(agent)
	env.mobile = agent.mobile;
else if(env.isIOS || env.isAndroid || deprecatedAgent.indexOf("Mobile") != -1 || deprecatedAgent.indexOf("Windows Phone") != -1)
	env.mobile = true;

if (env.mobile || navigator.maxTouchPoints > 1)
	env.touch = true;

env.fastClick = !env.touch;

//maximum height/width for HTML elements in pixels (rough), bigger values will be ignored by browser
if (env.isIE || env.isEdge || env.isFF)
	env.maxHTMLElementSize = 10000000;
if (env.isSafari)
	env.maxHTMLElementSize = 100000000;

env.transform = "transform";
env.transition = "transition";
env.transitionDuration = "transitionDuration";
env.translate = "translate3d";
env.transitionEnd =  "transitionend";

//touch events that can be prevented
env.passiveEventListeners = false;
try {
	const opts = Object.defineProperty({}, "passive", {
		get: function() { // eslint-disable-line
			env.passiveEventListeners = true;
		}
	});
	window.addEventListener("testPassive", null, opts);
	window.removeEventListener("testPassive", null, opts);
} catch (e) {} // eslint-disable-line

env.svg = (function(){
	return document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1");
})();

env.svganimation = (function(){
	return document.implementation.hasFeature("https://www.w3.org/TR/SVG11/feature#SVG-animation", "1.1");
})();

export default env;