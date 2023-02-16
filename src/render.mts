// @ts-ignore
import htm from '../node_modules/htm/src/index.mjs'
// @ts-ignore
import clone from './utils/rfdc.js'
import isChildfulFiber from "./utils/isChildfulFiber.mjs";
import isRefuseFiber from "./utils/isRefuseFiber.mjs";
import {Ref} from "./hooks.mjs";
import './getEventListeners.js'

//-----------------------------------------------------------------------------

interface HtmlFiber {
	// Data that use to create DOM element
	renderType?: string
	renderProps: Props
	child: Fiber[]
	ref?: Ref
	DOMNode?: Element | DocumentFragment
}

export interface RefuseFiber extends HtmlFiber {
	isProcessed: boolean // Mark fiber as processed, processed fiber will not be process (to prevent children component to be processed multiple times)
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

export type RefuseElement = Fiber | Fiber[] | RefuseElement[]
type Fuse = (strings: TemplateStringsArray, ...rest: any[]) => RefuseElement
export type RefuseComponent = <T extends Props = Props>(props: T, ref?: Ref) => RefuseElement

// Utility types

export type ComponentProps<T extends RefuseComponent> = T extends (props: infer P, ...args: any[]) => ReturnType<T> ? P : never
export type ComponentRef<T extends RefuseComponent> = T extends (arg0: any, ref: infer P, ...args: any[]) => ReturnType<T> ? P : never

//-----------------------------------------------------------------------------

let rootElement: Element | DocumentFragment,
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
		isProcessed: false,
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
			if (typeof prop !== 'string' && typeof prop !== 'number' && typeof prop !== 'function') {
				throwElementError('Invalid element prop value in ' + type + ', we only support for string, number and function prop value.')
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

const fuse: Fuse = htm.bind(createElement)

function markAsUnmounted(fiber: Fiber | string | number) {
	if (typeof fiber !== 'number' && typeof fiber !== 'string' && isRefuseFiber(fiber)) {
		unmountedFibers.push(fiber)
	}
}

function* getNextRefuseFiberInChild(fiber: Fiber): Generator<[RefuseFiber['child'], number]> {
	if (Array.isArray(fiber)) {
		for (const i in fiber) {
			if (isRefuseFiber(fiber[i])) {
				yield [fiber, i as unknown as number]
			} else {
				for (let j of getNextRefuseFiberInChild(fiber[i])) {
					yield j
				}
			}
		}
	} else if (isChildfulFiber(fiber)) {
		for (const i in fiber.child) {
			if (isRefuseFiber(fiber.child[i])) {
				// TODO: fix this cast, i don't know why typescript tell i is a string
				yield [fiber.child, i as unknown as number]
			} else {
				for (let j of getNextRefuseFiberInChild(fiber.child[i])) {
					yield j
				}
			}
		}
	}
}

function addComponentToElement(fiber: Fiber, oldFiber: Fiber, element: Element | DocumentFragment) {
	if (Array.isArray(fiber)) {
		fiber.forEach((c, i) => {
			let oldFiberChild
			if (typeof oldFiber !== "string" && typeof oldFiber !== "number" && oldFiber && oldFiber.DOMNode) {
				if (Array.isArray(oldFiber)) {
					oldFiberChild = oldFiber[i]
				} else {
					oldFiberChild = oldFiber.child[i]
				}
			}
			addComponentToElement(c, oldFiberChild, element)
		})
	} else {
		if (fiber !== false && fiber !== null && fiber !== undefined) {
			if (fiber && typeof fiber !== "string" && typeof fiber !== "number") {
				if (!isRefuseFiber(fiber)) { // If this is a refuse fiber, we already process it
					let oldChild
					if (typeof oldFiber !== "string" && typeof oldFiber !== "number" && oldFiber && oldFiber.DOMNode) {
						fiber.DOMNode = oldFiber.DOMNode
						oldChild = oldFiber.child
					}
					toDOMElement(fiber, oldChild)
				}
				element.appendChild(fiber.DOMNode!)
			} else {
				element.appendChild(document.createTextNode(String(fiber)))
			}
		}
	}
}

function toDOMElement(fiber: HtmlFiber | RefuseFiber, oldChild: HtmlFiber['child'] | undefined) {

	if ("isProcessed" in fiber && fiber.isProcessed) {
		return
	} else {

		let element: Element | DocumentFragment = new DocumentFragment()

		if (fiber.renderType !== undefined) {

			let attributes: Record<string, any> = {},
				events: Record<string, any> = {}

			for (let key in fiber.renderProps) {
				if (![null, undefined, false].includes(fiber.renderProps[key])) {
					if (typeof fiber.renderProps[key] !== "function") {
						attributes[key] = fiber.renderProps[key]
					} else {
						events[key.slice(2)] = fiber.renderProps[key] // remove first 2 characters of attribute name (which is "on") to make it a valid event name then add it to the element
					}
				}
			}

			if (fiber?.DOMNode && fiber.DOMNode instanceof Element && fiber.DOMNode.tagName.toLowerCase() === fiber.renderType) {
				// Reuse oldFiber.DOMNode
				element = fiber.DOMNode

				for (const attr of fiber.DOMNode.attributes) {
					if (!(attr.name in attributes)) {
						element.removeAttribute(attr.name)
					}
				}

				// @ts-ignore
				const oldEvents: Record<string, any[]> = element.getEventListeners()

				for (const eventName in oldEvents) {
					oldEvents[eventName].forEach(event => {
						element.removeEventListener(eventName, event.listener)
					})
				}

				while (element.firstChild) {
					element.removeChild(element.firstChild);
				}

			} else {
				// Init new DOMNode
				element = document.createElement(fiber.renderType)
			}

			for (let key in attributes) {
				element.setAttribute(key, attributes[key])
			}

			for (let key in events) {
				element.addEventListener(key, events[key])
			}

			if (fiber?.ref) {
				fiber.ref.current = element
			}
		}

		fiber.DOMNode = element
	}

	fiber.child.forEach((child, index) => {
		addComponentToElement(child, oldChild?.[index], fiber.DOMNode!)
	})
}


function reconcileChild(parentFiberIsDirty: boolean, oldChild: RefuseFiber['child'] | undefined, child: RefuseFiber['child'], DOMNode: Exclude<RefuseFiber['DOMNode'], undefined>) {
	// TODO: match key-ed child
	for (const i in child) {
		if (typeof child[i] !== 'number' && typeof child[i] !== 'string') {
			if (
				(isRefuseFiber(child[i]) && parentFiberIsDirty) || // If there are some component passed as child to this child (only happen when parent is dirty)
				Array.isArray(child[i]) ||// If the child is an array
				!isRefuseFiber(child[i]) // If the child is html fiber, it can still contain refuse fiber deep inside it
			) {
				const nextOldChild = getNextRefuseFiberInChild(oldChild?.[i])
				const nextChild = getNextRefuseFiberInChild(child[i])
				// Iterate in indirect child
				for (const j of nextChild) {
					const oldChildNext = nextOldChild.next().value
					j[0][j[1]] = reconcile(parentFiberIsDirty, oldChildNext?.[0]?.[oldChildNext[1]], j[0][j[1]] as RefuseFiber) // result getNextRefuseFiberInChild will always be RefuseFiber
				}

				// Clean old child that not match with new child if there are any
				for (const j of nextOldChild) {
					markAsUnmounted(j[0][j[1]])
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
			} else {
				if (Array.isArray(child[i])) {
					// console.log('---------array of fiber', clone(child[i]), clone(oldChild?.[i]))
				} else {
					// console.log('---------html fiber', clone(child[i]), clone(oldChild?.[i]))
				}

				// Clean old child that not match with new child if there are any
				if (isRefuseFiber(oldChild?.[i])) {
					markAsUnmounted(oldChild?.[i])
				}

			}
		} else {
			// child[i] is number or string

			if (oldChild?.[i] !== child[i]) {
				// Clean old child that not match with new child if there are any
				if (isRefuseFiber(oldChild?.[i])) {
					markAsUnmounted(oldChild?.[i])
				}
			}
		}
	}
}

function reconcile(parentFiberIsDirty: boolean | undefined, oldFiber: RefuseFiber | undefined, fiber: RefuseFiber): RefuseFiber {

	if (fiber.isProcessed) return fiber

	const oldChild = oldFiber?.child

	if (fiber.type !== Fragment) {

		let isReuse = false

		if (oldFiber) {
			if (oldFiber.type === fiber.type) {
				// console.log('Reuse:', clone(oldFiber))
				isReuse = true
				fiber.isDirty = oldFiber.isDirty
			} else {
				markAsUnmounted(oldFiber)
			}
		}

		fiber.isDirty = parentFiberIsDirty || fiber.isDirty

		if (fiber.isDirty) {
			console.log(fiber.type.name, 'is dirty')

			let newProps = fiber.props
			const newRef = fiber.ref

			if (parentFiberIsDirty) { // If parent fiber is dirty, then props probably changed
				// Save the reference to new props and children so set it later
				newProps = {...fiber.props, children: fiber.child ?? []}
			}

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
				fiber.child = result as RefuseFiber['child'] // TODO: investigate how to eliminate this type cast
			} else if (typeof result !== 'object' || (isRefuseFiber(result) && result.type !== fiber.type)) {
				fiber.child = [result]
			} else {
				fiber.renderType = result.renderType
				fiber.renderProps = result.renderProps
				fiber.child = result.child
			}
			console.log('Result:', fiber.type.name, clone(fiber)) // No child state
		} else {
			console.log(fiber.type.name, 'is clean')
			if (isReuse) {
				fiber = oldFiber as RefuseFiber // If isReuse then oldFiber is RefuseFiber
			}
		}
	}

	reconcileChild("isDirty" in fiber ? fiber.isDirty : false, oldChild, fiber.child, fiber.DOMNode!)
	console.log('DONE: ', fiber.type.name, clone(fiber))
	toDOMElement(fiber, oldChild)
	fiber.isProcessed = true

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
				fiber.isProcessed = false
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

	while (batchUpdate.length) {
		batchUpdate.pop()!()
	}
	console.log = originalConsoleLog

	// Render phase, and schedule effects to run later
	console.log('@@@@@@@ Rendering...')
	// console.log = (...args) => originalConsoleLog('[Render]', ...args)
	const newRootFiber= reconcile(undefined, rootFiber, createDefaultRefuseFiber(rootComponent))
	resetFiber(newRootFiber) // Reset fiber to prepare for next render
	console.log('Result:', newRootFiber)
	// console.log = originalConsoleLog

	// Reconciliation phase: tree diffing: find out what changed, what component to mount and to unmount
	// https://reactjs.org/docs/reconciliation.html

	// Commit phase: commit changes to real DOM
	rootElement.textContent = ''
	rootElement.appendChild(newRootFiber.DOMNode!)
	rootFiber = newRootFiber
	// newRootFiber.DOMNode = toDOMNode(newRootFiber, rootFiber?.DOMNode)
	// if (newRootFiber.DOMNode !== rootFiber?.DOMNode) {
	// 	rootElement.textContent = ''
	// 	rootElement.appendChild(newRootFiber.DOMNode!)
	// 	rootFiber = newRootFiber
	// }

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

function render(component: RefuseComponent, element: Element | null) {
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
	fuse,
	Fragment,
	currentFiber,
	batchUpdate,
	batchUpdateTimer,
	rerender
}
