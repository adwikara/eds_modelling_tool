let {PythonShell} = require('python-shell');
const electron = require('electron')
const path = require('path')
const BrowserWindow = electron.remote.BrowserWindow

//[42.3505, -71.1054]

// output options
gpoaOption = document.getElementById("gpoa")
energyOption = document.getElementById("energy")
prOption = document.getElementById("pr")
waterOption = document.getElementById("water")

// input specs
latitude = document.getElementById("lat")
longitude = document.getElementById("lng")
sysCap = document.getElementById("sys_cap")
waterCost = document.getElementById("water_cost")
edsSLR = document.getElementById("eds_slr")
regSLR = document.getElementById("reg_slr")
edsFreq = document.getElementById("eds_freq")
waterFreq = document.getElementById("water_freq")
edsCleanFreq = document.getElementById("eds_clean_freq")
lcoe = document.getElementById("lcoe")
inputSpecs = [latitude, longitude, sysCap, waterCost, lcoe, edsSLR, regSLR, edsFreq, waterFreq, edsCleanFreq]

// buttons
resultBtn = document.getElementById("resultBtn")
refreshBtn = document.getElementById("refreshBtn")

// output display
let state = "gpoa"
let results = "";
let outputCounter = 0;
let exitBtns = []
let data
let loadWheel = document.querySelectorAll('.loading')
displayOutput = document.getElementById("display_output")
const backendTimer = 7000 // 7 seconds


/* New Window Feature To Display Formula Sheet */
const helpBtn = document.getElementById('helpBtn');
helpBtn.addEventListener('click', () => {
    const modalPath = path.join('file://', __dirname, 'help.html')
    let helpWin = new BrowserWindow({
        width: 900,
        height: 900,
        webPreferences: {
            nodeIntegration: true
        }
    });

    helpWin.on('close', function() {helpWin=null})
    helpWin.loadURL(modalPath)
    //helpWin.webContents.openDevTools()
    helpWin.show()
});


/* FUNCTIONS */

// function when gpoa radio button is clicked
function gpoaClicked() {
    latitude.disabled = false
    longitude.disabled = false
    sysCap.disabled = true
    waterCost.disabled = true
    lcoe.disabled = true
    edsSLR.disabled = false
    regSLR.disabled = false
    edsFreq.disabled = false
    waterFreq.disabled = false
    edsCleanFreq.disabled = false

    clearDisabledFields()
    state = "gpoa"
}

// function when energy radio button is clicked
function energyClicked() {
    latitude.disabled = false
    longitude.disabled = false
    sysCap.disabled = false
    waterCost.disabled = true
    lcoe.disabled = true
    edsSLR.disabled = false
    regSLR.disabled = false
    edsFreq.disabled = false
    waterFreq.disabled = false
    edsCleanFreq.disabled = false

    clearDisabledFields()
    state = "energy"
}

// function when pr radio button is clicked
function prClicked() {
    latitude.disabled = false
    longitude.disabled = false
    sysCap.disabled = false
    waterCost.disabled = true
    lcoe.disabled = true
    edsSLR.disabled = false
    regSLR.disabled = false
    edsFreq.disabled = false
    waterFreq.disabled = false
    edsCleanFreq.disabled = false

    clearDisabledFields()
    state = "pr"
}

// function when pr radio button is clicked
function waterClicked() {
    latitude.disabled = true
    longitude.disabled = true
    sysCap.disabled = false
    waterCost.disabled = false
    lcoe.disabled = true
    edsSLR.disabled = true
    regSLR.disabled = true
    edsFreq.disabled = true
    waterFreq.disabled = false
    edsCleanFreq.disabled = false

    clearDisabledFields()
    state = "water"
}

// function when economics radio button is clicked
function econClicked() {
    latitude.disabled = true
    longitude.disabled = true
    sysCap.disabled = true
    waterCost.disabled = true
    lcoe.disabled = false
    edsSLR.disabled = false
    regSLR.disabled = false
    edsFreq.disabled = true
    waterFreq.disabled = true
    edsCleanFreq.disabled = true

    clearDisabledFields()
    state = "econ"
}

// function to clear the input fields when they are disabled
function clearDisabledFields() {
    for (i = 0; i < inputSpecs.length; i++) {
        if (inputSpecs[i].disabled) {
            inputSpecs[i].style.color = "black";
            inputSpecs[i].value = "";
        }
    }
}

// function to get backend data
function getBackendData(backendInputs) {
    var options = {
        mode: "text",
        scripPath: "./",
        args: backendInputs
    }

    let test = new PythonShell('backend.py', options);
    test.on('message', function (message) {
        results  = message
        
    });
}

// function to get irradiance data
function getTableData(backendInputs) {
    var options = {
        mode: "text",
        scripPath: "./",
        args: backendInputs
    }

    let test = new PythonShell('backend.py', options);
    test.on('message', function (message) {
        results  = results + message;
        
    });
}

// function to create close button for each display component
function createCloseBtn() {
    let closeBtn = document.createElement('button');
    closeBtn.innerHTML = "X"
    closeBtn.className = "closeBtn"
    closeBtn.setAttribute("id", outputCounter)
    exitBtns.push(closeBtn)
    closeBtn.onclick = function() {
        displayOutput.removeChild(displayOutput.childNodes[closeBtn.id-1])
        outputCounter--
        currentId = closeBtn.id
        // remove that button from the array
        for (i=0; i < exitBtns.length; i++) {
            if (exitBtns[i].id === currentId) {
                exitBtns.splice(i, 1)
            } 
        }
        // reduce all ids from buttons by 1
        for (i=0; i < exitBtns.length; i++) {
            exitBtns[i].id = i + 1;
        }
    }
    return closeBtn
}

// function to error check backend data
function errorCheckBackend() {
    let div = document.createElement('div');
    div.className = 'output-container';
    let closeBtn = createCloseBtn();
    let errorMsg = document.createElement('h3');
    errorMsg.className = 'error-msg';
    errorMsg.innerHTML = "API Data Not Available For This Location";
    errorMsg.align = "center";
    errorMsg.style.color = "red";

    div.appendChild(closeBtn)
    div.appendChild(errorMsg);     
    displayOutput.appendChild(div);
    results = ""
}

// function to error check the input fields
function errorCheckInputFields() {
    counter = false
    for (i = 0; i < inputSpecs.length; i++) {
        if (inputSpecs[i].disabled === false) {
            if (inputSpecs[i].value === "") {
                inputSpecs[i].style.color = "red";
                inputSpecs[i].value = "Please Enter Valid Input"
                counter = true
            } 
        }
    }
    if (counter) {
        return false
    } else {
        return true
    }
}

// function to clear the input fields
function clearInputFields() {
    for (i = 0; i < inputSpecs.length; i++) {
        inputSpecs[i].style.color = "black";
        inputSpecs[i].value = "";
    }
}


// function to display gpoa irradiance output
function displayGPOA() {
    // check if input fields are empty
    if (errorCheckInputFields()) {
        // turn on wheel
        loadWheel[0].style.display = "block";

        // get the nsrdb data from the python script
        getTableData([state, latitude.value, longitude.value])

        // show the table
        setTimeout(function() {
            // turn off wheel
            loadWheel[0].style.display = "none";
            // check if result was error
            if (results == "") {
                errorCheckBackend()

            } else {
                let div = document.createElement('div');
                div.className = 'output-container';
                let closeBtn = createCloseBtn();
                let gpoaHeader = document.createElement("H2")
                gpoaHeader.appendChild(document.createTextNode("Today's GPOA Irradiance Projection"))
                let gpoaTable = document.createElement("div")
                gpoaTable.innerHTML = results

                div.appendChild(closeBtn)
                div.appendChild(gpoaHeader)
                div.appendChild(gpoaTable)
                
                displayOutput.appendChild(div)
                results = "";
            }
        }, backendTimer)
    }
}

// function to display energy output
function displayEnergy() {
    // check if input fields are empty
    if (errorCheckInputFields()) {
        // turn on wheel
        loadWheel[0].style.display = "block";

        // get the nsrdb data from the python script
        getBackendData([state, latitude.value, longitude.value, sysCap.value, edsSLR.value, regSLR.value, edsFreq.value, waterFreq.value, edsCleanFreq.value])

        // display the output
        setTimeout(function() {
            // turn off wheel
            loadWheel[0].style.display = "none";

            // parse the data
            data = results.split(" ")
            edsData = parseFloat(data[0])
            regData = parseFloat(data[1])
            energyGain = edsData - regData

            // check if result was error
            if (results == "") {
                errorCheckBackend()
            } else {
                let div = document.createElement('div');
                div.className = 'output-container';

                let closeBtn = createCloseBtn();

                let energyHeader = document.createElement("H2")
                energyHeader.appendChild(document.createTextNode("Annual Energy Generation Projection"))

                let edsHeader = document.createElement("H3")
                edsHeader.appendChild(document.createTextNode("EDS Power Plant:"))
                let edsContents = document.createElement("p");
                let edsEnergy = document.createTextNode(edsData.toFixed(3) + " kWh");
                edsContents.appendChild(edsEnergy); 

                let regHeader = document.createElement("H3")
                regHeader.appendChild(document.createTextNode("Regular Power Plant:")) 
                let regContents = document.createElement("p");
                let regEnergy = document.createTextNode(regData.toFixed(3) + " kWh");
                regContents.appendChild(regEnergy);

                let gainHeader = document.createElement("H3")
                gainHeader.appendChild(document.createTextNode("Energy Gain: "))
                let gainContents = document.createElement("p");
                let gain = document.createTextNode(energyGain.toFixed(3) + " kWh");
                gainContents.appendChild(gain);

                div.appendChild(closeBtn)
                div.appendChild(energyHeader)
                div.appendChild(edsHeader)
                div.appendChild(edsContents)
                div.appendChild(regHeader)
                div.appendChild(regContents)
                div.appendChild(gainHeader)
                div.appendChild(gainContents)

                displayOutput.appendChild(div)
                results = "";
            }
        }, backendTimer)
    }
}

