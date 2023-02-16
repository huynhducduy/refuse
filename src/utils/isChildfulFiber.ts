import {RefuseFiber} from "../render.js";

export default function isChildfulFiber(fiber: any): fiber is RefuseFiber | HTMLElement {
	return typeof fiber === 'object' && fiber !== null && 'child' in fiber;
}
