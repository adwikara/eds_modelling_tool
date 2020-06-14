let {PythonShell} = require('python-shell');
const electron = require('electron')
const path = require('path')
const BrowserWindow = electron.remote.BrowserWindow
const axios = require('axios');

//[42.3505, -71.1054]
/* New Window Feature To Display Formula Sheet */
const helpBtn = document.getElementById('helpBtn');
helpBtn.addEventListener('click', () => {
    const modalPath = path.join('file://', __dirname, 'help.html')
    let helpWin = new BrowserWindow({
        width: 900,
        height: 870,
        webPreferences: {
            nodeIntegration: true
        }
    });

    helpWin.on('close', function() {helpWin=null})
    helpWin.loadURL(modalPath)
    //helpWin.webContents.openDevTools()
    helpWin.show()
});

/*Main Window*/

/* Front-End Declarations*/
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
let outputCounter = 0;
let exitBtns = []
let data
let loadWheel = document.querySelectorAll('.loading')
displayOutput = document.getElementById("display_output")
const backendTimer = 11000 // 8 seconds

/* Back-End Declarations*/
let year = 2018
let api = 'qcS1rONVybE6Gtw1heDE0dFatuaHBmoVozd1weZX'
let attributes = 'ghi,dhi,dni,wind_speed,air_temperature'
let leapYear = 'false'
let interval = '60'
let utc = 'false'
let name = 'Aditya+Wikara'
let reason = 'academic+research'
let affiliation = 'Boston+University'
let email = 'adwikara@bu.edu'
let mailingList = 'false'

let invEff = 0.96 //4 percent of losses due to inverter
let losses = 0.86 //14 percent of other losses
let waterCleanEff = 0.99 //99% restoration after water cleaning
let length = 365

let gpoaAnnualDaily = []
let annualEnergyEds = []
let annualEnergyReg = []

//let results = "";

/* Back-End Functions */
// function to get GPOA hourly data in watts
function getGpoaHourly(latitude,longitude) {
    let results
    let gpoaAnnualHourly = []
    latitude = parseFloat(latitude.value)
    longitude = parseFloat(longitude.value)
    let url = `http://developer.nrel.gov/api/solar/nsrdb_psm3_download.csv?wkt=POINT(${longitude}%20${latitude})&names=${year}&leap_day=${leapYear}&interval=${interval}&utc=${utc}&full_name=${name}&email=${email}&affiliation=${affiliation}&mailing_list=${mailingList}&reason=${reason}&api_key=${api}&attributes=${attributes}`
    axios.get(url)
    .then((response) => {
        results = response.data
        results = results.split("\n")
        results.pop()
        results.splice(0,3)
    });

    setTimeout(function() {
        for (i=0; i < 8760; i++) {
            data = results[i].split(',')
            gpoaAnnualHourly.push(data[5])
        }

    }, 9000)

    return gpoaAnnualHourly
}

function getGpoaDaily(latitude,longitude) {
    let results
    latitude = parseFloat(latitude.value)
    longitude = parseFloat(longitude.value)

    let url = `http://developer.nrel.gov/api/solar/nsrdb_psm3_download.csv?wkt=POINT(${longitude}%20${latitude})&names=${year}&leap_day=${leapYear}&interval=${interval}&utc=${utc}&full_name=${name}&email=${email}&affiliation=${affiliation}&mailing_list=${mailingList}&reason=${reason}&api_key=${api}&attributes=${attributes}`
    axios.get(url)
    .then((response) => {
        results = response.data
        results = results.split("\n")
        results.pop()
        results.splice(0,3)
    });

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            let counter = 0
            let sum = 0

            for (i=0; i < 8760; i++) {
                data = results[i].split(',')
                if (counter == 23) {
                    gpoaAnnualDaily.push(sum/1000)
                    sum = 0
                    counter = 0
                } else {
                    sum = sum + parseFloat(data[5])
                    counter = counter + 1
                }
            }
            const error = false;
            if(!error) {
                resolve()
            } else {
                reject('Error: Something went wrong')
            }

        }, 9000);
    });
}

