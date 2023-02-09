// @ts-ignore
import htm from '../node_modules/htm/src/index.mjs'
// @ts-ignore
import morphdom from '../node_modules/morphdom/dist/morphdom-esm.js'
// @ts-ignore
import clone from './rfdc.js'
import {isRefuseFiber} from "./utils.mjs";
import {Ref} from "./hooks.mjs";

//-----------------------------------------------------------------------------

interface CommonFiberProps {
	// Data that use to create DOM element
	renderType: string | undefined
	renderProps: Props
}

// Don't need to process its child
interface HtmlFiber extends CommonFiberProps {
	child: (string | number)[]
}

export interface RefuseFiber extends CommonFiberProps {
	child: RefuseFiber[]
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

type Child = RefuseFiber["child"] | HtmlFiber["child"]
interface Props {
	[key: string]: any
}

export type Fiber = RefuseFiber | HtmlFiber | false

type SingleRootRefuseElement = Fiber | string | number | false | null | undefined
export type RefuseElement = SingleRootRefuseElement | SingleRootRefuseElement[]
export type RefuseComponent = <T extends Props = Props>(props: T, ref: Ref) => RefuseElement
export type ComponentProps<T extends RefuseComponent> = T extends (props: infer P, ...args: any[]) => RefuseElement ? P : never
export type ComponentRef<T extends RefuseComponent> = T extends (arg0: any, ref: infer P, ...args: any[]) => RefuseElement ? P : never
type Html = (strings: TemplateStringsArray, ...rest: any[]) => RefuseElement

//-----------------------------------------------------------------------------

let rootElement: HTMLElement | DocumentFragment,
	rootComponent: RefuseComponent,
	rootFiber: Fiber,
	currentFiber: RefuseFiber // for hooks to access data
let batchUpdate: Function[] = []
let unmountedFibers: Fiber[] = []
let batchUpdateTimer: {value: number | undefined} = {value: undefined}

const originalConsoleLog = console.log

//-----------------------------------------------------------------------------

function Fragment({children}: { children: Child }) {
	return children
}

function createDefaultFiber(type: RefuseFiber['type'], props?: RefuseFiber["props"], child?: RefuseFiber['child'], renderType?: RefuseFiber['renderType'], renderProps?: RefuseFiber['renderProps']): RefuseFiber {
	return {
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
		renderType: renderType,
		renderProps: renderProps ?? {},
	}
}

function createElement(type: any, props: any, ...child: any[]): Fiber {
	// @ts-ignore
	// this[0] = 3 // disable cache

	if (typeof type === 'function') { // Capturing phase
		return createDefaultFiber(type, props, child)
	} else {
		return {
			renderType: type,
			renderProps: props,
			child: child,
		}
	}
}

const html: Html = htm.bind(createElement)

function addComponentToElement(thing: Child, element: HTMLElement | DocumentFragment) {
	if (thing !== false) {
		if (thing && typeof thing !== "string" && typeof thing !== "number") {
			element.appendChild(toDOMElement(thing)) // add child element to element
		} else {
			thing = String(thing)
			if (element instanceof HTMLElement) element.innerText += thing // add text to element
			else element.appendChild(document.createTextNode(thing))
		}
	}
}

function toDOMElement(fiber: Fiber) {
	let element: HTMLElement | DocumentFragment = new DocumentFragment()

	if (fiber) {
		if (fiber.renderType !== undefined) {
			element = document.createElement(fiber.renderType as string) // create element of type 'type'

			for (let key in fiber.renderProps) {
				if (key === 'ref' && fiber.renderProps.ref){
					fiber.renderProps.ref.current = element
				} else if (typeof fiber.renderProps[key] !== "function") {
					element.setAttribute(key, fiber.renderProps[key]) // add attributes to element
				} else {
					element.addEventListener(key.slice(2), fiber.renderProps[key]) // remove first 2 characters of attribute name (which is "on") to make it a valid event name then add it to the element
				}
			}
		}

		if (fiber?.props?.ref) {
			fiber.props.ref.current = element
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
	}

	return element
}

function* getNextRefuseFiber(fiber: Fiber): Generator<[RefuseFiber, number]> {
	if (fiber === undefined) return
	for (const i in fiber?.child) {
		if (typeof fiber.child[i]?.type === 'function') {
			yield [fiber, i]
		} else if (typeof fiber.child[i] !== 'number' && typeof fiber.child[i] !== 'string') {
			for (let j of getNextRefuseFiber(fiber.child[i])) {
				yield j
			}
		}
	}
}

function reconcileChild(parentFiberIsDirty: boolean, oldChild: Child | undefined, child: Child) {
	for (const i in child) {
		if (isRefuseFiber(child[i])) { // Iterate in direct child
			// If there are some component passed as child to this child (only happen when parent is dirty), then we need to reconcile them first
			if (parentFiberIsDirty) {
				// @ts-ignore
				for (const j in child[i].child) {
					// @ts-ignore
					if (typeof child[i].child[j]?.type === 'function') {
						// @ts-ignore
						child[i].child[j] = reconcile(parentFiberIsDirty, oldChild?.[i]?.child?.[j], child[i].child[j])
					}
				}
			}
			// Then we can reconcile the child itself
			// @ts-ignore
			child[i] = reconcile(parentFiberIsDirty, oldChild?.[i], child[i])
		} else if (typeof child[i] !== 'number' && typeof child[i] !== 'string') { // Iterate in indirect child
			// @ts-ignore
			const nextOldChild = getNextRefuseFiber(oldChild?.[i])
			// @ts-ignore
			const nextChild = getNextRefuseFiber(child[i])
			for (const j of nextChild) {
				const oldChildNext = nextOldChild.next().value
				// @ts-ignore
				j[0].child[j[1]] = reconcile(parentFiberIsDirty, oldChildNext?.[0]?.child?.[oldChildNext[1]], j[0].child[j[1]])
			}
		}
	}
}

function reconcile(parentFiberIsDirty: boolean | undefined, oldFiber: Fiber | undefined, fiber: Fiber): Fiber {

	if (fiber) {

		let oldChild = oldFiber ? oldFiber.child : undefined

		if (isRefuseFiber(fiber) && fiber.type !== Fragment) {

			let isReuse = false

			if (oldFiber && isRefuseFiber(oldFiber) && oldFiber.type === fiber.type) {
				console.log('Reuse:', clone(oldFiber))
				isReuse = true
				fiber.isDirty = oldFiber.isDirty
			} else {
				console.log('Not reuse')
			}

			let newProps = fiber.props

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
				const ref = fiber.props.ref
				// TODO: using delete here will affect perfomance, find a better way
				delete fiber.props.ref

				currentFiber = fiber
				const result = fiber.type({...fiber.props}, ref)



				if (result == undefined || result === false || (Array.isArray(result) && result.length === 0)) {
					// Stop reconcile child if result is undefined, null, false, empty array
					return false
				} else if (Array.isArray(result)) {
					// Array of text, string
					// @ts-ignore
					fiber.child = result
				} else if (typeof result !== 'object' || isRefuseFiber(result)) {
					// @ts-ignore
					fiber.child = [result]
				} else {
					fiber.renderType = result.renderType
					fiber.renderProps = result.renderProps
					// @ts-ignore
					fiber.child = result.child
				}
				console.log('Result:', fiber.type.name, clone(fiber)) // No child state
			} else {
				console.log(fiber.type.name, 'is clean')
				if (isReuse) {
					fiber = oldFiber as RefuseFiber
				}
			}
		}

		console.log('Calculating', isRefuseFiber(fiber) ? fiber.type.name : fiber.renderType, clone(fiber.child))
		reconcileChild("isDirty" in fiber ? fiber.isDirty : false, oldChild, fiber.child)

	}

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
			console.log('askldjfhaskldjhaldskjh', fiber)
			fiber.forEach(f => resetFiber(f))
		}
	}
}

