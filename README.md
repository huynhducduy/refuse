# Refuse

This is a work-in-progress, naive, hobby implementation of the React.js framework.

![ezgif-5-ffd434224c](https://user-images.githubusercontent.com/12293622/178789425-b6115cb7-39b0-43a2-afa7-2fd0acef0ded.gif)

Different from React:
- No longer need to return single root element, so `Fragment` use cases now narrow down to key-ed diff only.
- Ref works on component as well, and auto assign to the root element of the component.
  - If the component have multiple root, it will point to the `DocumentFragment`, which will be empty (and useless) after moving its child to the DOM. [Read more](https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment#usage_notes)
  - (Don't need to wrap component in forwardRef, just) use the second parameter of component to assign it to a specific element.

## Todo:
- [x] TypeScript
- [x] Jsx to HyperScript using `htm`
- [x] render
- [x] Custom components with props
- [x] Custom components with children
- [x] useState
- [X] Automatic state update batching
- [x] useEffect with cleanup
- [x] Unmount components
- [x] Component Tree
- [x] Render: dirty mark, compare
- [ ] Render: keys
- [x] Conditional rendering
- [x] DOM diffing/patching using morphdom
- [x] useLayoutEffect
- [x] useMemo, useCallback, useRef
- [x] memo
- [x] Fragment
- [x] JSX Embedding Expression
- [x] DOM Ref
- [x] React.forwardRef
- [ ] Error Boundary
- [ ] Concurrent Mode, useTransition
- [ ] useContext
- [ ] useReducer
- [ ] Test utils, write tests
- [ ] Portal
- [ ] Server-side rendering
- [ ] Synthetic Event
- [ ] Devtools, debugger, HMR - Hot reload
- [ ] Router
- [ ] useDeferredValue
- [ ] Suspense
- [ ] useImperativeHandle
- [ ] useDebugValue
- [ ] useId
- [ ] useSyncExternalStore
- [ ] Dynamic import, React.lazy
- [ ] Production build
- [ ] Profiler
- [ ] Linter

## Development
```
npm i
tsc --watch
```

Open `index.html` in browser
