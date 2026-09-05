const state = { mode: 'compound', points: [], total: 0, months: 36 };
const $ = (id) => document.getElementById(id);
const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const number = (id, fallback = 0) => Math.max(0, Number($(id).value) || fallback);
const historyKey = 'investsim-history';

function calculate() {
	const initial = number('initial');
	const monthly = number('monthly');
	const rate = number('rate') / 100;
	const months = Math.max(1, Math.round(number('period', 1)));
	const points = [{ month: 0, total: initial, invested: initial }];
	let total = initial;
	for (let month = 1; month <= months; month += 1) {
		if (state.mode === 'compound') total = total * (1 + rate) + monthly;
		else total = initial + monthly * month + (initial + monthly * (month - 1)) * rate;
		points.push({ month, total, invested: initial + monthly * month });
	}
	const invested = initial + monthly * months;
	const interest = Math.max(0, total - invested);
	state.points = points;
	state.total = total;
	state.months = months;
	$('resultTotal').textContent = money(total);
	$('resultGrowth').textContent = `+${money(interest)}`;
	$('investedTotal').textContent = money(invested);
	$('interestTotal').textContent = money(interest);
	$('heroStat').textContent = money(total);
	$('periodLabel').textContent = months < 12 ? `${months} ${months === 1 ? 'mês' : 'meses'}` : `${(months / 12).toFixed(1).replace('.0', '')} anos`;
	$('insightYears').textContent = (months / 12).toFixed(1).replace('.0', '');
	$('milestone').textContent = money(invested);
	$('interestPercent').textContent = `${total ? (interest / total * 100).toFixed(1) : 0}%`;
	$('annualRate').textContent = state.mode === 'compound' ? `${((Math.pow(1 + rate, 12) - 1) * 100).toFixed(2)}%` : `${(rate * 12 * 100).toFixed(2)}%`;
	drawChart(points);
}

function drawChart(points) {
	const canvas = $('growthChart');
	const ratio = window.devicePixelRatio || 1;
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;
	canvas.width = width * ratio; canvas.height = height * ratio;
	const ctx = canvas.getContext('2d'); ctx.scale(ratio, ratio);
	const max = Math.max(...points.map((point) => point.total), 1);
	const pad = { top: 16, right: 8, bottom: 19, left: 3 };
	const x = (index) => pad.left + (width - pad.left - pad.right) * (index / (points.length - 1));
	const y = (value) => height - pad.bottom - (height - pad.top - pad.bottom) * (value / max);
	ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--line'); ctx.lineWidth = 1;
	for (let index = 0; index < 4; index += 1) { const lineY = pad.top + (height - pad.top - pad.bottom) * index / 3; ctx.beginPath(); ctx.moveTo(0, lineY); ctx.lineTo(width, lineY); ctx.stroke(); }
	const gradient = ctx.createLinearGradient(0, 0, 0, height); gradient.addColorStop(0, 'rgba(210,168,95,.25)'); gradient.addColorStop(1, 'rgba(210,168,95,0)');
	ctx.beginPath(); points.forEach((point, index) => index ? ctx.lineTo(x(index), y(point.total)) : ctx.moveTo(x(index), y(point.total))); ctx.lineTo(x(points.length - 1), height - pad.bottom); ctx.lineTo(x(0), height - pad.bottom); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
	ctx.beginPath(); points.forEach((point, index) => index ? ctx.lineTo(x(index), y(point.total)) : ctx.moveTo(x(index), y(point.total))); ctx.strokeStyle = '#d2a85f'; ctx.lineWidth = 2; ctx.stroke();
	const last = points[points.length - 1]; ctx.beginPath(); ctx.arc(x(points.length - 1), y(last.total), 4, 0, Math.PI * 2); ctx.fillStyle = '#91bd9a'; ctx.fill();
}

function updateChartTooltip(event) {
	const canvas = $('growthChart');
	const bounds = canvas.getBoundingClientRect();
	const position = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
	const point = state.points[Math.round(position * (state.points.length - 1))];
	const tooltip = $('chartTooltip');
	tooltip.innerHTML = `Mês ${point.month} <b>${money(point.total)}</b>`;
	tooltip.style.display = 'block';
	tooltip.style.left = `${Math.max(4, Math.min(72, position * 100 - 8))}%`;
}

function hideChartTooltip() {
	if (!window.matchMedia('(pointer: coarse)').matches) $('chartTooltip').style.display = 'none';
}

