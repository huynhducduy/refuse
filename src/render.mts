// @ts-ignore
import htm from '../node_modules/htm/src/index.mjs'
// @ts-ignore
import morphdom from '../node_modules/morphdom/dist/morphdom-esm.js'
// @ts-ignore
import clone from './rfdc.js'
import {isChildfulFiber, isRefuseFiber} from "./utils.mjs";
import {Ref} from "./hooks.mjs";

//-----------------------------------------------------------------------------

interface HtmlFiber {
	// Data that use to create DOM element
	renderType?: string
	renderProps: Props
	child: Fiber[]
	ref?: Ref
}

export interface RefuseFiber extends HtmlFiber {
	isDirty: boolean // Mark fiber as dirty, dirty fiber will be re-rendered
	// Data using to construct fiber
	type: RefuseComponent
	props: Props // Didn't include key and ref
	// Fiber state
	state: any[]
	stateIndex: number
	effects: {
		deps: unknown[] | undefined
		callback: () => void | (() => void)
		cleanup: void | (() => void)
		run: boolean
		isLayout: boolean
	}[]
	effectIndex: number
	memos: {
		deps: unknown[] | undefined
		factory: () => any
		value: any
	}[]
	memoIndex: number
}

interface Props {
	[key: string]: any
}

export type Fiber = RefuseFiber | HtmlFiber | string | number | false | null | undefined

export type RefuseElement = Fiber | Fiber[]
type Html = (strings: TemplateStringsArray, ...rest: any[]) => RefuseElement
export type RefuseComponent = <T extends Props = Props>(props: T, ref?: Ref) => RefuseElement

// Utility types

export type ComponentProps<T extends RefuseComponent> = T extends (props: infer P, ...args: any[]) => ReturnType<T> ? P : never
export type ComponentRef<T extends RefuseComponent> = T extends (arg0: any, ref: infer P, ...args: any[]) => ReturnType<T> ? P : never

//-----------------------------------------------------------------------------

let rootElement: HTMLElement | DocumentFragment,
	rootComponent: RefuseComponent,
	rootFiber: RefuseFiber,
	currentFiber: RefuseFiber // for hooks to access data
let batchUpdate: Function[] = []
let unmountedFibers: RefuseFiber[] = []
let batchUpdateTimer: {value: number | undefined} = {value: undefined}

const originalConsoleLog = console.log

//-----------------------------------------------------------------------------

function Fragment({children}: { children: RefuseFiber['child'] }) {
	return children
}

function createDefaultRefuseFiber(
	type: RefuseFiber['type'],
	props?: RefuseFiber["props"],
	child?: RefuseFiber['child'],
	ref?: Ref
): RefuseFiber {
	return {
		ref: ref,
		type: type,
		props: props ?? {},
		child: child ?? [],
		isDirty: true,
		state: [],
		stateIndex: 0,
		effects: [],
		effectIndex: 0,
		memos: [],
		memoIndex: 0,
		renderType: undefined,
		renderProps: {},
	}
}

function throwElementError(...args: any[]) {
	throw new Error(...args)
}

function createElement(type: any, props: any, ...child: any[]): Fiber {
	// @ts-ignore
	// this[0] = 3 // disable cache

	const ref = props?.ref
	delete props?.ref

	if (typeof type === 'function') { // Capturing phase
		return createDefaultRefuseFiber(type, props, child, ref)
	} else {

		if (typeof type !== 'string') {
			throwElementError('Invalid element type, required string, received ' + typeof type + ' instead: ' + JSON.stringify(type) + '.')
		}

		if (!props) {
			props = {}
		}

		if (Object.getOwnPropertySymbols(props).length > 0) {
			throwElementError('Invalid element prop name in '+type+', we don\'t support for symbol prop name, please try another primitive.')
		}

		for (const prop of Object.values(props)) {
			if (typeof prop !== 'string' && typeof prop !== 'function') {
				throwElementError('Invalid element prop value in ' + type + ', we only support for string and function prop value.')
			}
		}

		return {
			ref: ref,
			renderType: type,
			renderProps: props ?? {},
			child: child,
		}
	}
}

const html: Html = htm.bind(createElement)

function markAsUnmounted(fiber: Fiber | string | number) {
	if (typeof fiber !== 'number' && typeof fiber !== 'string' && isRefuseFiber(fiber)) {
		unmountedFibers.push(fiber)
	}
}

function addComponentToElement(thing: Fiber, element: HTMLElement | DocumentFragment) {
	if (thing !== undefined && thing !== null && thing !== false) { // Dont render null, undefined, false
		if (isChildfulFiber(thing)) {
			element.appendChild(toDOMElement(thing)) // add child element to element
		} else {
			thing = String(thing)
			if (element instanceof HTMLElement) element.innerText += thing // add text to element
			else element.appendChild(document.createTextNode(thing))
		}
	}
}

