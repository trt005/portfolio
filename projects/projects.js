import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
console.log('Projects data:', projects);

const projectsContainer = document.querySelector('.projects');

renderProjects(latestprojects, projectsContainer, 'h2');