import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let svg;
let xScale, yScale, rScale;
let allCommits = [];
let visibleCommits = [];
let timeScale;
let commitProgress = 100;
let commitMaxTime;
const colors = d3.scaleOrdinal(d3.schemeTableau10);

// Data Loading & Processing
async function loadData() {
  const raw = await d3.csv('loc.csv');
  const data = raw.map(row => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

// Process Commits
function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([commit, lines]) => {
    const first = lines[0];
    const { author, date, time, timezone, datetime } = first;

    const ret = {
      id: commit,
      url: 'https://github.com/YOUR_REPO/commit/' + commit,
      author,
      date,
      time,
      timezone,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      totalLines: lines.length,
    };

    Object.defineProperty(ret, 'lines', {
      value: lines,
      configurable: false,
      writable: false,
      enumerable: false,
    });

    return ret;
  });
}

// Render Commit Info
function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').html('').append('dl').attr('class', 'stats');

  const totalLoc   = data.length;
  const totalCommits = commits.length;
  const filesCount = d3.groups(data, d => d.file).length;
  const maxDepth   = d3.max(data, d => +d.depth) ?? 0;
  const longestLine = d3.greatest(data, d => +d.line)?.line ?? 0;
  const maxLinesPerCommit = d3.max(commits, c => c.totalLines) ?? 0;

  const add = (label, value) => {
    const item = dl.append('div').attr('class', 'stat-item');
    item.append('dt').text(label);
    item.append('dd').text(value);
  };

  add('Commits', totalCommits);
  add('Files', filesCount);
  add('Total LOC', totalLoc);
  add('Max Depth', maxDepth);
  add('Longest Line', longestLine);
  add('Max Lines', maxLinesPerCommit);
}

// Scatter Plot
function renderScatterPlot(commits) {
  visibleCommits = commits;

  const width = 1000;
  const height = 600;

  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };


  const [minLines, maxLines] = d3.extent(allCommits, d => d.totalLines);

  svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  rScale = d3.scaleSqrt()
    .domain([minLines, maxLines])
    .range([3, 18]);

  const xAxis = d3.axisBottom(xScale)
    .tickFormat(d3.timeFormat('%b %d'));
  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');

  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg.append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  gridlines.call(
    d3.axisLeft(yScale)
      .tickFormat('')
      .tickSize(-usableArea.width)
  );

  svg.append('g').attr('class', 'dots');
  updateScatterPlot(commits);
  createBrushSelector(svg, usableArea);
}

// Update Scatter Plot
function updateScatterPlot(commits) {
  if (!svg) return;

  visibleCommits = commits;

  const xAxisGroup = svg.select('g.x-axis');
  const dotsGroup  = svg.select('g.dots');

  xScale.domain(d3.extent(commits, d => d.datetime));
  xAxisGroup.call(d3.axisBottom(xScale));
  const sorted = d3.sort(commits, d => -d.totalLines);

  const circles = dotsGroup
    .selectAll('circle')
    .data(sorted, d => d.id);

  circles.exit().remove();

  const circlesEnter = circles.enter()
    .append('circle')
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  circlesEnter.merge(circles)
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines));
}

// Tooltip
function renderTooltipContent(commit = {}) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const author = document.getElementById('commit-author');
  const lines  = document.getElementById('commit-lines');

  if (author) author.textContent = commit.author ?? '';
  if (lines)  lines.textContent  = commit.totalLines ?? '';
  if (!commit || Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;

  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
    timeStyle: 'short'
  }) ?? '';
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  const offset = 14;
  let x = event.clientX + offset;
  let y = event.clientY + offset;

  const rect = tooltip.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  if (x + rect.width + 8 > vw)  x = vw - rect.width - 8;
  if (y + rect.height + 8 > vh) y = vh - rect.height - 8;

  tooltip.style.left = `${x}px`;
  tooltip.style.top  = `${y}px`;
}

