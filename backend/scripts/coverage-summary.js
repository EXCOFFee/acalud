const fs = require('fs');
const path = require('path');

function loadCoverage() {
	const coveragePath = path.join(__dirname, '..', 'coverage', 'coverage-final.json');
	if (!fs.existsSync(coveragePath)) {
		throw new Error('coverage-final.json not found. Run coverage before executing this script.');
	}
	return JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
}

function pct(numerator, denominator) {
	if (!denominator) return 0;
	return Number(((numerator / denominator) * 100).toFixed(1));
}

function buildRows(report) {
	return Object.entries(report).map(([file, metrics]) => {
		const statements = Object.values(metrics.s || {});
		const functions = Object.values(metrics.f || {});
		const branches = Object.values(metrics.b || {});

		const statementTotal = statements.length;
		const statementCovered = statements.filter((value) => value > 0).length;
		const functionTotal = functions.length;
		const functionCovered = functions.filter((value) => value > 0).length;
		const branchTotal = branches.reduce((sum, hits) => sum + hits.length, 0);
		const branchCovered = branches.reduce((sum, hits) => sum + hits.filter((value) => value > 0).length, 0);

		const relativePath = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');

		return {
			file: relativePath,
			statementTotal,
			statementCovered,
			statementPct: pct(statementCovered, statementTotal),
			functionTotal,
			functionCovered,
			functionPct: pct(functionCovered, functionTotal),
			branchTotal,
			branchCovered,
			branchPct: pct(branchCovered, branchTotal),
		};
	});
}

function sortByCoverage(rows) {
	return rows
		.filter((row) => row.statementTotal > 0)
		.sort((a, b) => {
			if (a.statementPct !== b.statementPct) return a.statementPct - b.statementPct;
			if (a.functionPct !== b.functionPct) return a.functionPct - b.functionPct;
			return a.branchPct - b.branchPct;
		});
}

function summarize(rows) {
	const summary = rows.reduce(
		(acc, row) => {
			acc.statementTotal += row.statementTotal;
			acc.statementCovered += row.statementCovered;
			acc.functionTotal += row.functionTotal;
			acc.functionCovered += row.functionCovered;
			acc.branchTotal += row.branchTotal;
			acc.branchCovered += row.branchCovered;
			return acc;
		},
		{ statementTotal: 0, statementCovered: 0, functionTotal: 0, functionCovered: 0, branchTotal: 0, branchCovered: 0 }
	);

	return {
		statements: pct(summary.statementCovered, summary.statementTotal),
		functions: pct(summary.functionCovered, summary.functionTotal),
		branches: pct(summary.branchCovered, summary.branchTotal),
	};
}

function formatRow(row) {
	return `${row.statementPct.toFixed(1).padStart(6)}% ${row.functionPct.toFixed(1).padStart(6)}% ${row.branchPct
		.toFixed(1)
		.padStart(6)}% ${row.statementCovered}/${row.statementTotal}`.padEnd(40) + row.file;
}

function main() {
	const coverage = loadCoverage();
	const rows = buildRows(coverage);
	const sorted = sortByCoverage(rows);
	const totals = summarize(rows);

	console.log('Overall coverage:');
	console.log(`  Statements: ${totals.statements.toFixed(1)}%`);
	console.log(`  Functions : ${totals.functions.toFixed(1)}%`);
	console.log(`  Branches  : ${totals.branches.toFixed(1)}%`);
	console.log('\nWorst 20 files by statement coverage:');
	for (const row of sorted.slice(0, 20)) {
		console.log(formatRow(row));
	}
}

if (require.main === module) {
	main();
}
