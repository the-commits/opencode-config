import { tool } from "@opencode-ai/plugin";

function textToNumber(text: string): number {
	const input = text.toLowerCase().trim();

	if (!isNaN(parseFloat(input)) && isFinite(parseFloat(input))) {
		return parseFloat(input);
	}

	const ones: { [key: string]: number } = {
		zero: 0,
		noll: 0,
		one: 1,
		en: 1,
		ett: 1,
		two: 2,
		två: 2,
		three: 3,
		tre: 3,
		four: 4,
		fyra: 4,
		five: 5,
		fem: 5,
		six: 6,
		sex: 6,
		seven: 7,
		sju: 7,
		eight: 8,
		åtta: 8,
		nine: 9,
		nio: 9,
		ten: 10,
		tio: 10,
		eleven: 11,
		elva: 11,
		twelve: 12,
		tolv: 12,
		thirteen: 13,
		tretton: 13,
		fourteen: 14,
		fjorton: 14,
		fifteen: 15,
		femton: 15,
		sixteen: 16,
		sexton: 16,
		seventeen: 17,
		sjutton: 17,
		eighteen: 18,
		arton: 18,
		nineteen: 19,
		nitton: 19,
	};

	const tens: { [key: string]: number } = {
		twenty: 20,
		tjugo: 20,
		thirty: 30,
		trettio: 30,
		forty: 40,
		fyrtio: 40,
		fifty: 50,
		femtio: 50,
		sixty: 60,
		sextio: 60,
		seventy: 70,
		sjuttio: 70,
		eighty: 80,
		åttio: 80,
		ninety: 90,
		nittio: 90,
	};

	const scales: { [key: string]: number } = {
		hundred: 100,
		hundra: 100,
		thousand: 1000,
		tusen: 1000,
		million: 1000000,
		miljon: 1000000,
		billion: 1000000000,
		miljard: 1000000000,
		trillion: 1000000000000,
		biljon: 1000000000000,
	};

	if (ones[input] !== undefined) return ones[input];
	if (tens[input] !== undefined) return tens[input];
	if (scales[input] !== undefined) return scales[input];

	let result = 0;
	let current = 0;

	const words = input.split(/[\s-]+/);

	for (const word of words) {
		if (ones[word] !== undefined) {
			current += ones[word];
		} else if (tens[word] !== undefined) {
			current += tens[word];
		} else if (word === "hundred" || word === "hundra") {
			current *= 100;
		} else if (scales[word] !== undefined) {
			result += current * scales[word];
			current = 0;
		}
	}

	result += current;

	if (result === 0 && input !== "zero" && input !== "noll") {
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
