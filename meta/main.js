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

const data = await loadData();
const commits = processCommits(data);
console.log('rows:', data);
console.log('commits:', commits);
renderCommitInfo(data, commits);