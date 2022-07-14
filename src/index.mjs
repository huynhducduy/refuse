import htm from '../node_modules/htm/dist/htm.mjs';

const componentTree = {}

function h(type, props, ...children) {
    this[0] = 3 // Disable caching
    if (typeof type === 'function') { // if it's a custom component
        if (type.isDirty) { // if the parent component is dirty, then all of its children is dirty
            children = children.map(child => {
                if (typeof child === 'function') {
                    child.isDirty = true
                }
                return child
            })
        }
        return type({...props, children})
    }
    return {
        type,
        props,
        children,
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

let rootElement, rootComponent, prevRootComponent;
export function render(component, element) {
    prevRootComponent = rootComponent
    rootComponent ??= component;
    rootElement ??= element;
    console.log('schedule render');
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
        const toRender = rootComponent().toDOMElement()
        requestAnimationFrame(() => {
            console.log('real render')
            rootElement.innerHTML = ''
            rootElement.appendChild(toRender)
        })
    });
    // The problem cause because there are multiple render signal called, and they are nested, so that the first signal called is what really make the output
    // render 1 -> call render 2 (by .toDOMElement method) -> apply render 2 -> apply render 1 -> crash things
    // requestAnimationFrame make sure thing are rendered in the right order, but we need to implement batch update, defer effect as well
}

function createUseState(state, markDirty) {
    return function(stateName, initialValue) {
        state[stateName] ??= initialValue;

        function setState(newValue) {
            if (typeof newValue === 'function')
                newValue = newValue(state[stateName])
            if (state[stateName] !== newValue) {
                state[stateName] = newValue
                markDirty()
            }
        }

        return [
            state[stateName],
            setState
        ]
    }
}

function createUseEffect(effects) {
    return function(effectName, effect, effectCond) {
        if (!effects[effectName]) effects[effectName] = {}
        if (effects[effectName].cond !== JSON.stringify(effectCond)) {
            effects[effectName].cond = JSON.stringify(effectCond)
            effects[effectName].cleanup?.()
            effects[effectName].cleanup = effect()
        }
    }
}

export function createComponent(hx) {

    // Make the component as dirty in the component tree if there are some state change
    function markDirty() {
        // TODO: to be updated: reconciliation algorithm
        isDirty = true
        render()
    }

    const state = {}
    const effects = {}
    const useState = createUseState(state, markDirty)
    const useEffect = createUseEffect(effects)

    let isDirty = true
    let prev;

    const evaluate = function (props) {
        if (isDirty) {
            prev = hx({useState, useEffect, props})
        }
        isDirty = false
        return prev
    }

    evaluate.isDirty = isDirty
    evaluate.state = state
    evaluate.effects = effects
    evaluate.prev = prev

    return evaluate
}
