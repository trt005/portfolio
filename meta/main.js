import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line), // or just +row.line
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;

      let ret = {
        id: commit,
        url: 'https://github.com/trt005/portfolio/commit/' + commit,
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
        enumerable: false,
        writable: false,
        configurable: false,
      });

      return ret
    });
}

function renderCommitInfo(data, commits) {
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    // Add Total lines of code
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    // Add total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    // Add number of files
    const numFiles = d3.group(data, d => d.file).size;
    dl.append('dt').text('Files');
    dl.append('dd').text(numFiles);

    // Add time of day most worked
    const workTime = d3.rollups(
        data,
        v => v.length,
        d => {
            const h = new Date(d.datetime).getHours();
            if (h < 6) return 'Night';
            if (h < 12) return 'Morning';
            if (h < 18) return 'Afternoon';
            else return 'Evening';
        }
    );

    const maxPeriod = d3.greatest(workTime, d => d[1])?.[0] || 'N/A';
    dl.append('dt').text('Time of day most work done');
    dl.append('dd').text(maxPeriod);

    // Add day most work done
    const workDay = d3.rollups(
        data,
        v => v.length,
        d => new Date(d.datetime).toLocaleString('en', {weekday: 'long'})
    );
    const maxDay = d3.greatest(workDay, d=> d[1])?.[0] || 'N/A';
    dl.append('dt').text('Day most work done');
    dl.append('dd').text(maxDay);

    // Add unique days worked
    const uniqueDays = new Set(
        data.map(d => new Date(d.datetime).toDateString())
    ).size;
    dl.append('dt').text('Days worked');
    dl.append('dd').text(uniqueDays);
}

let xScale, yScale;
function renderScatterPlot(data, commits){
  const width = 1000;
  const height = 600;

  const svg = d3.select('#chart')
                .append('svg')
                .attr('viewBox', `0 0 ${width} ${height}`)
                .style('overflow', 'visible');

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  const sortedCommit = sortedCommits.filter(d => d.id !== '00000000');
  

  const margin = { top: 10, right: 10, bottom: 30, left: 20 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  xScale = d3
    .scaleTime()
    .domain(d3.extent(sortedCommit, (d) => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();
  yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

  // Update scales with new ranges
  xScale.range([usableArea.left, usableArea.right]);
  yScale.range([usableArea.bottom, usableArea.top]);
  const dots = svg.append('g').attr('class', 'dots');

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2,30]);
  dots
  .selectAll('circle')
  .data(sortedCommits, (d) => d.id) // change this line
  .join('circle')
  .attr('cx', (d) => xScale(d.datetime))
  .attr('cy', (d) => yScale(d.hourFrac))
  .attr('r', (d) => rScale(d.totalLines))
  .style('fill-opacity', 0.7)
  .attr('fill', 'steelblue')
  .on('mouseenter', (event, commit) => {
    renderTooltipContent(commit);
    updateTooltipVisibility(true);
    updateTooltipPosition(event);
  })
  .on('mouseleave', () => {
    updateTooltipVisibility(false);
  });

  // Add gridlines BEFORE the axes
  const gridlines = svg
  .append('g')
  .attr('class', 'gridlines')
  .attr('transform', `translate(${usableArea.left}, 0)`);

  // Create gridlines as an axis with no labels and full-width ticks
  gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  // Create the axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale).tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  // Add X axis
  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  // Add Y axis
  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  function isCommitSelected(selection, commit) {
    if (!selection) return false;

    const[[x0, y0], [x1,y1]] = selection;
    const cx = xScale(commit.datetime);
    const cy = yScale(commit.hourFrac);

    return cx >= x0 && cx <= x1 && cy >= y0 &&cy <= y1;
  }

  function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
  }

  function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }}

  function brushed(event) {
    const selection = event.selection;
    dots.selectAll('circle').classed('selected', (d) => isCommitSelected(selection, d));
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
  }

  const brush = d3.brush().on('start brush end', brushed);

  svg.call(brush);

  // Raise dots and everything after overlay
  svg.selectAll('.dots').raise();
}

let data = await loadData();
let commits = processCommits(data);
let colors = d3.scaleOrdinal(d3.schemeTableau10);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time-tool');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');
  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;

  const dt = new Date(commit.datetime);

  date.textContent = dt.toLocaleString('en', {dateStyle: 'full',});

  time.textContent = dt.toLocaleString('en', {hour: '2-digit', minute: '2-digit'});

  author.textContent = commit.author;
  lines.textContent = commit.lines.length;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

let commitProgress = 100;
let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);
let commitMaxTime = timeScale.invert(commitProgress);
let filteredCommits = commits;

function updateFileDisplay(filteredCommits) {
  let lines = filteredCommits.flatMap((d) => d.lines);
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    })
    .sort((a, b) => b.lines.length - a.lines.length);

  let filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, (d) => d.name)
    .join(
      (enter) =>
        enter.append('div').call((div) => {
          div.append('dt').append('code');
          div.append('dd');
        }),
    );
  
  filesContainer.select('dt > code')
    .html(
      (d) => `${d.name}<br><small>${d.lines.length} lines</small>`
    );
  filesContainer
    .select('dd')
    .selectAll('div')
    .data((d) => d.lines)
    .join('div')
    .attr('class', 'loc')
    .attr('style', (d) => `--color: ${colors(d.type)}`);
}

function updateScatterPlot(data, commits) {
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

  const svg = d3.select('#chart').select('svg');

  xScale.domain(d3.extent(commits, d => d.datetime));

  const xAxis = d3.axisBottom(xScale);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select('g.dots');

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  dots
    .selectAll('circle')
    .data(sortedCommits, d => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .attr("style", d => `--r: ${rScale(d.totalLines)}`)
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1)
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}

function onTimeSliderChange() {

  commitProgress = +document.getElementById("commit-progress").value;

  commitMaxTime = timeScale.invert(commitProgress);

  document.getElementById("commit-time-display").textContent = commitMaxTime.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short"
  });

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

document.getElementById("commit-progress").addEventListener("input", onTimeSliderChange);
onTimeSliderChange();

commits.sort((a, b) => a.datetime - b.datetime);

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
		On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another commit' : 'my first commit.'
    }</a>.
		I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
		Then I looked over what I added. It was okay.
	`,
  );

function onStepEnter(response) {
  const commit = response.element.__data__;
  const targetTime = commit.datetime;

  const filtered = commits.filter(d => d.datetime <= targetTime);

  updateScatterPlot(data, filtered);
}

const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnter);