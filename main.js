const charts = {};
let novAprAveragesGlobal = [];
let mayOctAveragesGlobal = [];
Chart.defaults.plugins.tooltip.enabled = false;

document.addEventListener('DOMContentLoaded', function() {
    const addApplianceBtn = document.getElementById('addAppliance');
    addApplianceBtn.addEventListener('click', addApplianceToBothTables);

    document.getElementById('tab1').addEventListener('click', () => switchTab('applianceTableContainer', 'chartContainer1'));
    document.getElementById('tab2').addEventListener('click', () => switchTab('applianceTable2Container', 'chartContainer2'));

    function addApplianceToBothTables() {
        // Add a row to each table
        addRow('applianceTable');
        addRow('applianceTable2');
        // Ensure synchronization is set up correctly for all rows
        syncTableRows();
    }

    function addRow(tableId) {
        const tbody = document.getElementById(tableId).querySelector('tbody');
        const newRow = tbody.insertRow();
        const cells = [];
        // Determine the index of the newly added row
        const rowIndex = Array.from(tbody.children).indexOf(newRow);
    
        for (let i = 0; i < 27; i++) {
            const cell = newRow.insertCell();
            cells.push(cell);
            cell.contentEditable = true;
    
            // Adding input listeners to the first cell for special handling
            if (i === 0) {
                cell.addEventListener('input', (event) => {
                    const nameValue = event.target.textContent.toLowerCase();
                    if (nameValue === 'chladnička' || nameValue === 'chladnicka') {
                        fillHourCellsForBothTables(rowIndex, '10');
                    }
                });
                setFocusAndCursorPosition(cell);
            } else if (i === 26) {
                cell.contentEditable = false;
            } else {
                cell.addEventListener('input', () => validateAndCalculate(tableId, cell, i));
            }
        }

        cells.forEach(cell => {
            cell.addEventListener('keydown', (e) => {
                // Navigation and cursor movement logic
                if (e.key === 'ArrowRight') {
                    moveCursorWithinCell(cell, 'right');
                } else if (e.key === 'ArrowLeft') {
                    moveCursorWithinCell(cell, 'left');
                } else if (e.key === 'ArrowUp') {
                    navigateToNextCell(cell, 'up');
                } else if (e.key === 'ArrowDown') {
                    navigateToNextCell(cell, 'down');
                }
            });
        });
    
        newRow.classList.add('highlighted-row');
        setTimeout(() => {
            newRow.classList.add('fade-out-highlight'); // Start fade-out effect
            newRow.classList.remove('highlighted-row'); // Remove initial highlight class
           
        }, 1700);
    }
    
    function fillHourCellsForBothTables(rowIndex, value) {
        const tableIds = ['applianceTable', 'applianceTable2'];
        tableIds.forEach(tableId => {
            const tbody = document.getElementById(tableId).querySelector('tbody');
            if (rowIndex < tbody.rows.length) {
                const row = tbody.rows[rowIndex];
                for (let j = 2; j <= 25; j++) {
                    row.cells[j].textContent = value;
                    row.cells[j].dispatchEvent(new Event('input'));
                }
            }
        });
    }

    function syncTableRows() {
        const table1 = document.getElementById('applianceTable');
        const table2 = document.getElementById('applianceTable2');
        // Determine the shorter table to prevent out-of-bounds access
        const rowCount = Math.min(table1.rows.length, table2.rows.length);

        for (let rowIndex = 1; rowIndex < rowCount; rowIndex++) { // Start at 1 to skip the header row
            [0, 1].forEach(cellIndex => { // Sync only the first two columns (Name and Power)
                const cell1 = table1.rows[rowIndex].cells[cellIndex];
                const cell2 = table2.rows[rowIndex].cells[cellIndex];

                // Remove existing input listeners to prevent duplication
                cell1.oninput = null;
                cell2.oninput = null;

                // Set up new input listeners for synchronization
                cell1.oninput = () => { cell2.textContent = cell1.textContent; };
                cell2.oninput = () => { cell1.textContent = cell2.textContent; };
            });
        }
    }

    function validateAndCalculate(tableId, cell, columnIndex) {
        let isValid = true;
        let cellValue = cell.textContent.trim();
    
        // Allow empty cells to be treated as '0' without highlighting them as invalid
        if (cellValue === '') {
            cell.style.backgroundColor = ""; // Reset background color for empty cells
            cell.textContent = '0'; // Treat empty cells as '0' for calculation purposes
        } else {
            // Validation for power column (index 1)
            if (columnIndex === 1 && !/^\d*\.?\d*$/.test(cellValue)) { // Allow only numbers (integer or decimal)
                isValid = false;
            }
    
            // Validation for hour columns (index 2 to 25)
            if (columnIndex >= 2 && columnIndex <= 25 && (!/^\d{1,2}$/.test(cellValue) || parseInt(cellValue) > 60)) {
                isValid = false;
            }
        }
    
        if (isValid) {
            cell.style.backgroundColor = ""; // Reset background color if input is valid
            calculateTotal(tableId); // Proceed with calculation if valid
            // Add these lines to update the charts accordingly
            updateChart('applianceTable', 'chartContainer1');
            updateChart('applianceTable2', 'chartContainer2');
        } else {
            cell.style.backgroundColor = "lightcoral"; // Highlight cell if input is invalid
        }
    }
    

    function calculateTotal(tableId) {
        const table = document.getElementById(tableId);
        const tbody = table.querySelector('tbody');
        const tfoot = table.querySelector('tfoot tr');
        const hourlyTotals = Array.from({ length: 24 }, () => 0);
    
        // Calculate hourly consumption for each appliance
        Array.from(tbody.rows).forEach(row => {
            const power = parseInt(row.cells[1].textContent) || 0;
            let totalDailyConsumption = 0; 
      
            for (let i = 2; i <= 25; i++) {
              const minutesUsed = parseInt(row.cells[i].textContent) || 0;
              const hourlyConsumption = (power * (minutesUsed / 60));
              hourlyTotals[i - 2] += hourlyConsumption;
              totalDailyConsumption += hourlyConsumption; // Accumulate for appliance
            }
      
            // Update the 'Day Consumption' cell for this appliance
            row.cells[26].textContent = Math.round(totalDailyConsumption) + ' Wh'; 
          });
    
        // Update footer cells with the hourly totals
        hourlyTotals.forEach((total, index) => {
            const footerCell = tfoot.cells[index + 1];
            footerCell.textContent = Math.round(total); // Use Math.round to convert to an integer
        });
    
        // Update the total daily consumption cell in the footer
        const totalConsumption = hourlyTotals.reduce((sum, current) => sum + current, 0);
        tfoot.cells[tfoot.cells.length - 1].textContent = Math.round(totalConsumption) + ' Wh';
    
        // After updating the footer, update the charts
        updateChart(tableId, tableId === 'applianceTable' ? 'chartContainer1' : 'chartContainer2');
    }

    
    let customTooltip = document.getElementById('custom-tooltip');
        if (!customTooltip) {
            // If it doesn't exist, create it and append it to the body or a container that won't be cleared
            customTooltip = document.createElement('div');
            customTooltip.id = 'custom-tooltip'; // Assign an ID for future reference
            customTooltip.style.position = 'absolute';
            customTooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            customTooltip.style.color = 'white';
            customTooltip.style.padding = '10px';
            customTooltip.style.borderRadius = '5px';
            customTooltip.style.display = 'none';
            document.body.appendChild(customTooltip); // Append to the body or a permanent container
        }


    function updateChart(tableId, chartContainerId) {
        // Remove the existing canvas to ensure we don't create multiple charts
        let canvas = document.querySelector(`#${chartContainerId} canvas`);
        if (canvas) {
            canvas.remove();
        }
        // Create a new canvas element
        canvas = document.createElement('canvas');
        document.getElementById(chartContainerId).appendChild(canvas);
    
        // If a chart instance already exists, destroy it to prevent memory leaks
        if (charts[chartContainerId]) {
            charts[chartContainerId].destroy();
        }
    
        // Create a new chart context from the canvas
        const ctx = canvas.getContext('2d');
        const labels = Array.from({ length: 24 }, (_, i) => `${i + 1}`);

        let datasets = [{
            label: 'Spotreba energie spotrebičmi (Wh)',
            data: getApplianceConsumptionData(tableId),
            backgroundColor: 'rgba(255, 99, 132, 0.5)', // light red for consumption
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
            fill: false,
        }];
    
    
        // Conditionally add the average profiles dataset based on the tableId
        if (tableId === 'applianceTable' && novAprAveragesGlobal.length > 0) {
            
            datasets.push({
                label: 'November - Apríl priemerná tvorba energie (Wh)',
                data: novAprAveragesGlobal,
                backgroundColor: 'rgba(0, 128, 0, 0.5)',
                borderColor:  'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                fill: false,
            });
        }
        
        if (tableId === 'applianceTable2' && mayOctAveragesGlobal.length > 0) {
            
            datasets.push({
                label: 'Máj - Október priemerná tvorba energie (Wh)',
                data: mayOctAveragesGlobal,
                backgroundColor:'rgba(0, 128, 0, 0.5)', 
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                fill: false,
            });
        }
    
        // Create the new chart instance and store it
        charts[chartContainerId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets,
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        },
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            // Modify the filter function for safety
                            filter: function(item, chart) {
                                
                                //console.log(chart.data) // UNDEFINED
                                // Check if the chart has data and datasets defined
                                if (chart.datasets) {
                                    // Find the dataset that matches the label of this legend item
                                    const matchingDataset = chart.datasets.find(ds => ds.label === item.text);
                                    
                                    // If a matching dataset is found and it has data, return true if any data points are greater than zero
                                    if (matchingDataset && matchingDataset.data) {
                                        return matchingDataset.data.some(val => val > 0);
                                    }
                                }
                                // If datasets are not available, don't show the legend item
                                return false;
                            }
                        }
                    }
                    ,
                    tooltip: {
                        enabled: true, // Enable tooltips
                    }
                }
            }
        });

        const chartContainers = document.querySelectorAll('.chartContainer');
        chartContainers.forEach(container => {
            container.style.height = '35vh'; // Set the height to 25% of the viewport height
        });

    }

    function switchTab(activeTableContainerId) {
        // Specifically hide only the table containers, not affecting the chart containers
        document.getElementById('applianceTableContainer').style.display = 'none';
        document.getElementById('applianceTable2Container').style.display = 'none';
    
        // Show the active table container
        document.getElementById(activeTableContainerId).style.display = 'table'; // Ensure table layout
    
        // Update active class for tabs
        document.getElementById('tab1').classList.remove('active');
        document.getElementById('tab2').classList.remove('active');
    
        // Apply the active class based on the active table container
        if (activeTableContainerId === 'applianceTableContainer') {
            document.getElementById('tab1').classList.add('active');
        } else {
            document.getElementById('tab2').classList.add('active');
        }
    
        // Explicitly state that chart containers are always visible (for clarity, even if not functionally required)
        document.getElementById('chartContainer1').style.display = 'block';
        document.getElementById('chartContainer2').style.display = 'block';
    }

    document.getElementById('xlsxFileInput').addEventListener('change', handleFileSelect, false);

    document.getElementById('customButton').addEventListener('click', function () {
        document.getElementById('xlsxFileInput').click();
      });
      
    document.getElementById('xlsxFileInput').addEventListener('change', function () {
    document.getElementById('fileChosen').textContent = this.files[0].name;
    });
    function handleFileSelect(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
    
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
    
            const worksheetName = 'Hourly_profiles';
            const worksheet = workbook.Sheets[worksheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "A5:M29" });
    
            // Calculate the averages for each hour
            const novAprAverages = calculateSeasonAverages(json, [11, 12, 1, 2, 3, 4]); // November to April
            const mayOctAverages = calculateSeasonAverages(json, [5, 6, 7, 8, 9, 10]); // May to October
            
            novAprAveragesGlobal = novAprAverages;
            mayOctAveragesGlobal = mayOctAverages;
           
            // Update the chart with the new data
            updateChart('applianceTable', 'chartContainer1'); // For November-April
            updateChart('applianceTable2', 'chartContainer2'); // For May-October

            const pvConfigWorksheet = workbook.Sheets['PV_config'];
            if (pvConfigWorksheet) {
                const cellRef = 'B5';
                const cellValue = pvConfigWorksheet[cellRef] ? pvConfigWorksheet[cellRef].v : 0; // Use .v to get the raw value
                const calculatedCost = cellValue * 950;
                const formattedCost = new Intl.NumberFormat('fr-FR').format(calculatedCost);

                // Update the paragraph with the calculated cost
                const costParagraphs = document.querySelectorAll('.costs');
                costParagraphs.forEach(paragraph => {
                    paragraph.textContent = `Predpokladaná výška investície: ${formattedCost} € za ${cellValue} kWp systém`;
                });
            }
        };
    
        reader.readAsArrayBuffer(file);
    }
    
    function calculateSeasonAverages(data, monthIndices) {
        // `data` is an array of rows, each row is an array representing a row in the worksheet
        // `monthIndices` is an array of the column indices corresponding to the months of the season
        return data.map(row => {
            const monthValues = monthIndices.map(monthIdx => row[monthIdx + 1] || 0); // +1 due to zero-indexing in JS arrays
            const sum = monthValues.reduce((a, b) => a + b, 0);
            const average = sum / monthValues.length;
            return average; // Return the average for this hour across the specified months
        });
    }

    function getApplianceConsumptionData(tableId) {
        // Extract data from the table's footer to create the appliance consumption dataset
        const table = document.getElementById(tableId);
        const tfoot = table.querySelector('tfoot tr');
        return Array.from(tfoot.cells).slice(1, -1).map(cell => parseInt(cell.textContent) || 0);
    }

    const demoImage = document.querySelector('.demoImage');
    const demoContent = document.getElementById('demoContent');
    let hideTimeout;

    demoImage.addEventListener('mouseenter', function() {
        // Clear any existing timeout to avoid hiding when not needed
        clearTimeout(hideTimeout);

        const rect = this.getBoundingClientRect();
        demoContent.style.display = 'flex';
        demoContent.style.zIndex = '10'; // Ensure it's above demoImage

        // Apply dynamic max-width based on viewport width
        demoContent.style.maxWidth = window.innerWidth < 1500 ? '70vw' : '50vw';

        // Calculate distance from the viewport's right edge to the demoImage's right edge
        const rightDistance = window.innerWidth - rect.right;
        demoContent.style.right = `${rightDistance}px`;
        demoContent.style.top = `${rect.top}px`;

        // Use requestAnimationFrame for a smooth opacity transition
        requestAnimationFrame(() => {
            demoContent.style.opacity = '1';
            demoContent.style.visibility = 'visible';
        });

        // Start a timer that will hide demoContent if the mouse doesn't enter it
        hideTimeout = setTimeout(() => {
            if (demoContent.matches(':hover') === false) {
                demoContent.style.opacity = '0';
                demoContent.style.visibility = 'hidden';
            }
        }, 750); 
    });

    demoContent.addEventListener('mouseenter', function() {
        // If the mouse enters demoContent, clear the hide timeout
        clearTimeout(hideTimeout);
    });

    demoContent.addEventListener('mouseleave', function() {
        // If the mouse leaves demoContent, start the fade-out effect
        demoContent.style.opacity = '0';
        demoContent.style.visibility = 'hidden';
    });

    demoContent.addEventListener('transitionend', (event) => {
        if (event.propertyName === 'opacity' && demoContent.style.opacity === '0') {
            // Once the fade-out transition is completed, hide the content
            demoContent.style.display = 'none';
        }
    });

    // Helper function to move the cursor within a cell
    function moveCursorWithinCell(cell, direction) {
        // Directly navigate if the cell is empty
        if (cell.textContent.trim() === '') {
            navigateToNextCell(cell, direction);
            return;
        }
    
        const sel = document.getSelection();
        if (!sel.rangeCount) return;
    
        const range = sel.getRangeAt(0);
        const boundaryNode = direction === 'right' ? range.endContainer : range.startContainer;
        const boundaryOffset = direction === 'right' ? range.endOffset : range.startOffset;
    
        // Checking if we're at the start or end of the cell's content
        const atEnd = direction === 'right' && boundaryNode.nodeType === Node.TEXT_NODE && boundaryOffset === boundaryNode.length;
        const atStart = direction === 'left' && boundaryOffset === 0;
    
        if (atEnd || atStart) {
            navigateToNextCell(cell, direction);
        }
    }
    
        // Helper function to navigate to the next/previous cell
    function navigateToNextCell(currentCell, direction) {
        const row = currentCell.parentNode;
        const cells = Array.from(row.cells);
        const currentIndex = cells.indexOf(currentCell);

        let nextIndex;
        switch (direction) {
            case 'right':
                nextIndex = currentIndex + 1 === cells.length ? 0 : currentIndex + 1;
                break;
            case 'left':
                nextIndex = currentIndex - 1 < 0 ? cells.length - 1 : currentIndex - 1;
                break;
            case 'up':
            case 'down':
                return navigateToNextRow(row, direction); // Delegate vertical navigation
        }

        // Focus the next cell if possible
        const nextCell = cells[nextIndex];
        if (nextCell && nextCell.contentEditable === 'true') {
            nextCell.focus(); // Ensure the next cell is focused
            const range = document.createRange();
            const sel = window.getSelection();
            range.setStart(nextCell, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }

    
    function navigateToNextRow(currentCell, direction) {
        const currentRow = currentCell.parentNode;
        const tableBody = currentRow.parentNode;
        const currentRowIndex = Array.from(tableBody.rows).indexOf(currentRow);
        let targetRow;
    
        if (direction === 'up') {
            // Check if there's a row above the current row
            targetRow = currentRowIndex > 0 ? tableBody.rows[currentRowIndex - 1] : null;
        } else if (direction === 'down') {
            // Check if there's a row below the current row
            targetRow = currentRowIndex < tableBody.rows.length - 1 ? tableBody.rows[currentRowIndex + 1] : null;
        }
    
        if (targetRow) {
            const targetCell = targetRow.cells[currentCell.cellIndex];
            if (targetCell && targetCell.contentEditable === 'true') {
                targetCell.focus();
                // Create a range to select the content of the target cell
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(targetCell);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }

    const button = document.getElementById('addAppliance');
    const initialTop = button.offsetTop; // Initial top offset of the button

    window.addEventListener('scroll', () => {
        // Calculate the difference between the current scroll position and initial button top
        const scrolledHeight = window.scrollY;
        
        // Apply a factor to slow down the movement speed relative to the scroll
        // This creates a subtle effect, as opposed to directly reversing the scroll
        const moveFactor = 1;
        let topPosition = initialTop - (scrolledHeight * moveFactor);
        
        // Optionally, you can limit the button's movement to ensure it doesn't go off-screen
        // For example, keep `topPosition` within a certain range
        topPosition = Math.max(topPosition, 10); // Replace 10 with the minimum `top` value you want
        
        button.style.position = 'fixed'; // Make sure button is fixed if not already
        button.style.top = `${topPosition}px`;
    });
    
    function setFocusAndCursorPosition(cell) {
        // Focus the cell first
        cell.focus();
    
        // Use window.getSelection() to obtain the current selection
        const selection = window.getSelection();
    
        // Check if the cell has any text content. If not, no need to create a range
        if (!cell.textContent) {
            return; // Already focused and empty, ready for input
        }
    
        // Create a new range
        const range = document.createRange();
    
        // Set the start and end of the range to the end of the cell's content
        range.selectNodeContents(cell);
        range.collapse(false); // false collapses the range to its end; true would collapse it to its start
    
        // Remove any selections and add the new range
        selection.removeAllRanges();
        selection.addRange(range);
    }
   
});
