

import type {RefuseElement, Ref} from "./src/index.mjs";
import {Fragment,
	memo,
	useMemo,
	useCallback,
	useEffect,
	useLayoutEffect,
	useState,
	useRef,
	html,
	render,
} from "./src/index.mjs";

console.log(html`${"a"}`)

const Test2 = memo(function Test2() {

	console.log('Test2 called')

	return html`
		<div>Test2 (static component) ${Math.random()}</div>
	`
})

interface TestProps {
	count: number
	text: string
	children: string[]
}

function Test(props: TestProps, ref: Ref<HTMLElement>): RefuseElement {

	console.log('Test called with props:', props)

	if (!props.children?.[0]) props.children[0] = 'Default children'

	const [count, setCount] = useState(props.count);

	const someNumber = useMemo(() => {
		console.log('recalculating someNumber')
		return props.count+9
	}, [props.count])

	const someFunction = useCallback(() => {
		console.log('someFunction changed', props.count)
	}, [props.count])

	const neverChange = useRef(Math.random())

	useEffect(() => {
		someFunction()
	}, [someFunction])

	function increaseCount() {
		setCount(count => {
			return count+1
		})
	}

	// useLayoutEffect(() => {
	// 	setCount(999);
	// 	console.log('This is layout effect')
	// }, [])

	useEffect(() => {
		console.log('Inner count updated', count)
		return () => {
			console.log('Inner count cleanup', count)
		}
	}, [count])

	// useEffect(() => { // Sync props.count to inner state
	//     setCount(props.count)
	// 	console.log('Inner count updated from props', props.count)
	// }, [props.count])

	// useEffect(() =>{
	//     const id = setInterval(function log() {
	//         console.log(`Inner count is: ${count}`);
	//     }, 2000);
	//     return function() {
	//         clearInterval(id);
	//     }
	// }, [count]);

	const btnRef = useRef<HTMLElement | null>(null)

	function setBtnBgToBlue() {
		if (btnRef.current) {
			btnRef.current.style.background = 'blue'
		}
	}

	return html`
		<div style="border: 5px solid red">
			<div ref=${ref}>${props.text}</div>
			<div>${count}</div>
			<div>${someNumber} (Equal outer + 9)</div>
			<div>${props.children}</div>
			<div>Will never change: ${neverChange.current}</div>
			<button onclick=${increaseCount} ref=${btnRef}>+ inner</button>
			<button onclick=${setBtnBgToBlue}>Set button bg to blue</button>
			<${Test2}/>
		</div>
	`
}

function SomeChildren({count}: {count: number}): RefuseElement {
	console.log('SomeChildren called')
	return ['SomeChildren ', count]
}

function App(): RefuseElement {

	console.log('App called')

	const [count, setCount] = useState(100);
	const [count2, setCount2] = useState(100);

	function increaseCount() {
		setCount(count => {
			return count+100
		})
	}

	function decreaseCount() {
		setCount(count => {
			return count-100
		})
	}

	function increaseCount2() {
		setCount2(count => {
			return count+100
		})
	}

	function increaseCount3() {
		setCount(count => {
			return count+50
		})
		setCount(count => {
			return count+50
		})
		setCount2(count => {
			return count+100
		})
	}

	useEffect(() => {
		console.log('Outer count updated', count)
		return () => {
			console.log('Outer count cleanup', count)
		}
	}, [count])

	// useEffect(() =>{
	//     const id = setInterval(function log() {
	//         console.log(`Outer count is: ${count}`);
	//     }, 2000);
	//     return function() {
	//         clearInterval(id);
	//     }
	// }, [count]);

	const testRef = useRef<HTMLElement | null>(null)

	function setTestBgToBlue() {
		if (testRef.current) {
			testRef.current.style.background = 'blue'
		}
	}

	return html`
		<div style="border: 5px solid blue">
			<${Test} count=${count} text="Test component 1 (outer as prop)" ref=${testRef}>
				Test component 1 children 1 ${count} (equal outer)
				<${SomeChildren} count=${'cac'}/>
			</${Test}>
			<div>Outer: ${count}</div>
			${[1,2,3].map(i => html`<div>Map ${i}</div>`)}
			<div>Outer 2: ${count2}</div>
			<${Fragment}>
				<button onclick=${increaseCount}>+ outer</button>
				<button onclick=${decreaseCount}>- outer</button>
				<button onclick=${increaseCount2}>+ outer 2</button>
				<button onclick=${increaseCount3}>+ both outer</button>
			</${Fragment}>
			<${Fragment}>
				Single-line text
			</${Fragment}>
			<button onclick=${setTestBgToBlue}>Set Test bg to blue</button>
			<${count > 300 && Test} count=${count2} text="Test component 2 (outer2 as prop)"/>
		</div>
	`
}

function A(): RefuseElement {
	console.log('A called')
	const [count, setCount] = useState(0)
	function whenToRender() {
		console.log('when to executed?')
		return count >= 5
	}

	return html`
		<a>A ${count}</a>
		<button onclick=${() => setCount(c => c+1)}>+</button>
		<button onclick=${() => setCount(0)}>reset</button>
		${count >= 5 && html`<${C} num=${1}/>`}
		${count < 5 ? html`
			<div>
				<div>
					<${B} num=${1}/>
					<${B} num=${2}/>
				</div>
				<span>hoho</span>
			</div>
		` : html`
			<div>
				<${B}/>
				<${C}/>
				<${B}/>
				<${C}/>
			</div>
		`}
		<${C} num=${2}/>
		<span>test</span>
	`
}

function B(): RefuseElement {
	console.log('B called')
	const [count, setCount] = useState(0)
	return html`
		<a>B ${count}</a>
		<button onclick=${() => setCount(c => c+1)}>+</button>
	`
}

function C(): RefuseElement {
	const [count, setCount] = useState(0)
	return html`
		<a>C ${count}</a>
		<button onclick=${() => setCount(c => c+1)}>+</button>
	`
}

const App2 = (): RefuseElement => html`
		<${A}/>
	`;

render(App, document.getElementById("root"))
