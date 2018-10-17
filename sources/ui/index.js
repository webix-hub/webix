export {proto, protoUI, $$} from "./core";
import {hasMethod} from "./core";

import {ui} from "./core";

import {animate, animateView} from "./animate";
import {freeze, resize, each} from "./helpers";
import fullScreen from "./fullscreen";

// filters
import datafilter from "./datafilter";
import "./datafilter_pro";

// detect scroll
import "./detect";


ui.animate = animate;
ui.animateView = animateView;

ui.freeze = freeze;
ui.resize = resize;
ui.each = each;
ui.hasMethod = hasMethod;
ui.datafilter = datafilter;
ui.fullScreen = fullScreen;

export {ui};