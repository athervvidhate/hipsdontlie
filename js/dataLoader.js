// dataLoader.js
async function loadData() {
    const filePaths = { ECR: "./data/ECR_All.csv", ECN: "./data/ecn_aggregate.csv", 
        VRN: "./data/WON_All.csv", VRM: "./data/WOR_All.csv"  
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
                if (!swayData[condition][participant]) {
                    swayData[condition][participant] = [];
                }
                swayData[condition][participant].push({ time, copX, copY });
            });

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
