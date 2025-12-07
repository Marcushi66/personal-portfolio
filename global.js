// global.js
console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'meta/', title: 'Meta' },
  { url: 'https://github.com/Marcushi66', title: 'GitHub' }
];

let BASE_PATH = '/';

if (location.hostname === 'marcushi66.github.io') {
  BASE_PATH = '/personal-portfolio/';
}

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url.startsWith('http') ? p.url : BASE_PATH + p.url;
  let title = p.title;

  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;

  a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname
  );

  if (a.host !== location.host) {
    a.target = '_blank';
  }

  nav.append(a);
}

// Color scheme selector
document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

const select = document.querySelector('.color-scheme select');

select.addEventListener('input', (event) => {
  const scheme = event.target.value;
  console.log('color scheme changed to', scheme);
  document.documentElement.style.setProperty('color-scheme', scheme);
  localStorage.colorScheme = scheme;
});

if ('colorScheme' in localStorage) {
  const saved = localStorage.colorScheme;
  document.documentElement.style.setProperty('color-scheme', saved);
  document.querySelector('.color-scheme select').value = saved;
}

// --- Better contact form ---
const form = document.querySelector("form");

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  let url = form.action + "?";

  for (let [name, value] of data) {
    url += `${name}=${encodeURIComponent(value)}&`;
  }

  location.href = url;
});

// Fetch a JSON file and return parsed data
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
    return [];
  }
}

// Render projects into a container element
export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!containerElement) return;

  containerElement.innerHTML = '';

  if (!Array.isArray(projects) || projects.length === 0) {
    containerElement.innerHTML = `<p class="muted">No projects to display yet.</p>`;
    return;
  }

  for (const project of projects) {
    const article = document.createElement('article');
    const title = project.title ?? 'Untitled project';
    const imgSrc = project.image ?? 'images/placeholder.png';
    const desc = project.description ?? '';

    article.innerHTML = `
      <${headingLevel}>${title}</${headingLevel}>
      <img src="${imgSrc}" alt="${title}">
      <div class="project-meta">
        <p>${desc}</p>
        <p class="project-year">c. ${project.year}</p>
        <p><a class="project-link" href="${project.url}" target="_blank">View project</a></p>

      </div>
    `;
    containerElement.appendChild(article);
  }
}

// Fetch GitHub user data
export async function fetchGitHubData(username) {
  try {
    const data = await fetchJSON(`https://api.github.com/users/${username}`);
    return data;
  } catch (error) {
    console.error("Error fetching GitHub data:", error);
    return null;
  }
}
