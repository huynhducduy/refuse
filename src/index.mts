// @ts-ignore
import htm from '../node_modules/htm/dist/htm.mjs';

let componentToRender: FunctionalComponent;
let rootElement: HTMLElement, rootFiber: Fiber, currentFiber: Fiber
let batchUpdate: Function[] = []

interface FunctionalComponent {
    (props: Fiber['props']): Fiber
}

interface Fiber {
    [x: string]: any;
    isRoot?: boolean // Mark fiber as root component, root component is always dirty
	isDirty: boolean // Mark fiber as dirty, dirty fiber will be re-rendered
    type: string | FunctionalComponent // Type of fiber, can be a string (html tag) or a function (component)
    props: Record<string, any>
    child: Fiber[]
    childIndex: number
    state: any[]
    stateIndex: number
    effects: {
        deps: any[]
        callback: () => void | (() => void)
        cleanup: void | (() => void)
        run: boolean
    }[]
    effectIndex: number
    // Data that use to create DOM element
	renderType?: string
    renderProps?: Record<string, any>
	renderChild?: Fiber[]
	// renderChild?:
	toDOMElement: () => HTMLElement
}

function toDOMElement(this: Fiber) {
	const element = document.createElement(this.renderType as string) // create element of type 'type'

	for (let key in this.renderProps) {
		if (typeof this.renderProps[key] !== "function") {
			element.setAttribute(key, this.renderProps[key]) // add attributes to element
		} else {
			element.addEventListener(key.slice(2), this.renderProps[key]) // remove first 2 characters of attribute name (which is "on") to make it a valid event name then add it to the element
		}
	}

	this.renderChild?.forEach(child => {
		if (typeof child !== "object") {
			element.innerHTML += child // add text to element
		} else if (child.toDOMElement) {
			element.appendChild(child.toDOMElement()) // add child element to element
		}
	})

	return element
}

function createFiber(type: Fiber["type"], props?: Fiber["props"], child?: Fiber["child"]): Fiber {
    return {
        isRoot: false,
        type: type,
        props: props ?? {},
        child: child ?? [],
        childIndex: 0,
        isDirty: true,
        state: [],
        stateIndex: 0,
        effects: [],
        effectIndex: 0,
		toDOMElement: toDOMElement,
    }
}

function createElement(type: Fiber["type"], props: Fiber["props"], ...child: Fiber["child"]): Fiber {
	// @ts-ignore
	this[0] = 3; // disable cache

    const parentFiber = currentFiber // Saved for later use
	let result;

	// make it the parent of it's child
	console.log("type", type, "props", props, "child", child)

	if (!currentFiber.child[currentFiber.childIndex]) { // Initialize the child If the child is not initialized
		currentFiber.child[currentFiber.childIndex] ??= createFiber(type, props, child)
	} else {
		currentFiber.child[currentFiber.childIndex].type = type
		if (!currentFiber.isRoot) {
			currentFiber.child[currentFiber.childIndex].props = props
			currentFiber.child[currentFiber.childIndex].child = child
		}
	}

	// Try to leverage data from previous render
	const thisFiber = currentFiber.child[currentFiber.childIndex++]

	if (typeof type === 'function') { // if it's a custom component
		if (!parentFiber.isRoot && parentFiber.isDirty)
			thisFiber.isDirty = true

		if (thisFiber.isDirty) {
			console.log('result: dirty')
			currentFiber = thisFiber
			result = type({...props, children: child}) // process jsx of this component as well as it's children

			const itself = thisFiber.child.pop()
			thisFiber.childIndex--;
			// console.log('done get itself of', thisFiber.type.name, itself.renderType, itself.renderProps, itself.renderChild) // All children of thisFiber is processed to pure html element, the last child is the component itself
			if (itself) {
				thisFiber.renderType = itself.renderType
				thisFiber.renderProps = itself.renderProps
				thisFiber.renderChild = itself.renderChild
			}
		} else {
			console.log('result: clean')
			thisFiber.child.forEach((child) => {
				if (typeof child.type === 'function' && child.isDirty) {
					currentFiber = child
					child.type({...child.props, children: child.child})
				}
			})
			result = thisFiber
		}

		currentFiber = parentFiber // Restore parent fiber to process siblings of thisFiber

	} else {
		thisFiber.renderProps = props
		thisFiber.renderType = type
		thisFiber.renderChild = child
		result = thisFiber
	}

	return result
}

export const html = htm.bind(createElement)

function resetFiber(fiber: Fiber) {
    fiber.childIndex = 0
    fiber.stateIndex = 0
    fiber.effectIndex = 0
	fiber.isDirty = false

    fiber.child.forEach(child => {
        if (typeof child === "object") {
            resetFiber(child)
        }
    })
}
function runningEffects(fiber: Fiber) {
    fiber.child.forEach(child => {
        if (typeof child === "object") {
            runningEffects(child)
        }
    })

    for (let i = 0; i < fiber.effects.length; i++) {
        if (fiber.effects[i].run) {
            fiber.effects[i].cleanup?.()
            fiber.effects[i].cleanup = fiber.effects[i].callback()
            fiber.effects[i].run = false
        }
    }
}

export function render(component: FunctionalComponent, element: HTMLElement) {
    if (element) rootElement ??= element;
	componentToRender = component

    rerender()
}

function rerender() {

	// console.log('@@@ render')

	rootFiber ??= createFiber(() => html`<${componentToRender}/>`)
	rootFiber.isRoot = true

	while (batchUpdate.length) {
		batchUpdate.pop()!()  // Should run state update in component-level
	}

	currentFiber = rootFiber;
	let result: Fiber;

	result = (rootFiber.type as Function)({})

	rootElement.innerHTML = ''
	rootElement.appendChild(result.toDOMElement())

	runningEffects(rootFiber) // Should run effects in component-level

	// console.log(rootFiber)

	resetFiber(rootFiber)
}

export function useState<T = any>(initialValue: T): [T, (newValue: T) => void] {
    const thisFiber = currentFiber // because currentFiber change overtime, we must preserve it inside useState
    const thisIndex = currentFiber.stateIndex++ // this change overtime too

    thisFiber.state[thisIndex] ??= initialValue

    function setState(newState: T) {

		if (!batchUpdate.length) setTimeout(rerender, 0)

        batchUpdate.push(function() {
            if (typeof newState === 'function') {
                newState = newState(thisFiber.state[thisIndex])
            }

            if (thisFiber.state[thisIndex] !== newState) {
                thisFiber.state[thisIndex] = newState
                thisFiber.isDirty = true
            }
        })
    }

    return [thisFiber.state[thisIndex], setState]
}

export function useEffect(callback: () => () => {}, deps: any[]) {
    const thisFiber = currentFiber // because currentFiber change overtime, we must preserve it inside useState
    const thisIndex = currentFiber.effectIndex++ // this change overtime too

    let run = false;

    // No dependency, run every rerender
    if (!deps) {
        run = true
    }
    // Has dependency, run if dependency changed
    else if (!thisFiber.effects[thisIndex] || deps.length !== thisFiber.effects[thisIndex].deps.length
            || deps.some((dep, i) => dep !== thisFiber.effects[thisIndex].deps[i])) {
        run = true
    }

    if (run) {
        thisFiber.effects[thisIndex] = {
            ...thisFiber.effects[thisIndex],
            deps,
            callback,
            run,
        }
    }
}
