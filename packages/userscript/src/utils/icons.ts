function makeSvg(
	attrs: Record<string, string>,
	children: SVGElement[],
): SVGSVGElement {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('width', '11');
	svg.setAttribute('height', '11');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('aria-hidden', 'true');
	svg.classList.add('btn-icon');
	for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, v);
	for (const child of children) svg.appendChild(child);
	return svg;
}

function makePath(d: string): SVGPathElement {
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path.setAttribute('d', d);
	return path;
}

export function makeClipboardIcon(): SVGSVGElement {
	const path = makePath(
		'M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11' +
			'a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z',
	);
	return makeSvg({ fill: 'currentColor' }, [path]);
}

export function makeSpinnerIcon(): SVGSVGElement {
	const circle = document.createElementNS(
		'http://www.w3.org/2000/svg',
		'circle',
	);
	circle.setAttribute('cx', '12');
	circle.setAttribute('cy', '12');
	circle.setAttribute('r', '10');
	circle.setAttribute('stroke-dasharray', '40');
	circle.setAttribute('stroke-dashoffset', '15');
	return makeSvg(
		{
			fill: 'none',
			stroke: 'currentColor',
			'stroke-width': '2.5',
			'stroke-linecap': 'round',
		},
		[circle],
	);
}

export function makeCheckIcon(): SVGSVGElement {
	const path = makePath(
		'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z',
	);
	return makeSvg({ fill: 'currentColor' }, [path]);
}

export function makeErrorIcon(): SVGSVGElement {
	const path = makePath(
		'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 ' +
			'15h-2v-2h2v2zm0-4h-2V7h2v6z',
	);
	return makeSvg({ fill: 'currentColor' }, [path]);
}