// Brush Selector
function createBrushSelector(svg, usableArea) {
  const brush = d3.brush()
    .extent([[usableArea.left, usableArea.top], [usableArea.right, usableArea.bottom]])
    .on('start brush end', (event) => {
      event.sourceEvent?.preventDefault();
      brushed(event);
    });

  svg.call(brush);
  svg.selectAll('.dots, .overlay ~ *').raise();
}

// Brush Event Handler
function brushed(event) {
  const selection = event.selection;

  d3.selectAll('circle').classed('selected', d => isCommitSelected(selection, d));

  const selected = renderSelectionCount(selection);
  renderLanguageBreakdown(selection, selected);
}

// Check if Commit is Selected
function isCommitSelected(selection, commit) {
  if (!selection) return false;
  const [[x0, y0], [x1, y1]] = selection;
  const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);

  const cx = xScale(commit.datetime);
  const cy = yScale(commit.hourFrac);

  return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY;
}

// Render Selection Count
function renderSelectionCount(selection) {
  const list = selection
    ? visibleCommits.filter(d => isCommitSelected(selection, d))
    : [];

  const el = document.getElementById('selection-count');
  el.textContent = `${list.length || 'No'} commits selected`;
  return list;
}

// Render Language Breakdown
function renderLanguageBreakdown(selection, selectedCommits) {
  const container = document.getElementById('language-breakdown');

  const commitsToUse = selectedCommits && selectedCommits.length
    ? selectedCommits
    : visibleCommits;

  if (!commitsToUse.length) { container.innerHTML = ''; return; }

  const lines = commitsToUse.flatMap(c => c.lines);
  const roll = d3.rollup(
    lines,
    v => v.length,
    d => d.type
  );

  const total = lines.length;
  const items = Array.from(roll, ([lang, count]) => ({ lang, count }));
  items.sort((a, b) => d3.ascending(a.lang, b.lang));

  container.innerHTML = '';
  for (const { lang, count } of items) {
    const pct = d3.format('.1%')(count / total);
    container.innerHTML += `
      <dt>${lang.toUpperCase()}</dt>
      <dd>${count} lines (${pct})</dd>
    `;
  }
}

// Update File Display
function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap(d => d.lines);
  let files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const filesContainer = d3.select('#files')
    .selectAll('div')
    .data(files, d => d.name)
    .join(enter => {
      const div = enter.append('div');
      div.append('dt').append('code');
      div.append('dd');
      return div;
    });

  filesContainer.select('dt code')
  .html(d => `${d.name}<br><small>${d.lines.length} lines</small>`);

  filesContainer.select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc')
    .style('background', d => colors(d.type)); 
}

// Initialize Slider UI
function initSliderUI() {
  const slider = document.getElementById('commit-progress');
  const timeEl = document.getElementById('commit-time');
  if (!slider || !timeEl) return;

  slider.value = commitProgress;
  timeEl.textContent = commitMaxTime.toLocaleString('en', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  slider.addEventListener('input', onTimeSliderChange);
}

// Time Slider Change Handler
function onTimeSliderChange() {
  const slider = document.getElementById('commit-progress');
  const timeEl = document.getElementById('commit-time');

  commitProgress = Number(slider.value);
  commitMaxTime = timeScale.invert(commitProgress);

  timeEl.textContent = commitMaxTime.toLocaleString('en', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const filtered = allCommits.filter(d => d.datetime <= commitMaxTime);

  updateScatterPlot(filtered);
  renderSelectionCount(null);
  renderLanguageBreakdown(null, []);
  updateFileDisplay(filtered);
}

// Main
const data = await loadData();
const commits = processCommits(data);

allCommits = commits;

// Time Slider
timeScale = d3.scaleTime()
  .domain(d3.extent(allCommits, d => d.datetime))
  .range([0, 100]);

commitMaxTime = timeScale.invert(commitProgress);

renderCommitInfo(data, commits);
initSliderUI();
renderScatterPlot(commits);
updateFileDisplay(allCommits);

