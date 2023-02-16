import type {RefuseElement, Ref} from "./src/index.mjs";
import {Fragment,
	memo,
	useMemo,
	useCallback,
	useEffect,
	useLayoutEffect,
	useState,
	useRef,
	fuse,
	render,
} from "./src/index.mjs";
// const testProps = {
// 	[Symbol()]: true,
// }
//
// console.log(fuse`<a ...${testProps} />`)

const Test2 = memo(function Test2() {

	console.log('Test2 called')

	return fuse`
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

	return fuse`
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
	return ['SomeChildren ',
		count,
		undefined,
		null,
		false, ['heheh',
			fuse`<div>ola</div>`,
			fuse`<${C}/>`,
			'ahaha'
		]
	]
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

	return fuse`
		<div style="border: 5px solid blue">
			<input/>
			<${Test} count=${count} text="Test component 1 (outer as prop)" ref=${testRef}>
				Test component 1 children 1 ${count} (equal outer)
				<div>
					<${SomeChildren} count=${count}/>
				</div>
			<//>
			<div>Outer: ${count}</div>
			${[1,2,3].map(i => fuse`<div>Map ${i}</div>`)}
			<div>Outer 2: ${count2}</div>
			<${Fragment}>
				<input/>
				<button onclick=${increaseCount}>+ outer</button>
				<button onclick=${decreaseCount}>- outer</button>
				<button onclick=${increaseCount2}>+ outer 2</button>
				<button onclick=${increaseCount3}>+ both outer</button>
			<//>
			<${Fragment}>
				Single-line text
			<//>
			<button onclick=${setTestBgToBlue}>Set Test bg to blue</button>
			${count > 300 && fuse`<div>
				<div>
					<${Test} count=${count2} text="Test component 2 (outer2 as prop)"/>
				</div>
			</div>`}
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

	return fuse`
		<a>A ${count}</a>
		<input count=${count}/>
		<button onclick=${() => setCount(c => c+1)}>+</button>
		<button onclick=${() => setCount(0)}>reset</button>
		${count >= 5 && fuse`<${C} num=${1}/>`}
		${count < 5 ? fuse`
			<div>
				<div>
					<${B} num=${1}/>
					<${B} num=${2}/>
				</div>
			</div>
		` : fuse`
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
	return fuse`
		<a>B ${count}</a>
		<input count=${count}/>
		<button onclick=${() => setCount(c => c+1)}>+</button>
	`
}

function C(): RefuseElement {
	const [count, setCount] = useState(0)
	return fuse`
		<a>C ${count}</a>
		<button onclick=${() => setCount(c => c+1)}>+</button>
	`
}

const App2 = (): RefuseElement => [
	fuse`<${App}/>`,
	fuse`<${A}/>`
];

render(App2, document.getElementById("root"))
