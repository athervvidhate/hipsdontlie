// lineGraph.js
function renderLineGraph(condition, container) {
    const data = swayData[condition][selectedParticipant];
    if (!data) return;

    const margin = {top: 20, right: 20, bottom: 40, left: 40};
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = container.append("svg")
       .attr("width", width + margin.left + margin.right)
       .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
       .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
       .domain(d3.extent(data, d => d.time))
       .range([0, width]);
    const originalDomain = x.domain();

    const yMin = d3.min(data, d => Math.min(d.copX, d.copY));
    const yMax = d3.max(data, d => Math.max(d.copX, d.copY));
    const y = d3.scaleLinear()
       .domain([yMin, yMax])
       .range([height, 0]);

    const xAxisGroup = g.append("g")
       .attr("class", "x-axis")
       .attr("transform", `translate(0,${height})`)
       .call(d3.axisBottom(x));

    const yAxisGroup = g.append("g")
       .attr("class", "y-axis")
       .call(d3.axisLeft(y));

    const chartGroup = g.append("g")
       .attr("class", "chart-group");

    const lineX = d3.line()
       .x(d => x(d.time))
       .y(d => y(d.copX));

    const lineY = d3.line()
       .x(d => x(d.time))
       .y(d => y(d.copY));

    chartGroup.append("path")
       .datum(data)
       .attr("class", "line copx-line")
       .attr("fill", "none")
       .attr("stroke", "#1f77b4")
       .attr("stroke-width", 1.5)
       .attr("d", lineX);

    chartGroup.append("path")
       .datum(data)
       .attr("class", "line copy-line")
       .attr("fill", "none")
       .attr("stroke", "#ff7f0e")
       .attr("stroke-width", 1.5)
       .attr("d", lineY);

    const brush = d3.brushX()
       .extent([[0, 0], [width, height]])
       .on("end", brushed);

    const brushGroup = g.append("g")
       .attr("class", "brush")
       .call(brush);

    function brushed(event) {
       if (!event.selection) return;
       const [x0, x1] = event.selection;
       const newDomain = [x.invert(x0), x.invert(x1)];
       x.domain(newDomain);
       xAxisGroup.transition().duration(750).call(d3.axisBottom(x));
       chartGroup.selectAll(".copx-line")
          .transition().duration(750)
          .attr("d", lineX);
       chartGroup.selectAll(".copy-line")
          .transition().duration(750)
          .attr("d", lineY);
       brushGroup.call(brush.move, null);
    }

    container.append("div")
         .attr("class", "legend-container")
         .style("margin-top", "10px")
         .style("text-align", "center")
         .html(`
           <span style="display: inline-block; margin-right: 20px;">
             <span style="background: #1f77b4; border-radius: 50%; display: inline-block; width: 10px; height: 10px; margin-right: 5px;"></span> COPx
           </span>
           <span style="display: inline-block;">
             <span style="background: #ff7f0e; border-radius: 50%; display: inline-block; width: 10px; height: 10px; margin-right: 5px;"></span> COPy
           </span>
         `);

    container.append("button")
         .attr("class", "reset-zoom")
         .style("margin-top", "10px")
         .style("display", "block")
         .style("margin-left", "auto")
         .style("margin-right", "auto")
         .style("padding", "5px 10px")
         .style("background", "#3498db")
         .style("color", "white")
         .style("border", "none")
         .style("border-radius", "4px")
         .style("cursor", "pointer")
         .text("Reset Zoom")
         .on("click", function() {
             x.domain(originalDomain);
             xAxisGroup.transition().duration(750).call(d3.axisBottom(x));
             chartGroup.selectAll(".copx-line")
                .transition().duration(750)
                .attr("d", lineX);
             chartGroup.selectAll(".copy-line")
                .transition().duration(750)
                .attr("d", lineY);
         });
}
