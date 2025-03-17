function runPermutationTest() {
    const vizContainer = d3.select("#permutation-test-container").select("#viz-container");
    vizContainer.selectAll("*").remove();
    
    const width = vizContainer.node().getBoundingClientRect().width || 
                  d3.select("#permutation-test-container").node().getBoundingClientRect().width;
    const height = 400;
    
    const svg = vizContainer.append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");
    
    const g = svg.append("g")
        .attr("transform", `translate(50,50)`);
    
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Permutation Test: Absolute Difference in Mean CoPx");
    
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 45)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("The observed difference shows the mean difference between the participants' medial lateral center of pressure");
    
    const ecrValues = [];
    const ecnValues = [];
    
    for (let participant in swayData.ECR) {
        if (swayData.ECR[participant] && swayData.ECR[participant].length > 0) {
            swayData.ECR[participant].forEach(d => {
                ecrValues.push(d.copX);
            });
        }
    }
    
    for (let participant in swayData.ECN) {
        if (swayData.ECN[participant] && swayData.ECN[participant].length > 0) {
            swayData.ECN[participant].forEach(d => {
                ecnValues.push(d.copX);
            });
        }
    }
    
    const minLength = Math.min(ecrValues.length, ecnValues.length);
    const ecrTrimmed = ecrValues.slice(0, minLength);
    const ecnTrimmed = ecnValues.slice(0, minLength);
    
    const observedDifferences = [];
    for (let i = 0; i < minLength; i++) {
        observedDifferences.push(ecnTrimmed[i] - ecrTrimmed[i]);
    }
    
    const observedStatistic = Math.abs(d3.mean(observedDifferences));
    
    const numPermutations = 1000;
    const permutationResults = [];
    const allData = [...ecrTrimmed, ...ecnTrimmed];
    
    for (let i = 0; i < numPermutations; i++) {
        const shuffled = [...allData].sort(() => Math.random() - 0.5);
        const perm_ecn = shuffled.slice(0, minLength);
        const perm_ecr = shuffled.slice(minLength, 2 * minLength);
        const permDifferences = [];
        for (let j = 0; j < minLength; j++) {
            permDifferences.push(perm_ecn[j] - perm_ecr[j]);
        }
        permutationResults.push(Math.abs(d3.mean(permDifferences)));
    }
    
    const histogramWidth = width - 100;
    const histogramHeight = height - 100;
    
    const bins = d3.histogram()
        .domain([0, d3.max(permutationResults) * 1.1])
        .thresholds(30)
        (permutationResults);
    
    const x = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.x1)])
        .range([0, histogramWidth]);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .range([histogramHeight, 0]);
    
    g.append("g")
        .attr("transform", `translate(0, ${histogramHeight})`)
        .call(d3.axisBottom(x).ticks(10))
        .append("text")
        .attr("x", histogramWidth / 2)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .style("fill", "black")
        .text("Mean Difference in CoPx");
    
    g.append("g")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -histogramHeight / 2)
        .attr("text-anchor", "middle")
        .style("fill", "black")
        .text("Frequency");
    
    g.selectAll(".bar")
        .data(bins)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.x0))
        .attr("y", d => y(d.length))
        .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr("height", d => histogramHeight - y(d.length))
        .attr("fill", "#69b3a2")
        .attr("opacity", 0.7);
    
    const kde = kernelDensityEstimator(kernelEpanechnikov(7), x.ticks(100));
    const density = kde(permutationResults);
    
    const densityMax = d3.max(density, d => d[1]);
    const histMax = d3.max(bins, d => d.length);
    const densityScale = histMax / densityMax;
    
    const line = d3.line()
        .curve(d3.curveBasis)
        .x(d => x(d[0]))
        .y(d => y(d[1] * densityScale));
    
    g.append("path")
        .datum(density)
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("stroke-width", 1.5)
        .attr("stroke-linejoin", "round")
        .attr("d", line);
    
    g.append("line")
        .attr("x1", x(observedStatistic))
        .attr("x2", x(observedStatistic))
        .attr("y1", 0)
        .attr("y2", histogramHeight)
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
    
    const arrowX = observedStatistic * 0.6;
    const arrowY = y(d3.max(bins, d => d.length) * 0.8);
    
    g.append("path")
        .attr("d", `M${x(arrowX)},${arrowY} L${x(observedStatistic)},${y(2)}`)
        .attr("stroke", "red")
        .attr("fill", "none")
        .attr("marker-end", "url(#arrow)");
    
    svg.append("defs").append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 5)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "red");
    
    g.append("text")
        .attr("x", x(arrowX))
        .attr("y", arrowY - 15)
        .attr("text-anchor", "middle")
        .style("fill", "red")
        .style("font-size", "10px")
        .text(`Observed Diff: ${observedStatistic.toFixed(3)}`);
    
    g.append("text")
        .attr("x", x(arrowX))
        .attr("y", arrowY)
        .attr("text-anchor", "middle")
        .style("fill", "red")
        .style("font-size", "10px")
        .text(`P-Value: ${(permutationResults.filter(d => d >= observedStatistic).length / numPermutations).toFixed(3)}`);
    
    g.append("text")
        .attr("x", x(observedStatistic))
        .attr("y", histogramHeight + 30)
        .attr("text-anchor", "middle")
        .style("fill", "red")
        .style("font-weight", "bold")
        .text("Observed");
}

function kernelDensityEstimator(kernel, X) {
    return function(V) {
        return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
    };
}

function kernelEpanechnikov(k) {
    return function(v) {
        v = v / k;
        return Math.abs(v) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
}