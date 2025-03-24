function renderLineGraph(condition, container) {
   const data = swayData[condition][selectedParticipant];
   if (!data) return;

   const margin = { top: 20, right: 20, bottom: 40, left: 40 };
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

   const yMin = Math.min(0, d3.min(data, d => Math.min(d.copX, d.copY))); 
   const yMax = d3.max(data, d => Math.max(d.copX, d.copY));

   const y = d3.scaleLinear()
       .domain([yMin, yMax])  
       .range([height, 0]);

   const xAxisGroup = g.append("g")
       .attr("class", "x-axis")
       .attr("transform", `translate(0,${height})`)
       .call(d3.axisBottom(x));

   // X-axis label
   g.append("text")
       .attr("class", "x-axis-label")
       .attr("x", width / 2)
       .attr("y", height + margin.bottom - 5)
       .attr("text-anchor", "middle")
       .style("font-size", "12px")
       .text("Time (seconds)");

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

   if (condition !== "ECN") {
       const controlData = swayData["ECN"][selectedParticipant];
       if (controlData) {
           const controlYMin = Math.min(0, d3.min(controlData, d => Math.min(d.copX, d.copY)));
           const controlYMax = d3.max(controlData, d => Math.max(d.copX, d.copY));

           // Ensure the y-axis can accommodate both the participant and control data
           const globalYMin = Math.min(yMin, controlYMin);
           const globalYMax = Math.max(yMax, controlYMax);

           y.domain([globalYMin, globalYMax]); 
           yAxisGroup.transition().duration(750).call(d3.axisLeft(y));

           const controlLineX = d3.line()
               .x(d => x(d.time))
               .y(d => y(d.copX));

           const controlLineY = d3.line()
               .x(d => x(d.time))
               .y(d => y(d.copY));

           chartGroup.append("path")
               .datum(controlData)
               .attr("class", "line control-copx-line")
               .attr("fill", "none")
               .attr("stroke", "#999") // Gray for control group
               .attr("stroke-width", 1.5)
               .attr("stroke-dasharray", "4,4")
               .attr("d", controlLineX);

           chartGroup.append("path")
               .datum(controlData)
               .attr("class", "line control-copy-line")
               .attr("fill", "none")
               .attr("stroke", "#555") // Darker gray for control group
               .attr("stroke-width", 1.5)
               .attr("stroke-dasharray", "4,4")
               .attr("d", controlLineY);
       }
   }

   container.append("div")
       .attr("class", "legend-container")
       .style("margin-top", "10px")
       .style("text-align", "center")
       .html(`
          <span style="display: inline-block; margin-right: 20px;">
            <span style="background: #1f77b4; border-radius: 50%; display: inline-block; width: 10px; height: 10px; margin-right: 5px;"></span> COPx
          </span>
          <span style="display: inline-block; margin-right: 20px;">
            <span style="background: #ff7f0e; border-radius: 50%; display: inline-block; width: 10px; height: 10px; margin-right: 5px;"></span> COPy
          </span>
          ${condition !== "ECN" ? `
          <span style="display: inline-block; margin-right: 20px;">
            <span style="background: #999; border-radius: 50%; display: inline-block; width: 10px; height: 10px; margin-right: 5px;"></span> Control COPx
          </span>
          <span style="display: inline-block;">
            <span style="background: #555; border-radius: 50%; display: inline-block; width: 10px; height: 10px; margin-right: 5px;"></span> Control COPy
          </span>
          ` : ""}
        `);
}
