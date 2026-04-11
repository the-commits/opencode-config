import { tool } from "@opencode-ai/plugin";

function textToNumber(text: string): number {
	const input = text.toLowerCase().trim();

	if (!isNaN(parseFloat(input)) && isFinite(parseFloat(input))) {
		return parseFloat(input);
	}

	const ones: { [key: string]: number } = {
		// English
		zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
		ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
		// Swedish
		noll: 0, en: 1, ett: 1, två: 2, tre: 3, fyra: 4, fem: 5, sex: 6, sju: 7, åtta: 8, nio: 9,
		tio: 10, elva: 11, tolv: 12, tretton: 13, fjorton: 14, femton: 15, sexton: 16, sjutton: 17, arton: 18, nitton: 19,
		// Spanish
		cero: 0, un: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
		diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
		// German
		"null": 0, eins: 1, ein: 1, zwei: 2, zwo: 2, drei: 3, vier: 4, fünf: 5, fuenf: 5, funf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9,
		zehn: 10, elf: 11, zwölf: 12, zwoelf: 12, dreizehn: 13, vierzehn: 14, fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19,
	};

	const tens: { [key: string]: number } = {
		// English
		twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
		// Swedish
		tjugo: 20, trettio: 30, fyrtio: 40, femtio: 50, sextio: 60, sjuttio: 70, åttio: 80, nittio: 90,
		// Spanish
		veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
		// German
		zwanzig: 20, dreißig: 30, dreissig: 30, vierzig: 40, fünfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90,
	};

	const scales: { [key: string]: number } = {
		// English
		hundred: 100, thousand: 1000, million: 1000000, billion: 1000000000, trillion: 1000000000000,
		// Swedish
		hundra: 100, tusen: 1000, miljon: 1000000, miljard: 1000000000, biljon: 1000000000000,
		// Spanish
		cien: 100, ciento: 100, mil: 1000, millon: 1000000, millón: 1000000,
		// German
		hundert: 100, tausend: 1000, millionen: 1000000, milliarde: 1000000000,
	};

	if (ones[input] !== undefined) return ones[input];
	if (tens[input] !== undefined) return tens[input];
	if (scales[input] !== undefined) return scales[input];

	let result = 0;
	let current = 0;
	let parsedSomething = false;

	// Split by space, dash, or generic logical connectors like "und", "y", "and", "och"
	const words = input.split(/[\s-]+|(?:^|\s)(?:and|y|und|och)(?:\s|$)/).filter(Boolean);

	for (const w of words) {
		const word = w.trim();
		if (!word) continue;

		if (ones[word] !== undefined) {
			current += ones[word];
			parsedSomething = true;
		} else if (tens[word] !== undefined) {
			current += tens[word];
			parsedSomething = true;
		} else if (scales[word] === 100) {
			// e.g. "three hundred" => 3 * 100. Or just "hundred" => 100.
			current = current === 0 ? 100 : current * 100;
			parsedSomething = true;
		} else if (scales[word] !== undefined) {
			// e.g. "two thousand" => 2 * 1000. Or just "thousand" => 1000.
			current = current === 0 ? 1 : current;
			result += current * scales[word];
			current = 0;
			parsedSomething = true;
		}
	}

	result += current;

	// If we got exactly 0 and it wasn't a "zero" equivalent (which we handled with early returns)
	// and we didn't parse anything valid, then throw.
	if (!parsedSomething) {
		throw new Error(`Unable to parse number: "${text}"`);
	}

	return result;
}

export const add = tool({
	description: "ALWAYS use this tool when you need to add numbers together. Do NOT calculate math in your head to avoid hallucinations.",
	args: {
		a: tool.schema
			.string()
			.describe(
				"First number (can be digits or words like 'one', 'two', 'hundred')",
			),
		b: tool.schema
			.string()
			.describe(
				"Second number (can be digits or words like 'one', 'two', 'hundred')",
			),
	},
	async execute(args) {
		const a = textToNumber(args.a);
		const b = textToNumber(args.b);
		return (a + b).toString();
	},
});

export const multiply = tool({
	description: "ALWAYS use this tool when you need to multiply numbers together. Do NOT calculate math in your head to avoid hallucinations.",
	args: {
		a: tool.schema
			.string()
			.describe(
				"First number (can be digits or words like 'one', 'two', 'hundred')",
			),
		b: tool.schema
			.string()
			.describe(
				"Second number (can be digits or words like 'one', 'two', 'hundred')",
			),
	},
	async execute(args) {
		const a = textToNumber(args.a);
		const b = textToNumber(args.b);
		return (a * b).toString();
	},
});

export const subtract = tool({
	description: "ALWAYS use this tool when you need to subtract numbers. Do NOT calculate math in your head to avoid hallucinations.",
	args: {
		a: tool.schema
			.string()
			.describe(
				"First number (can be digits or words like 'one', 'two', 'hundred')",
			),
		b: tool.schema
			.string()
			.describe(
				"Second number (can be digits or words like 'one', 'two', 'hundred')",
			),
	},
	async execute(args) {
		const a = textToNumber(args.a);
		const b = textToNumber(args.b);
		return (a - b).toString();
	},
});

export const divide = tool({
	description: "ALWAYS use this tool when you need to divide numbers. Do NOT calculate math in your head to avoid hallucinations.",
	args: {
		a: tool.schema
			.string()
			.describe(
				"First number - dividend (can be digits or words like 'one', 'ett', 'hundred', 'hundra')",
			),
		b: tool.schema
			.string()
			.describe(
				"Second number - divisor (can be digits or words like 'one', 'ett', 'hundred', 'hundra')",
			),
	},
	async execute(args) {
		const a = textToNumber(args.a);
		const b = textToNumber(args.b);
		if (b === 0) {
			throw new Error("Division by zero is not allowed");
		}
		return (a / b).toString();
	},
});