function resultSummary() {
	return `InvestSIM: montante final ${money(state.total)} em ${state.months} meses. Simulação ilustrativa.`;
}

function currentScenario() {
	return { initial: number('initial'), monthly: number('monthly'), rate: number('rate'), period: state.months, mode: state.mode };
}

function readHistory() {
	try {
		const saved = JSON.parse(localStorage.getItem(historyKey) || '[]');
		return Array.isArray(saved) ? saved.slice(0, 4) : [];
	} catch (error) {
		return [];
	}
}

function renderHistory() {
	const scenarios = readHistory();
	const row = $('historyRow');
	const list = $('historyList');
	row.hidden = scenarios.length === 0;
	list.innerHTML = '';
	scenarios.forEach((scenario) => {
		const button = document.createElement('button');
		button.className = 'history-chip';
		button.type = 'button';
		button.textContent = `${scenario.mode === 'compound' ? 'Compostos' : 'Simples'} · ${scenario.period}m`;
		button.title = `${money(scenario.initial)} inicial · ${money(scenario.monthly)} por mês · ${scenario.rate}% ao mês`;
		button.addEventListener('click', () => {
			$('initial').value = scenario.initial;
			$('monthly').value = scenario.monthly;
			$('rate').value = scenario.rate;
			$('period').value = scenario.period;
			$('periodSlider').value = scenario.period;
			state.mode = scenario.mode;
			document.querySelectorAll('.mode-button').forEach((item) => { item.classList.toggle('active', item.dataset.mode === state.mode); item.setAttribute('aria-selected', item.dataset.mode === state.mode); });
			calculate();
		});
		list.appendChild(button);
	});
}

function saveScenario() {
	const scenario = currentScenario();
	const scenarios = readHistory().filter((item) => JSON.stringify(item) !== JSON.stringify(scenario));
	scenarios.unshift(scenario);
	try { localStorage.setItem(historyKey, JSON.stringify(scenarios.slice(0, 4))); } catch (error) { }
	renderHistory();
}

function clearHistory() {
	try { localStorage.removeItem(historyKey); } catch (error) { }
	renderHistory();
}

async function copyResult() {
	try {
		await navigator.clipboard.writeText(resultSummary());
		$('actionFeedback').textContent = 'Resultado copiado.';
	} catch (error) {
		$('actionFeedback').textContent = 'Não foi possível copiar neste navegador.';
	}
}

async function shareResult() {
	if (navigator.share) {
		await navigator.share({ title: 'Minha simulação InvestSIM', text: resultSummary() }).catch(() => {});
		return;
	}
	await copyResult();
	$('actionFeedback').textContent = 'Resultado copiado para compartilhar.';
}

document.querySelectorAll('.mode-button').forEach((button) => button.addEventListener('click', () => { state.mode = button.dataset.mode; document.querySelectorAll('.mode-button').forEach((item) => { item.classList.toggle('active', item === button); item.setAttribute('aria-selected', item === button); }); calculate(); }));
document.querySelectorAll('input').forEach((input) => input.addEventListener('input', () => { if (input.id === 'periodSlider') $('period').value = input.value; if (input.id === 'period') $('periodSlider').value = Math.min(240, input.value); calculate(); }));
document.querySelectorAll('[data-preset]').forEach((button) => button.addEventListener('click', () => { const presets = { conservative: [10000, 300, .5, 60], balanced: [10000, 500, .8, 36], ambitious: [15000, 1000, 1.1, 60] }; const [initial, monthly, rate, period] = presets[button.dataset.preset]; $('initial').value = initial; $('monthly').value = monthly; $('rate').value = rate; $('period').value = period; $('periodSlider').value = period; calculate(); }));
$('simulateButton').addEventListener('click', () => { $('resultTotal').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 450 }); calculate(); saveScenario(); });
$('themeToggle').addEventListener('click', () => { document.body.classList.toggle('light'); calculate(); });
window.addEventListener('resize', calculate);
$('growthChart').addEventListener('pointermove', updateChartTooltip);
$('growthChart').addEventListener('pointerdown', updateChartTooltip);
$('growthChart').addEventListener('pointerleave', hideChartTooltip);
$('copyButton').addEventListener('click', copyResult);
$('shareButton').addEventListener('click', shareResult);
$('clearHistory').addEventListener('click', clearHistory);
renderHistory();
calculate();