function toDOMElement(fiber: RefuseFiber | HtmlFiber) {
	let element: HTMLElement | DocumentFragment = new DocumentFragment()

	if (fiber.renderType !== undefined) {
		element = document.createElement(fiber.renderType as string) // create element of type 'type'

		for (let key in fiber.renderProps) {
			if (typeof fiber.renderProps[key] !== "function") {
				element.setAttribute(key, fiber.renderProps[key]) // add attributes to element
			} else if ([null, undefined, false].includes(fiber.renderProps[key])) {
				element.removeAttribute(key) // remove attribute if value is null, undefined or false
			} else {
				element.addEventListener(key.slice(2), fiber.renderProps[key]) // remove first 2 characters of attribute name (which is "on") to make it a valid event name then add it to the element
			}
		}
	}

	if (fiber.ref) {
		fiber.ref.current = element
	}

	fiber.child.forEach(child => {
		if (Array.isArray(child)) {
			child.forEach(c => {
				addComponentToElement(c, element)
			})
		} else {
			addComponentToElement(child, element)
		}
	})

	return element
}

function* getNextRefuseFiberInChild(fiber: Fiber): Generator<[RefuseFiber, number]> {
	if (isChildfulFiber(fiber)) {
		for (const i in fiber.child) {
			if (isRefuseFiber(fiber.child[i])) {
				// TODO: fix this cast, i don't know why typescript tell i is a string
				yield [fiber, i as unknown as number]
			} else {
				for (let j of getNextRefuseFiberInChild(fiber.child[i])) {
					yield j
				}
			}
		}
	}
}

function reconcileChild(parentFiberIsDirty: boolean, oldChild: RefuseFiber['child'] | undefined, child: RefuseFiber['child']) {
	// TODO: match key-ed child
	for (const i in child) {
		if (typeof child[i] !== 'number' && typeof child[i] !== 'string') {
			if ((isRefuseFiber(child[i]) && parentFiberIsDirty) // If there are some component passed as child to this child (only happen when parent is dirty)
				|| !isRefuseFiber(child[i]) // If the child is not fiber, it can still contain refuse fiber deep inside it
			) {
				const nextOldChild = getNextRefuseFiberInChild(oldChild?.[i])
				const nextChild = getNextRefuseFiberInChild(child[i])
				// Iterate in indirect child
				for (const j of nextChild) {
					const oldChildNext = nextOldChild.next().value
					j[0].child[j[1]] = reconcile(parentFiberIsDirty, oldChildNext?.[0]?.child?.[oldChildNext[1]], j[0].child[j[1]] as RefuseFiber)
				}

				// Clean old child that not match with new child if there are any
				for (const j of nextOldChild) {
					markAsUnmounted(j[0].child[j[1]])
				}
			}

			if (isRefuseFiber(child[i])) {
				// Then we can reconcile the child itself
				child[i] = reconcile(
					parentFiberIsDirty,
					// @ts-expect-error Somehow type-guard is not working here
					isRefuseFiber(oldChild?.[i]) ? oldChild[i] : undefined,
					child[i]
				)
			} else if (isRefuseFiber(oldChild?.[i])) {
				markAsUnmounted(oldChild?.[i])
			}
		}
	}
}

function reconcile(parentFiberIsDirty: boolean | undefined, oldFiber: RefuseFiber | undefined, fiber: RefuseFiber): RefuseFiber {

	const oldChild = oldFiber?.child

	if (isRefuseFiber(fiber) && fiber.type !== Fragment) {

		let isReuse = false

		if (oldFiber && isRefuseFiber(oldFiber)) {
			if (oldFiber.type === fiber.type) {
				console.log('Reuse:', clone(oldFiber))
				isReuse = true
				fiber.isDirty = oldFiber.isDirty
			} else {
				markAsUnmounted(oldFiber)
			}
		}

		let newProps = fiber.props
		const newRef = fiber.ref

		if (parentFiberIsDirty) { // If parent fiber is dirty, then props probably changed
			// Save the reference to new props and children so set it later
			fiber.isDirty = true
			newProps = {...fiber.props, children: fiber.child ?? []}
		}

		if (fiber.isDirty) {
			console.log(fiber.type.name, 'is dirty')
			if (isReuse) {
				fiber = oldFiber as RefuseFiber // If isReuse then oldFiber is RefuseFiber
			}

			// Save props
			fiber.props = newProps
			fiber.ref = newRef

			currentFiber = fiber
			const result = fiber.type({...fiber.props}, fiber.ref)

			if (result === undefined || result === false || result === null) {
				// Stop reconcile child if result is undefined, null, false, empty array
				fiber.child = []
			} else if (Array.isArray(result)) {
				// Array of text, string
				fiber.child = result
			} else if (typeof result !== 'object' || (isRefuseFiber(result) && result.type !== fiber.type)) {
				fiber.child = [result]
			} else {
				fiber.renderType = result.renderType
				fiber.renderProps = result.renderProps
				fiber.child = result.child
			}
			// console.log('Result:', fiber.type.name, clone(fiber)) // No child state
		} else {
			console.log(fiber.type.name, 'is clean')
			if (isReuse) {
				fiber = oldFiber as RefuseFiber
			}
		}
	}

	reconcileChild("isDirty" in fiber ? fiber.isDirty : false, oldChild, fiber.child)

	return fiber
}

