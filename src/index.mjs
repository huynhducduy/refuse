import htm from '../node_modules/htm/dist/htm.mjs';

let rootElement, rootFiber, currentFiber;

function Fiber({component, children, state, props}) {
    this.symbol = Symbol(component.name)
    this.component = component
    this.props == props
    this.children = children || []
    this.childIndex = 0
    this.isDirty = true
    this.state = []
    this.stateIndex = 0
}

function h(type, props, ...children) {
    this[0] = 3 // Disable caching

    if (typeof type === 'function') { // if it's a custom component
        // Compare old fiber with new fiber (compare prop, type,...)
        let thisFiber = currentFiber.children[currentFiber.childIndex] ?? new Fiber({ component: type })
        thisFiber.stateIndex = 0
        thisFiber.childIndex = 0

        const lastParentFiber = currentFiber // Saved for later

        currentFiber.children[currentFiber.childIndex++] = thisFiber
        currentFiber = thisFiber
        const r = type({...props, children}) // process children of thisFiber

        currentFiber = lastParentFiber // Restore parent fiber
        return r
    }
    return {
        toDOMElement: function() {

            const element = document.createElement(type) // create element of type 'type'

            for (let key in props) {
                if (typeof props[key] !== "function") {
                    element.setAttribute(key, props[key]) // add attributes to element
                } else {
                    element.addEventListener(key.slice(2), props[key]) // remove first 2 characters of attribute name (which is "on") to make it a valid event name then add it to the element
                }
            }

            children.forEach(child => {
                if (typeof child !== "object") {
                    element.innerHTML += child // add text to element
                } else {
                    element.appendChild(child.toDOMElement()) // add child element to element
                }
            })

            return element
        }
    }
}

export const html = htm.bind(h)

export function render(component, element) {
    if (element) rootElement ??= element;
    if (component) rootFiber ??= new Fiber({ component })

    currentFiber = rootFiber;
    currentFiber.childIndex = 0;
    currentFiber.stateIndex = 0;
    // End

    // Inner state is stale somehow
    // const newElement = component().toDOMElement()
    // element.innerHTML = ''
    // element.appendChild(newElement)
    // Okay
    // console.log(component()) // Cmt this line and it renders twice
    // element.innerHTML = ''
    // element.appendChild(component().toDOMElement())
    // Solution
    requestAnimationFrame(() => {
        const toRender = rootFiber.component().toDOMElement()
        requestAnimationFrame(() => {
            rootElement.innerHTML = ''
            rootElement.appendChild(toRender)
        })
    });
    // The problem cause because there are multiple render signal called, and they are nested, so that the first signal called is what really make the output
    // render 1 -> call render 2 (by .toDOMElement method) -> apply render 2 -> apply render 1 -> crash things
    // requestAnimationFrame make sure thing are rendered in the right order, but we need to implement batch update, defer effect as well
}

export function useState(initialValue) {
    const thisFiber = currentFiber
    const thisIndex = currentFiber.stateIndex++

    thisFiber.state[thisIndex] = thisFiber.state[thisIndex] ?? initialValue

    function setState(newState) {
        if (typeof newState === 'function') {
            newState = newState(thisFiber.state[thisIndex])
        }

        if (thisFiber.state[thisIndex] !== newState) {
            thisFiber.state[thisIndex] = newState
            thisFiber.isDirty = true
            render()
        }
    }
    return [thisFiber.state[thisIndex], setState]
}
