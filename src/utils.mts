import type {RefuseFiber} from './render.mjs';

export function isRefuseFiber(fiber: any): fiber is RefuseFiber {
	return typeof fiber === 'object' && 'type' in fiber && typeof fiber.type === 'function';
}

export function isChildfulFiber(fiber: any): fiber is RefuseFiber | HTMLElement {
	return typeof fiber === 'object' && 'child' in fiber;
}