// function to display economic analysis output
function displayEcon() {
    // check if input fields are empty
    if (errorCheckInputFields()) {
        // turn on wheel
        loadWheel[0].style.display = "block";

        // get the nsrdb data from the python script
        getBackendData([state, edsSLR.value, regSLR.value, lcoe.value])

        // display the output
        setTimeout(function() {
            // turn off wheel
            loadWheel[0].style.display = "none";

            // parse the data
            data = results.split(" ")
            edsData = parseFloat(data[0])
            regData = parseFloat(data[1])
            profitDiff = regData - edsData

            // check if result was error
            if (results == "") {
                errorCheckBackend()
            } else {
                let div = document.createElement('div');
                div.className = 'output-container';

                let closeBtn = createCloseBtn();

                let econHeader = document.createElement("H2")
                econHeader.appendChild(document.createTextNode("Annual Losses Due To Soiling"))

                let edsHeader = document.createElement("H3")
                edsHeader.appendChild(document.createTextNode("EDS Power Plant:"))
                let edsContents = document.createElement("p");
                let edsEnergy = document.createTextNode("-$" + edsData.toFixed(3) + "/m2");
                edsContents.appendChild(edsEnergy); 

                let regHeader = document.createElement("H3")
                regHeader.appendChild(document.createTextNode("Regular Power Plant:")) 
                let regContents = document.createElement("p");
                let regEnergy = document.createTextNode("-$" + regData.toFixed(3) + "/m2");
                regContents.appendChild(regEnergy);

                let gainHeader = document.createElement("H3")
                gainHeader.appendChild(document.createTextNode("Cost Savings: "))
                let gainContents = document.createElement("p");
                let gain = document.createTextNode("$" + profitDiff.toFixed(3) + "/m2");
                gainContents.appendChild(gain);

                div.appendChild(closeBtn)
                div.appendChild(econHeader)
                div.appendChild(edsHeader)
                div.appendChild(edsContents)
                div.appendChild(regHeader)
                div.appendChild(regContents)
                div.appendChild(gainHeader)
                div.appendChild(gainContents)

                displayOutput.appendChild(div)
                results = "";
            }
        }, backendTimer)
    }
}

// function to display economic analysis output
function displayWater() {
    // check if input fields are empty
    if (errorCheckInputFields()) {
        // turn on wheel
        loadWheel[0].style.display = "block";

        // get the nsrdb data from the python script
        getBackendData([state, sysCap.value, waterCost.value, waterFreq.value, edsCleanFreq.value])

        // display the output
        setTimeout(function() {
            // turn off wheel
            loadWheel[0].style.display = "none";

            // parse the data
            data = results.split(" ")
            edsVolume = parseFloat(data[0])
            edsWaterCost = parseFloat(data[1])
            regVolume = parseFloat(data[2])
            regWaterCost = parseFloat(data[3])
            waterConserved = regVolume - edsVolume
            waterProfit = regWaterCost - edsWaterCost

            // check if result was error
            if (results == "") {
                errorCheckBackend()
            } else {
                let div = document.createElement('div');
                div.className = 'output-container';

                let closeBtn = createCloseBtn();

                let waterHeader = document.createElement("H2")
                waterHeader.appendChild(document.createTextNode("Annual Water Consumption and Costs"))

                let edsHeader = document.createElement("H3")
                edsHeader.appendChild(document.createTextNode("EDS Power Plant:"))
                let edsContents = document.createElement("p");
                edsContents.appendChild(document.createTextNode("Water Consumption: " + parseInt(edsVolume) + " liters"));
                edsContents.appendChild(document.createElement("br"));
                edsContents.appendChild(document.createTextNode("Water Cost: " + "$" + parseInt(edsWaterCost) + "/liters"));
                
                let regHeader = document.createElement("H3")
                regHeader.appendChild(document.createTextNode("Regular Power Plant:")) 
                let regContents = document.createElement("p");
                regContents.appendChild(document.createTextNode("Water Consumption: " + parseInt(regVolume) + " liters"));
                regContents.appendChild(document.createElement("br"));
                regContents.appendChild(document.createTextNode("Water Cost: " + "$" + parseInt(regWaterCost) + "/liters"));

                let gainHeader = document.createElement("H3")
                gainHeader.appendChild(document.createTextNode("Water Conservation and Cost Savings: "))
                let gainContents = document.createElement("p");
                gainContents.appendChild(document.createTextNode("Water Conserved: " + parseInt(waterConserved) + " liters"));
                gainContents.appendChild(document.createElement("br"));
                gainContents.appendChild(document.createTextNode("Water Cost Savings: " + "$" + parseInt(waterProfit) + "/liters"));

                div.appendChild(closeBtn)
                div.appendChild(waterHeader)
                div.appendChild(edsHeader)
                div.appendChild(edsContents)
                div.appendChild(regHeader)
                div.appendChild(regContents)
                div.appendChild(gainHeader)
                div.appendChild(gainContents)

                displayOutput.appendChild(div)
                results = "";
            }
        }, backendTimer)
    }
}

