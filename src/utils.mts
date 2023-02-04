import type { Component, RefuseComponent } from './index.mjs';

export function isStatefulFiber(fiber: Component): fiber is RefuseComponent {
  	return typeof fiber === 'object' && 'type' in fiber;
}
