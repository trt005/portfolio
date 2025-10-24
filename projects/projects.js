import { fetchJSON, renderProjects} from '../gloabl.js';

const projetcs = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');

renderProjects(projectsContainer, projectsContainer, 'h2');