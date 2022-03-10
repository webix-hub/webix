import { assert } from "./debug";
import { toNode, uid, bind, isUndefined } from "./helpers";
import env from "./env";

//hash of attached events
const _events = {};

export function _events_final_destructor(){
	//detach all known DOM events
	for (var a in _events)
		eventRemove(a);
}

//private version of API, do not register ID for event detaching
export function _event(a,b,c,d){
	d = d || {};
	d.inner = true;
	event(a,b,c,d);
}

//attach event to the DOM element
export function event(node,event,handler,context){
	context = context || {};
	node = toNode(node);
	assert(node, "Invalid node as target for webix.event");
	
	var id = context.id || uid();

	if (context.bind)
		handler = bind(handler,context.bind);

	var info = [node,event,handler,context.capture];
	if (!context.inner)
		_events[id] = info;	//store event info, for detaching

	var capture = !!context.capture;
	if (!isUndefined(context.passive) && env.passiveEventListeners)//blockable touch events
		capture = { passive:context.passive, capture:capture };
		
	node.addEventListener(event, handler, capture);

	return id;	//return id of newly created event, can be used in eventRemove
}

//remove previously attached event
export function eventRemove(id){
	if (!id) return;
	assert(_events[id],"Removing non-existing event");

	const ev = _events[id];
	ev[0].removeEventListener(ev[1], ev[2], !!ev[3]);

	delete _events[id];	//delete all traces
}
