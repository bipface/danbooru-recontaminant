/* -------------------------------------------------------------------------- */

'use strict';

/* alternate title: [*I See Dead Children*](https://i.imgur.com/6VTEo1F.png) */

/* -------------------------------------------------------------------------- */

const webextApi = (
	typeof browser !== `undefined` ? browser :
	typeof chrome !== `undefined` ? chrome :
	undefined);

if (webextApi !== undefined) {
	webextApi.webRequest.onBeforeRequest.addListener(
		onBeforeRequ, {urls : ['*://*.donmai.us/*']}, [`blocking`]);
} else {
	console.log(`can't find browser api - listener not installed`);
};

function onBeforeRequ({url : originalHref, method}) {
	/* for GET requests to the `/posts` endpoint, where no `status:` term
	is specified in the `tags=` parameter, redirect to the same
	search expression with ` status:any` appended: */

	let url = new URL(originalHref);
	let xpr;
	if (method === `GET`
		&& /^\/+(posts)?\/*$/.test(url.pathname)
		&& (xpr = getTagsParam(url)) !== undefined
		&& !hasIncludeStatusTerm(xpr))
	{
		url.pathname = `/posts`;

		xpr = xpr.trim();
		url.searchParams.set(`tags`, xpr+(xpr ? ` ` : ``)+`status:any`);

		console.log(`rewrote request "${originalHref}" → "${url.href}"`);

		return {redirectUrl : url.href};
	};

	return {};
};

function getTagsParam(url) {
	/* zero or one instances of `tags=`: */
	let xs = url.searchParams.getAll(`tags`);
	if (xs.length <= 1) {return xs[0] || ``;};
	return undefined;
};

/* -------------------------------------------------------------------------- */

const dbg = true;

const kindSepChar = `:`;
const escChar = `\\`;
const aposChar = `'`;
const dquoteChar = `"`;
const excludeOp = `-`;
const unionOp = `~`;

function assert(value) {
	if (!value) {
		debugger;
		throw new Error(`value was falsey`);
	};
};

function codePointIsIdentChar(c) {
	c = c|0;
	return codePointIsDigit(c)
		|| codePointIsLowerAlpha(c)
		|| codePointIsUpperAlpha(c)
		|| c === 95 /* underscore */;
};

function isIncludeStatusTerm(op, kind, val) {
	return op === `` && kind === `status` && val !== ``;
};

function hasIncludeStatusTerm(xpr) {
	/* behaviour deviates from danbooru's own algorithm:
	metatag prefixes are considered to be any words matching /[a-z0-9_]+/i,
	whereas danbooru will only separate the prefix when it encounters
	recognised metatag names */

	dbg && assert(typeof xpr === `string`);

	outer : for (let i = 0, len = xpr.length;;) {

		/* skip leading whitespace: */
		while (i < len
			&& codePointIsWhitespace(xpr.codePointAt(i)))
		{
			++i;};

		if (i >= len) {
			/* reached end without finding a match */
			return false;};

		let iTerm = i; /* where the term begins */
		let iVal = iTerm; /* where the value part of the term begins */

		/* parse operator: */
		let op = ``;
		switch (xpr[i]) {
			case excludeOp :
			case unionOp :
				op = xpr[i];
				++i;
				++iVal;
				break;
			default : break;
		};

		if (op !== unionOp) {
			/* parse metatag qualifier: */
			while (i < len
				&& codePointIsIdentChar(xpr.codePointAt(i)))
			{
				dbg && assert(codePointLengthAt(xpr, i) === 1);
				++i;
			};
		};

		let kind = ``;
		if (i < len
			&& i > iVal
			&& xpr[i] === kindSepChar)
		{
			kind = xpr.slice(iVal, i).toLowerCase();
			/* metatag prefix is always case-insensitive */
			++i;
			iVal = i;
		} else {
			/* unqualified term */
			i = iVal;
		};

		if (i < len && kind !== ``) {
			let quote = xpr[i];
			if (quote === aposChar || quote === dquoteChar) {
				++i;

				/* parse quoted metatag value: */
				let val = ``;
				while (i < len) {
					let c = xpr[i];
					if (c === quote) {
						/* found terminating quote */
						++i;
						if (isIncludeStatusTerm(op, kind, val)) {
							return true;
						} else {
							continue outer;};
					};

					if (c == escChar && i + 1 < len) {
						c = xpr[i + 1];
						i += 1;
						/* within quotes, any character can be escaped */
						dbg && assert(codePointLengthAt(escChar) === 1);
					};

					val += c;
					i += codePointLengthAt(xpr, i);
				};

				/* quote unterminated */
				i = iVal;
			};
		};

		/* parse unquoted value: */
		let val = ``;
		while (i < len
			&& !codePointIsWhitespace(xpr.codePointAt(i)))
		{
			let c = xpr[i];
			if (c === escChar && kind !== `` && i + 1 < len
				&& codePointIsWhitespace(xpr.codePointAt(i + 1)))
			{
				val += xpr[i + 1];
				i += 2;
				/* outside quotes, only whitespace can be escaped */
				dbg && assert(codePointLengthAt(escChar) === 1);
			} else {
				val += c;
				i += codePointLengthAt(xpr, i);
			};
		};

		dbg && assert(i > iTerm);

		if (isIncludeStatusTerm(op, kind, val)) {
			return true;};
	};
};

function codePointIsDigit(c) {
	return 48 <= (c|0) && (c|0) <= 57;
};

function codePointIsUpperAlpha(c) {
	return 65 <= (c|0) && (c|0) <= 90;
};

function codePointIsLowerAlpha(c) {
	return 97 <= (c|0) && (c|0) <= 122;
};

function codePointLengthAt(s, i = 0) {
	/* returns 1 if not a valid surrogate pair or out of range */
	return surrogatePairCodePointAt(s, i) === -1 ? 1 : 2;
};

function surrogatePairCodePointAt(s, i = 0) {
	/* returns -1 if not a valid surrogate pair or out of range */
	dbg && assert(typeof s === `string`);
	dbg && assert((i|0) === i);

	let len = s.length;
	if (i + 2 > s.length) {
		return -1;};

	let first = s.charCodeAt(i);
	if (first >= 0xd800 && first <= 0xdbff) {/* high surrogate */
		let second = s.charCodeAt(i + 1);
		if (second >= 0xdc00 && second <= 0xdfff) {/* low surrogate */
			return (first - 0xd800) * 0x400 + second - 0xdc00 + 0x10000;};
	};

	return -1;
};

const whitespaceCodePoints = new Set([
	0x9, /* tab */
	0xa, /* lf */
	0xb, /* vtab */
	0xc, /* ff */
	0xd, /* cr */
	0x20, /* space */
	0x85, /* nel */
	0xa0, /* nbsp */
	0x1680, /* ogham space mark */
	0x2000, /* en quad */
	0x2001, /* em quad */
	0x2002, /* en space */
	0x2003, /* em space */
	0x2004, /* three-per-em space */
	0x2005, /* four-per-em space */
	0x2006, /* six-per-em space */
	0x2007, /* figure space */
	0x2008, /* punctuation space */
	0x2009, /* thin space */
	0x200a, /* hair space */
	0x2028, /* line separator */
	0x2029, /* paragraph separator */
	0x202f, /* narrow nbsp */
	0x205f, /* medium mathematical space */
	0x3000, /* ideographic space */]);

/* all whitespace code-points are single code-units: */
if (dbg) {
	for (let c of whitespaceCodePoints) {
		assert(codePointLengthAt(String.fromCharCode(c)) === 1);};};

function codePointIsWhitespace(c) {
	return whitespaceCodePoints.has(c|0);
};

/* -------------------------------------------------------------------------- */

if (typeof exports !== `undefined`) {
	exports.test = function test() {
		let f = xpr => hasIncludeStatusTerm(xpr);

		assert(!f(``));
		assert(!f(` `));
		assert(!f(`\n`));
		assert(!f(`tag1`));
		assert(!f(`tag1 tag2`));
		assert(!f(`tag1`));

		assert(!f(`-status:any`));
		assert(!f(`-status:'any'`));
		assert(!f(`-status:"any"`));
		assert(!f(`-status:\\a\\n\\y`));

		assert(!f(`tag1 -status:any tag2`));
		assert(!f(`tag1 -status:'any' tag2`));
		assert(!f(`tag1 -status:"any" tag2`));
		assert(!f(`tag1 -status:\\a\\n\\y tag2`));

		assert(!f(`rating:e`));
		assert(!f(`rating:e -status:any`));
		assert(!f(`rating:'e status:any'`));
		assert(!f(`rating:e\\ status:any`));
		assert(!f(`\\status:any`));

		assert(f(`status:any`));
		assert(f(`StAtUs:aNY`));
		assert(f(`status:whatever`));
		assert(f(`status:'any'`));
		assert(f(`status:"any"`));
		assert(f(`status:\\a\\n\\y`));
		assert(f(`status:any\\`));

		assert(f(`tag1 status:any tag2`));
		assert(f(`tag1 status:'any' tag2`));
		assert(f(`tag1 status:"any" tag2`));
		assert(f(`tag1 status:\\a\\n\\y tag2`));

		assert(f(`-status:any status:any`));
		assert(f(`~status:any status:any`));
		assert(f(`status:any -status:any`));

		assert(f(`rating:e status:any`));
		assert(f(`rating:'e' status:any`));
		assert(f(`status:any rating:e`));

		assert(f(`tag1\\ status:any`));

		// limitation of our parser
		// assert(!f(`tag1:' status:pending tag2'`));

		console.log(`all tests passed`);
	};
};

/* -------------------------------------------------------------------------- */

/*





















































*/

/* -------------------------------------------------------------------------- */