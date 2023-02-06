import type { Component, RefuseComponent } from './index.mjs';
import {FragmentComponent} from "./index.mjs";

export function isStatefulFiber(component: Component | string | number): component is RefuseComponent | FragmentComponent {
	return typeof component === 'object' && 'type' in component;
}