// function to display energy output
function displayPR() {
    // check if input fields are empty
    if (errorCheckInputFields()) {
        // turn on wheel
        loadWheel[0].style.display = "block";

        // get the nsrdb data from the python script
        getBackendData([state, latitude.value, longitude.value, sysCap.value, edsSLR.value, regSLR.value, edsFreq.value, waterFreq.value, edsCleanFreq.value])

        // display the output
        setTimeout(function() {
            // turn off wheel
            loadWheel[0].style.display = "none";

            // parse the data
            data = results.split(" ")
            edsData = parseFloat(data[0])
            regData = parseFloat(data[1])
            prGain = edsData - regData

            // check if result was error
            if (results == "") {
                errorCheckBackend()
            } else {
                let div = document.createElement('div');
                div.className = 'output-container';

                let closeBtn = createCloseBtn();

                let prHeader = document.createElement("H2")
                prHeader.appendChild(document.createTextNode("Annual Performance Ratio Projection"))

                let edsHeader = document.createElement("H3")
                edsHeader.appendChild(document.createTextNode("EDS Power Plant:"))
                let edsContents = document.createElement("p");
                let edsEnergy = document.createTextNode(edsData + "%");
                edsContents.appendChild(edsEnergy); 

                let regHeader = document.createElement("H3")
                regHeader.appendChild(document.createTextNode("Regular Power Plant:")) 
                let regContents = document.createElement("p");
                let regEnergy = document.createTextNode(regData + "%");
                regContents.appendChild(regEnergy);

                let gainHeader = document.createElement("H3")
                gainHeader.appendChild(document.createTextNode("PR Gain: "))
                let gainContents = document.createElement("p");
                let gain = document.createTextNode(prGain.toFixed(2) + "%");
                gainContents.appendChild(gain);

                let prPlots = document.createElement("div")
                prPlots.className = "plot-format"
                let edsPlot = document.createElement("img")
                edsPlot.src = "./img/PR_eds_plot.png"
                let regPlot = document.createElement("img")
                regPlot.src = "./img/PR_reg_plot.png"
                prPlots.appendChild(edsPlot)
                prPlots.appendChild(regPlot)

                div.appendChild(closeBtn)
                div.appendChild(prHeader)
                div.appendChild(edsHeader)
                div.appendChild(edsContents)
                div.appendChild(regHeader)
                div.appendChild(regContents)
                div.appendChild(gainHeader)
                div.appendChild(gainContents)
                div.appendChild(prPlots)

                displayOutput.appendChild(div)
                results = "";
            }
        }, backendTimer)
    }
}

/* Button Events */

// run the model button
resultBtn.addEventListener('click', function() {
    if (state == "gpoa") {
        displayGPOA()
    } else if (state == "energy") {
        displayEnergy()
    } else if (state == "econ") {
        displayEcon()
    } else if (state == "water") {
        displayWater()
    } else if (state == "pr") {
        displayPR()
    } else {
        // do something
    }
    // increment outputCounter
    outputCounter++;
})


// refresh button
refreshBtn.addEventListener('click', function() {
    // get current component list
    components = displayOutput.childNodes.length
    // check if there is any output display components
    if (displayOutput.childNodes.length === 0) {
        clearInputFields()
    } else {
        for (i=0; i < components; i++) {
            displayOutput.removeChild(displayOutput.childNodes[0])
        }
    }
    // reset output counter
    outputCounter = 0;
    exitBtns = [];
});