function resetFiber(fiber: Fiber | Fiber[]) {
	if (typeof fiber === "object" && fiber) {
		if (!Array.isArray(fiber)) {
			if (isRefuseFiber(fiber)) {
				fiber.stateIndex = 0
				fiber.effectIndex = 0
				fiber.memoIndex = 0
				fiber.isDirty = false
			}

			fiber.child.forEach(f => {
				if (typeof f === "object") {
					resetFiber(f)
				}
			})
		} else {
			fiber.forEach(f => resetFiber(f))
		}
	}
}

function runEffects(fiber: Fiber, isLayout = false) {
	// Called in a bottom-up fashion, run children's effects first
	if (typeof fiber === "string" || typeof fiber === "number" || !fiber) return

	fiber.child.forEach(child => {
		if (Array.isArray(child)) {
			child.forEach(c => runEffects(c, isLayout))
		} else {
			runEffects(child, isLayout)
		}
	})

	if (isRefuseFiber(fiber)) {
		for (let i = 0; i < fiber.effects.length; i++) {
			if (fiber.effects[i].run && fiber.effects[i].isLayout === isLayout) {
				fiber.effects[i].cleanup?.()
				fiber.effects[i].cleanup = fiber.effects[i].callback()
				fiber.effects[i].run = false
			}
		}
	}
}

function cleanUpEffects(fiber: Fiber) {
	// Called in a bottom-up fashion, run children's effects first
	if (typeof fiber === "string" || typeof fiber === "number" || !fiber) return

	fiber.child.forEach(child => {
		if (Array.isArray(child)) {
			child.forEach(c => cleanUpEffects(c))
		} else {
			cleanUpEffects(child)
		}
	})

	if (isRefuseFiber(fiber)) {
		for (let i = 0; i < fiber.effects.length; i++) {
			fiber.effects[i].cleanup?.()
		}
	}
}

function rerender() {
	console.log('----------------------------------------------------------------')
	// Batch update state changes
	console.log('@@@@@@@ Batch updating...')
	console.log = (...args) => originalConsoleLog('[State change]', ...args)
	// TODO: should be at component level, some time these changed state don't get used, so we can save some operation if place it at component level
	while (batchUpdate.length) {
		batchUpdate.pop()!()
	}
	console.log = originalConsoleLog

	// Render phase, and schedule effects to run later
	console.log('@@@@@@@ Rendering...')
	console.log = (...args) => originalConsoleLog('[Render]', ...args)
	const newRootFiber = createDefaultRefuseFiber(rootComponent)
	const result = reconcile(undefined, rootFiber, newRootFiber)
	resetFiber(result) // Reset fiber to prepare for next render
	rootFiber = result
	console.log('Result:', clone(rootFiber))
	console.log = originalConsoleLog

	// Reconciliation phase: tree diffing: find out what changed, what component to mount and to unmount
	// https://reactjs.org/docs/reconciliation.html

	// Commit phase: commit changes to real DOM
	// const newRootElement = rootElement.cloneNode()
	// newRootElement.appendChild(toDOMElement(result))
	// morphdom(rootElement, newRootElement, {
	// 	// getNodeKey: (node: HTMLElement) => {
	// 	// 	return node.id;
	// 	// }
	// })
	rootElement.textContent = ''
	rootElement.appendChild(toDOMElement(rootFiber))


	// Layout Effects goes here and block browser paint
	// After running all layout effects at once, if changes are made, trigger re-render again before browser paint
	// using requestAnimationFrame
	const channel = new MessageChannel()

	function runEffectsFunc() {
		// Run effects and cleanup effects of unmounted components
		// 1: if changes are made in layout effects: run before browser paint
		// 2: if no changes are made in layout effects: run after browser painted to the screen
		console.log('@@@@@@ Running effects...')
		console.log = (...args) => originalConsoleLog('[Effect]', ...args)
		runEffects(rootFiber)
		console.log = originalConsoleLog

		// Clean up unmounted components last
		console.log('@@@@@@ Cleaning up unmounted components...')
		console.log = (...args) => originalConsoleLog('[Effect cleanup]', ...args)
		while (unmountedFibers.length) {
			cleanUpEffects(unmountedFibers.pop()!)
		}
		console.log = originalConsoleLog
	}

	requestAnimationFrame(function () {

		console.log('@@@@@@ Running layout effects before repaint...')
		console.log = (...args) => originalConsoleLog('[Layout effect]', ...args)
		runEffects(rootFiber, true)
		console.log = originalConsoleLog

		if (batchUpdate.length) {
			runEffectsFunc()
			clearTimeout(batchUpdateTimer.value)
			rerender()
		} else {
			channel.port1.onmessage = runEffectsFunc
			channel.port2.postMessage(undefined) // Guarantee to postMessage after paint
			console.log('@@@@@@ Browser painted to the screen')
		}
	})
}

function render(component: RefuseComponent, element: HTMLElement | null) {
	if (element) {
		rootElement = element
	} else {
		rootElement = document.createDocumentFragment()
		document.body.prepend(rootElement)
	}

	rootComponent = component

	rerender()
}

export {
	render,
	html,
	Fragment,
	currentFiber,
	batchUpdate,
	batchUpdateTimer,
	rerender
}