function runEffects(fiber: Fiber | Fiber[], isLayout = false) {
	// Called in a bottom-up fashion, run children's effects first
	if (typeof fiber === "object" && fiber) {
		if (!Array.isArray(fiber)) {
			if (isRefuseFiber(fiber)) {
				fiber.child.forEach(child => {
					if (typeof child === "object") {
						runEffects(child, isLayout)
					}
				})

				for (let i = 0; i < fiber.effects.length; i++) {
					if (fiber.effects[i].run && fiber.effects[i].isLayout === isLayout) {
						fiber.effects[i].cleanup?.()
						fiber.effects[i].cleanup = fiber.effects[i].callback()
						fiber.effects[i].run = false
					}
				}
			}
		} else {
			fiber.forEach(f => runEffects(f))
		}
	}
}

function cleanUpEffects(fiber: Fiber | Fiber[] | string | number | null | undefined) {
	// Called in a bottom-up fashion, run children's effects first
	if (typeof fiber === "object" && fiber) {
		if (!Array.isArray(fiber)) {
			if (isRefuseFiber(fiber)) {
				fiber.child.forEach(child => {
					if (typeof child === "object") {
						cleanUpEffects(child)
					}
				})

				for (let i = 0; i < fiber.effects.length; i++) {
					fiber.effects[i].cleanup?.()
				}
			}
		} else {
			fiber.forEach(f => runEffects(f))
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
	const newRootFiber = createDefaultFiber(rootComponent)
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
