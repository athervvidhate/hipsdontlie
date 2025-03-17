// dataLoader.js (modified snippet)
async function loadData() {
    const filePaths = { 
        ECR: "./data/ECR_All.csv", 
        ECN: "./data/ecn_aggregate.csv", 
        VRN: "./data/WON_All.csv", 
        VRM: "./data/WOR_All.csv"  
    };
    for (let condition in filePaths) {
        try {
            const rawData = await d3.csv(filePaths[condition]);
            swayData[condition] = {};

            rawData.forEach(d => {
                let participant = parseInt(d.subject_id, 10);
                let time = parseFloat(d.Second);
                let copX = parseFloat(d.CoPx);
                let copY = parseFloat(d.CoPy);
                // New: parse moment data
                let mx = parseFloat(d.Mx);
                let my = parseFloat(d.My);
                if (!swayData[condition][participant]) {
                    swayData[condition][participant] = [];
                }
                swayData[condition][participant].push({ time, copX, copY, mx, my });
            });

            // Sort data and calculate averages for each participant
            for (let participant in swayData[condition]) {
                swayData[condition][participant].sort((a, b) => a.time - b.time);
                const avgX = d3.mean(swayData[condition][participant], d => d.copX);
                const avgY = d3.mean(swayData[condition][participant], d => d.copY);
                swayData[condition][participant].avgX = avgX;
                swayData[condition][participant].avgY = avgY;
            }

            console.log(`✅ Loaded ${condition} data:`, swayData[condition]);
        } catch (error) {
            console.warn(`⚠️ File not found: ${filePaths[condition]} (Skipping)`);
        }
    }
}


// main.js (or a new file if you prefer keeping controls separate)
function setupDataFilter() {
    const controls = d3.select("#controls");
    
    // Append a label and dropdown for metric selection
    controls.append("label")
        .attr("for", "dataMetricSelector")
        .style("margin-left", "15px")
        .text("Select Metric: ");
    
    const select = controls.append("select")
        .attr("id", "dataMetricSelector")
        .style("margin-right", "15px");
    
    select.append("option")
        .attr("value", "cop")
        .text("COP (CoPx, CoPy)");
    
    select.append("option")
        .attr("value", "moment")
        .text("Moments (Mx, My)");
    
    select.on("change", function () {
        currentDataType = this.value;
        // Re-render the line graph for the active scrollytelling step
        if (d3.select(".step.is-active").select(".line-graph").node()) {
            d3.select(".step.is-active").select(".line-graph").remove();
            const graphContainer = d3.select(".step.is-active").select(".content")
                                     .append("div")
                                     .attr("class", "line-graph")
                                     .style("margin", "20px auto");
            // Map currentStep to condition (adjust based on your mapping)
            const conditionMap = { 
                1: "ECN", 
                2: "ECR", 
                3: "VRN", 
                4: "VRM" 
            };
            const condition = conditionMap[currentStep] || "ECN";
            renderLineGraph(condition, graphContainer);
        }
        // (Optionally) Update tooltip if visible – similar logic can be added here.
    });
}
