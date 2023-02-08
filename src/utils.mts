import type { Fiber, RefuseFiber, FragmentFiber } from './index.mjs';

export function isStatefulFiber(component: Fiber | string | number): component is RefuseFiber | FragmentFiber {
	return typeof component === 'object' && 'type' in component;
}