async function getEnergyData(latitude, longitude, sysCap, edsSLR, regSLR, waterFreq, edsCleanFreq) {
    sysCap = parseInt(sysCap.value)
    edsSLR = parseFloat(edsSLR.value)
    regSLR = parseFloat(regSLR.value)
    waterFreq = parseInt(waterFreq.value)
    edsCleanFreq = parseInt(edsCleanFreq.value)

    await getGpoaDaily(latitude, longitude)

    edsSLR = 1 - (edsSLR/100)
    regSLR = 1 - (regSLR/100)
    edsCounter = 0
    result = 1.00

    // updates the eds energy data
    for (let i=0; i < gpoaAnnualDaily.length; i++) {
        if (edsCounter == edsCleanFreq-1) {
            result = waterCleanEff
            annualEnergyEds.push(result*parseFloat(gpoaAnnualDaily[i])*sysCap*invEff*losses)
            edsCounter = 0
        } else {
            edsCounter = edsCounter + 1
            result = result * edsSLR
            annualEnergyEds.push(result*parseFloat(gpoaAnnualDaily[i])*sysCap*invEff*losses)
        }
    }

    edsCounter = 0
    result = 1.00
    // updates the regular energy data
    for (let i=0; i < gpoaAnnualDaily.length; i++) {
        if (edsCounter == waterFreq-1) {
            result = waterCleanEff
            annualEnergyReg.push(result*parseFloat(annualEnergyReg[i])*sysCap*invEff*losses)
            edsCounter = 0
        } else {
            edsCounter = edsCounter + 1
            result = result * regSLR
            annualEnergyReg.push(result*parseFloat(gpoaAnnualDaily[i])*sysCap*invEff*losses)
        }
    }
}

function getEnergySum(energy) {
    sum = 0
    for (let i =0; i < energy.length; i++) {
        if (isNaN(energy[i])) {
            sum = sum + 0
        } else {
            sum = sum + energy[i]
        }
    }
    return sum
}


