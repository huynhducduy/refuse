import {RefuseFiber} from "../render.mjs";

export default function isChildfulFiber(fiber: any): fiber is RefuseFiber | HTMLElement {
	return typeof fiber === 'object' && fiber !== null && 'child' in fiber;
}
