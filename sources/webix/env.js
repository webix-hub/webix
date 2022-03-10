const env = {};

env.cdn = "//cdn.webix.com";
env.codebase = "";
env.zIndexBase = 100;
env.scrollSize = 17;
env.strict = !!window.webix_strict;
env.https = document.location.protocol === "https:";

const agent = navigator.userAgent;

env.isMac = agent.indexOf("Mac") != -1;
if (/iPad|iPhone|iPod/.test(agent)) env.isIOS = true;
if (agent.indexOf("Android") != -1) env.isAndroid = true;

if (env.isIOS || env.isAndroid || agent.indexOf("Mobile") != -1 || agent.indexOf("Windows Phone") != -1)
	env.mobile = true;

if (env.mobile || navigator.maxTouchPoints > 1)
	env.touch = true;

env.fastClick = !env.touch;

//very rough detection, but it is enough for current goals
if (agent.indexOf("Trident") !== -1) env.isIE = true;
else if (agent.indexOf("Edge") !== -1) env.isEdge = true;
else if (agent.indexOf("Firefox") !== -1) env.isFF = true;
else if (agent.indexOf("Chrome") !== -1) env.isChromium = true;
else if (agent.indexOf("Safari") !== -1) env.isSafari = true;

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