/* Front-End Functions */


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
        pythonPath: "/usr/local/bin/python",
        scripPath: "./",
        args: backendInputs
    }
    const modalPath = path.join(__dirname, '/backend.py')
    let test = new PythonShell(modalPath, options);
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

    const modalPath = path.join(__dirname, '/backend.py')
    let test = new PythonShell(modalPath, options);
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
        results = "";
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
    errorMsg.innerHTML = "An Error Has Occured (Please remember to use only US coordinates)";
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
                let gpoaHeader = document.createElement("H3")
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
async function displayEnergy() {s
    // check if input fields are empty
    if (errorCheckInputFields()) {
        // turn on wheel
        loadWheel[0].style.display = "block";

        // get backend data
        await getEnergyData(latitude, longitude, sysCap, edsSLR, regSLR, waterFreq, edsCleanFreq)
        loadWheel[0].style.display = "none";
        //inputSpecs = [latitude, longitude, sysCap, waterCost, lcoe, edsSLR, regSLR, edsFreq, waterFreq, edsCleanFreq]

        edsData = getEnergySum(annualEnergyEds)
        regData = getEnergySum(annualEnergyReg)
        energyGain = edsData - regData

        // turn off wheel
        loadWheel[0].style.display = "none";

        // new code
        let div = document.createElement('div');
        div.className = 'output-container';

        let closeBtn = createCloseBtn();

        let energyHeader = document.createElement("H3")
        energyHeader.appendChild(document.createTextNode("Annual Energy Generation Projection"))

        let edsHeader = document.createElement("H4")
        edsHeader.appendChild(document.createTextNode("EDS Power Plant:"))
        let edsContents = document.createElement("p");
        let edsEnergy = document.createTextNode(edsData.toFixed(3) + " kWh");
        edsContents.appendChild(edsEnergy); 

        let regHeader = document.createElement("H4")
        regHeader.appendChild(document.createTextNode("Regular Power Plant:")) 
        let regContents = document.createElement("p");
        let regEnergy = document.createTextNode(regData.toFixed(3) + " kWh");
        regContents.appendChild(regEnergy);

        let gainHeader = document.createElement("H4")
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



        /*
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

                let energyHeader = document.createElement("H3")
                energyHeader.appendChild(document.createTextNode("Annual Energy Generation Projection"))

                let edsHeader = document.createElement("H4")
                edsHeader.appendChild(document.createTextNode("EDS Power Plant:"))
                let edsContents = document.createElement("p");
                let edsEnergy = document.createTextNode(edsData.toFixed(3) + " kWh");
                edsContents.appendChild(edsEnergy); 

                let regHeader = document.createElement("H4")
                regHeader.appendChild(document.createTextNode("Regular Power Plant:")) 
                let regContents = document.createElement("p");
                let regEnergy = document.createTextNode(regData.toFixed(3) + " kWh");
                regContents.appendChild(regEnergy);

                let gainHeader = document.createElement("H4")
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
        */
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

                let econHeader = document.createElement("H3")
                econHeader.appendChild(document.createTextNode("Annual Losses Due To Soiling"))

                let edsHeader = document.createElement("H4")
                edsHeader.appendChild(document.createTextNode("EDS Power Plant:"))
                let edsContents = document.createElement("p");
                let edsEnergy = document.createTextNode("-$" + edsData.toFixed(3) + "/m2");
                edsContents.appendChild(edsEnergy); 

                let regHeader = document.createElement("H4")
                regHeader.appendChild(document.createTextNode("Regular Power Plant:")) 
                let regContents = document.createElement("p");
                let regEnergy = document.createTextNode("-$" + regData.toFixed(3) + "/m2");
                regContents.appendChild(regEnergy);

                let gainHeader = document.createElement("H4")
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

                let waterHeader = document.createElement("H3")
                waterHeader.appendChild(document.createTextNode("Annual Water Consumption and Costs"))

                let edsHeader = document.createElement("H4")
                edsHeader.appendChild(document.createTextNode("EDS Power Plant:"))
                let edsContents = document.createElement("p");
                edsContents.appendChild(document.createTextNode("Water Consumption: " + parseInt(edsVolume) + " liters"));
                edsContents.appendChild(document.createElement("br"));
                edsContents.appendChild(document.createTextNode("Water Cost: " + "$" + parseInt(edsWaterCost) + "/liters"));
                
                let regHeader = document.createElement("H4")
                regHeader.appendChild(document.createTextNode("Regular Power Plant:")) 
                let regContents = document.createElement("p");
                regContents.appendChild(document.createTextNode("Water Consumption: " + parseInt(regVolume) + " liters"));
                regContents.appendChild(document.createElement("br"));
                regContents.appendChild(document.createTextNode("Water Cost: " + "$" + parseInt(regWaterCost) + "/liters"));

                let gainHeader = document.createElement("H4")
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

                let prHeader = document.createElement("H3")
                prHeader.appendChild(document.createTextNode("Annual Performance Ratio Projection"))

                let edsHeader = document.createElement("H4")
                edsHeader.appendChild(document.createTextNode("EDS Power Plant:"))
                let edsContents = document.createElement("p");
                let edsEnergy = document.createTextNode(edsData + "%");
                edsContents.appendChild(edsEnergy); 

                let regHeader = document.createElement("H4")
                regHeader.appendChild(document.createTextNode("Regular Power Plant:")) 
                let regContents = document.createElement("p");
                let regEnergy = document.createTextNode(regData + "%");
                regContents.appendChild(regEnergy);

                let gainHeader = document.createElement("H4")
                gainHeader.appendChild(document.createTextNode("PR Gain: "))
                let gainContents = document.createElement("p");
                let gain = document.createTextNode(prGain.toFixed(2) + "%");
                gainContents.appendChild(gain);

                let prPlots = document.createElement("div")
                prPlots.className = "plot-format"
                let edsPlot = document.createElement("img")
                edsPlot.src = path.join(__dirname, '/pr_plots/PR_eds_plot.png')
                let regPlot = document.createElement("img")
                regPlot.src = path.join(__dirname, '/pr_plots/PR_reg_plot.png')
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
    results = "";
});