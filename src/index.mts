// @ts-ignore
import htm from '../node_modules/htm/dist/htm.mjs';

let rootElement: HTMLElement, rootFiber: Fiber, currentFiber: Fiber
let batchUpdate: Function[] = []

interface Fiber {
    [x: string]: any;
    isRoot?: boolean
    type: string | Function
    props: Record<string, any>
    child: Fiber[]
    childIndex: number
    isDirty: boolean
    state: any[]
    stateIndex: number
    effects: {
        deps: any[]
        callback: () => (void | (() => void))
        cleanup?: () => void
        run: boolean
    }[]
    effectIndex: number
    toDOMElement?: () => HTMLElement
}

function createFiber(type: Fiber["type"], isRoot?: boolean): Fiber {
    return {
        isRoot: isRoot,
        type: type,
        props: {},
        child: [],
        childIndex: 0,
        isDirty: true,
        state: [],
        stateIndex: 0,
        effects: [],
        effectIndex: 0
    }
}

function h(type: string | Function, props: Fiber["props"], ...child: Fiber["child"]) {

    const parentFiber = currentFiber // Saved for later use

    if (!currentFiber.child[currentFiber.childIndex]) { // Initialize the child If the child is not initialized
        currentFiber.child[currentFiber.childIndex] ??= createFiber(type)
    }

    const thisFiber = currentFiber.child[currentFiber.childIndex++]
    // Update the attributes of the fiber
    thisFiber.props = {...props, child: child}

    currentFiber = thisFiber // make it the parent of it's child

    if (!parentFiber.isRoot && parentFiber.isDirty)
        thisFiber.isDirty = true

    let result;
    if (typeof type === 'function') { // if it's a custom component

        if (thisFiber.isDirty) {
            console.log('result: dirty')
            result = type(thisFiber.props) // process child of thisFiber
            thisFiber.isDirty = false
        } else {
            console.log('result: not dirty')
            console.log('starting process child')
            result = type(thisFiber.props) // process child of thisFiber
            // TODO: find method to process child without running it again
        }
        currentFiber = parentFiber // Restore parent fiber to process siblings of thisFiber
        return result
    }
    return {
        type,
        props,
        child,
        toDOMElement: () => {
            const element = document.createElement(type) // create element of type 'type'

            for (let key in props) {
                if (typeof props[key] !== "function") {
                    element.setAttribute(key, props[key]) // add attributes to element
                } else {
                    element.addEventListener(key.slice(2), props[key]) // remove first 2 characters of attribute name (which is "on") to make it a valid event name then add it to the element
                }
            }

            child.forEach(child => {
                if (typeof child !== "object") {
                    element.innerHTML += child // add text to element
                } else if (child.toDOMElement){
                    element.appendChild(child.toDOMElement()) // add child element to element
                }
            })

            return element
        }
    }
}

export const html = htm.bind(h)

function resetFiber(fiber: Fiber) {
    fiber.childIndex = 0
    fiber.stateIndex = 0
    fiber.effectIndex = 0

    fiber.child.forEach(child => resetFiber(child))
}
function runningEffects(fiber: Fiber) {
    fiber.child.forEach(child => runningEffects(child))

    for (let i = 0; i < fiber.effects.length; i++) {
        if (fiber.effects[i].run) {
            fiber.effects[i].cleanup?.()
            // @ts-ignore
            fiber.effects[i].cleanup = fiber.effects[i].callback()
            fiber.effects[i].run = false
        }
    }
}

export function render(component: () => {}, element: HTMLElement) {
    if (element) rootElement ??= element;
    if (component) rootFiber ??= createFiber(component, true)

    while (batchUpdate.length) {
        batchUpdate.pop()!()
    }

    console.log('@@@ render')

    currentFiber = rootFiber;
    resetFiber(rootFiber)

    rootElement.innerHTML = ''
    if (typeof rootFiber.type === 'function') {
        rootElement.appendChild(rootFiber.type().toDOMElement())
    }

    runningEffects(rootFiber)
}

export function useState<T = any>(initialValue: T): [T, (newValue: T) => void] {
    const thisFiber = currentFiber // because currentFiber change overtime, we must preserve it inside useState
    const thisIndex = currentFiber.stateIndex++ // this change overtime too

    thisFiber.state[thisIndex] ??= initialValue

    function setState(newState: T) {
        if (!batchUpdate.length) setTimeout(render, 0)

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
