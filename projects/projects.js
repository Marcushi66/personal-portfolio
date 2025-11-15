// ---- projects/projects.js ----
import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let projects = [];
let query = '';
let selectedIndex = -1;
let HIGHLIGHT_COLOR = '#FF00A1';
let lastPieData = [];

(async function initProjects() {
  try {
    projects = await fetchJSON('../lib/projects.json');

    console.log(`✅ Projects loaded: ${projects.length}`);
    
    const container = document.querySelector('.projects');
    if (!container) {
      console.warn('⚠️ .projects container not found.');
      return;
    }

    renderProjects(projects, container, 'h2');
    console.log('✅ Rendering complete');

    const initialTitle = document.querySelector('.projects-title');
    if (initialTitle) {
      initialTitle.textContent =
        projects.length > 0 ? `My Projects — ${projects.length} Total`
                            : 'My Projects — No Projects Yet';
    }

    renderPieAndLegend(projects);

    const projectsContainer = document.querySelector('.projects');
    const searchInput = document.querySelector('.searchBar');

    // Set up search input listener
    if (searchInput && projectsContainer) {
      searchInput.addEventListener('input', (event) => {
        query = (event.target.value || '').trim().toLowerCase();

        const filteredProjects = query === ''
          ? projects
          : projects.filter(p => {
              const haystack = Object.values(p).join('\n').toLowerCase();
              return haystack.includes(query);
            });

        renderProjects(filteredProjects, projectsContainer, 'h2');

        const titleEl = document.querySelector('.projects-title');
        if (titleEl) {
          titleEl.textContent =
            `My Projects — ${filteredProjects.length} Total`;
        }

        renderPieAndLegend(filteredProjects);
      });
    }

  } catch (err) {
    console.error('❌ Error loading projects:', err);
  }
})();

// ===== D3 Pie Plot & Legend =====
const svg = d3.select('#projects-pie-plot');
let colors = d3.scaleOrdinal(d3.schemeTableau10);

// Render pie chart based on given data
function renderPieChart(data) {
  const sliceGenerator = d3.pie().value(d => d.value);
  const arcData = sliceGenerator(data);
  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

  const paths = svg.selectAll('path')
    .data(arcData, d => d.data.label)
    .join('path')
    .attr('d', arcGenerator)
    .attr('fill', (_d, i) => (i === selectedIndex ? HIGHLIGHT_COLOR : colors(i)))
    .style('cursor', 'pointer');

  paths.on('click', (_evt, d) => {
    const i = arcData.indexOf(d);
    selectedIndex = (selectedIndex === i ? -1 : i);
    const yearLabel = d.data.label;
    const projectsContainer = document.querySelector('.projects');
    const filtered =
      selectedIndex === -1
        ? projects
        : projects.filter(p => String(p.year) === String(yearLabel));

    renderProjects(filtered, projectsContainer, 'h2');
    renderPieAndLegend(projects);
  });

}

// Render legend based on given data
function renderLegend(data) {
  const legend = d3.select('.legend');

  legend.selectAll('li')
    .data(data, d => d.label)
    .join('li')
    .attr('class', 'legend-item')
    .style('--color', (_d, i) =>
      (i === selectedIndex ? HIGHLIGHT_COLOR : colors(i))
    )
    .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
}

// Render pie chart and legend based on given projects
function renderPieAndLegend(projectsGiven) {
  const rolled = d3.rollups(projectsGiven, v => v.length, d => String(d.year));
  const pieData = rolled
    .map(([year, count]) => ({ label: year, value: count }))
    .sort((a, b) => a.label.localeCompare(b.label));

  lastPieData = pieData;

  renderPieChart(pieData);
  renderLegend(pieData);
}

