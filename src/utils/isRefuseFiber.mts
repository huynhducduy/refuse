import {RefuseFiber} from "../render.mjs";

export default function isRefuseFiber(fiber: any): fiber is RefuseFiber {
	return typeof fiber === 'object' && fiber !== null && 'type' in fiber && typeof fiber.type === 'function';
}
