//import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
//import { loadData,processCommits,renderScatterPlot } from './main.js';

//let data = await loadData();
//let commits = processCommits(data);

//So I tried makinga  filter on meta.js but because renderscatterplot is
//in main.js it is just not possible for me to filter properly in meta.js
//This same code is copied in main.js
//let commitProgress = 100;
//let timeScale = d3
//  .scaleTime()
//  .domain([
//    d3.min(commits, (d) => d.datetime),
//    d3.max(commits, (d) => d.datetime),
//  ])
//  .range([0, 100]);
//let commitMaxTime = timeScale.invert(commitProgress);
//let filteredCommits = commits;

//function onTimeSliderChange() {

  //commitProgress = +document.getElementById("commit-progress").value;

  //commitMaxTime = timeScale.invert(commitProgress);

  //document.getElementById("commit-time-display").textContent = commitMaxTime.toLocaleString("en-US", {
  //  dateStyle: "long",
  //  timeStyle: "short"
  //});
  //filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  //updateScatterPlot(data, filteredCommits);
//}

//document.getElementById("commit-progress").addEventListener("input", onTimeSliderChange);
//onTimeSliderChange();
