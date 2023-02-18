# Refuse [![npm version](https://badge.fury.io/js/refusejs.svg)](https://badge.fury.io/js/refusejs)

![Refuse](https://user-images.githubusercontent.com/12293622/219362480-f01fec20-f405-44e4-af0f-10cfc5712c30.png)
The name of `refuse` comes from its main action: `fuse` (join or blend) multiple components to form a single working app. Fun fact: it also means `trash`, or refers to the action of `being not willing to do something` in English)
> **Note**: This library is a work-in-progress. Some features are not available yet. See [Feature lists](#feature-lists) for more details.

[![Built with WeBuild](https://raw.githubusercontent.com/webuild-community/badge/master/svg/WeBuild.svg)](https://webuild.community) [![From Vietnam with <3](https://raw.githubusercontent.com/webuild-community/badge/master/svg/love.svg)](https://webuild.community)

Key points:
- Same modern API as React.js
- Full typescript support
- No JSX
- No build tool, no bundler, no transpiler required

Different from React:
- No class component supported
- No longer need to return single root element, so `Fragment` use cases now narrow down to key-ed diff only.
- Ref works on component as well, and auto assign to the root element of the component.
  - If the component have multiple root, it will point to the `DocumentFragment`, which will be empty (and useless) after moving its child to the DOM. [Read more](https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment#usage_notes)
  - (Don't need to wrap component in forwardRef, just) use the second parameter of component to assign it to a specific element.
- Component can return `number[]`,`string[]`,`fuse[]` or even `string[][]` to render multiple elements.
  - Component can return `null`,`undefined`,`false` to skip rendering.

About syntax:
- Spread props: `<div ...${props}>` instead of `<div {...props}>`
- HTML's quotes now optional: `<div class=foo>`
- Shorthand for component end-tags: `<${Foo}>bar<//>`
- Comment: `<!-- comment -->`

Syntax highlighting support:
- Intellij IDEA (WebStorm,...): supported by default
- VSCode: [lit-html](https://marketplace.visualstudio.com/items?itemName=bierner.lit-html)

> Have you ever wondered how React.js works internally? Reading the source code of `refuse` is a good way to learn how it works.

## Try it out now

[With Vite](https://codesandbox.io/p/sandbox/refuse-vite-beb3gc)

[Without bundler](https://codepen.io/huynhducduy/pen/wvEBNPo)

## Getting started
```
npm i -S refusejs
```

```ts
import {useState, fuse,render} from "refusejs"
import type {RefuseComponent} from "refusejs"

interface Props {
  someThing: string
}

const Component: RefuseComponent<Props> = (props, ref) => {
	const [state, setState] = useState(0)

	useEffect(() => {
		const timer = setInterval(() => setState(state + 1), 1000)
		return () => clearInterval(timer)
	}, [])

	return fuse`
		<div class=foo ...${props} foo=${state}>
			${props.children}
			<${A}>Something...<//>
			<button onclick=${() => setState(state + 1)}>Click me</button>
			${state > 300 && fuse`<div>
				Yeah
			</div>`}
			<!-- some comment -->
		</div>
	`
}

render(Component, document.getElementById('root'))
```

Or

```html
<script src="https://unpkg.com/refusejs@latest/dist/refuse.umd.js"></script>
<script>
	const {render, fuse} = Refuse;
	render(
		() => fuse`
			<div>
				<h1>Hello, world!</h1>
				<p>It's a beautiful day.</p>
			</div>
		`,
		document.getElementById('root2')
	);
</script>
```

or

```html
<script type="module">
	import * as Refuse from 'https://unpkg.com/refusejs@latest/dist/refuse.modern.js'; // Support only modern browsers
	// import * as Refuse from 'https://unpkg.com/refusejs@latest/dist/refuse.module.js'; // Support all browsers

	Refuse.render(
		() => Refuse.fuse`
			<div>
				<h1>Hello, world!</h1>
				<p>It's a beautiful day.</p>
			</div>
		`,
		document.getElementById('root')
	);
</script>
```

## Feature lists:
- [x] TypeScript
- [x] Jsx to HyperScript using `htm`
- [x] render
- [x] Custom components with props
- [x] Custom components with children
- [x] useState
- [X] Automatic state update batching
- [ ] flushSync
- [x] useEffect with cleanup
- [x] Unmount components
- [x] Component Tree
- [x] Render: dirty mark, compare
- [ ] Render: keys
- [x] Conditional rendering
- [x] DOM diffing/patching
- [x] useLayoutEffect
- [x] useMemo, useCallback, useRef
- [x] memo
- [x] Fragment
- [x] JSX Embedding Expression
- [x] DOM Ref
- [x] React.forwardRef
- [ ] Render multiple Refuse instances
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
- [ ] Type checker on tagged template
- [ ] useEvent

## Development
Watch `refuse` package
```
npm i --lockfile-only
npm link
npm run dev
```

Run `example1`
```
cd demo/example1
npm i --lockfile-only
npm link refusejs
npm run dev
```

And follow instructions.
