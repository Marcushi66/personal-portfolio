import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Load and parse the CSV data
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


// Process commits by grouping lines by commit hash
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


// Render commit statistics into the #stats container
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

  add('Commits',   totalCommits);
  add('Files',     filesCount);
  add('Total LOC', totalLoc);
  add('Max Depth', maxDepth);
  add('Longest Line', longestLine);
  add('Max Lines', maxLinesPerCommit);
}


// Render scatter plot of commits
function renderScatterPlot(commits) {
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

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const dots = svg.append('g').attr('class', 'dots');

  dots.selectAll('circle')
    .data(commits)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', 5)
    .attr('fill', 'steelblue');

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');

  svg.append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg.append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  const gridlines = svg
  .append('g')
  .attr('class', 'gridlines')
  .attr('transform', `translate(${usableArea.left}, 0)`);

// Create gridlines as an axis with no labels and full-width ticks
  gridlines.call(
    d3.axisLeft(yScale)
      .tickFormat('')
      .tickSize(-usableArea.width)
);
}

const data = await loadData();
const commits = processCommits(data);
console.log('rows:', data);
console.log('commits:', commits);
renderCommitInfo(data, commits);
renderScatterPlot(commits);
