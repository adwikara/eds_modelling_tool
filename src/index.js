let {PythonShell} = require('python-shell');
const electron = require('electron')
const path = require('path')
const BrowserWindow = electron.remote.BrowserWindow
const axios = require('axios');
var Plotly = require('plotly.js-dist')

/* New Window Feature To Display Formula Sheet */
const helpBtn = document.getElementById('helpBtn');
helpBtn.addEventListener('click', () => {
    const modalPath = path.join('file://', __dirname, 'help.html')
    let helpWin = new BrowserWindow({
        width: 600,
        height: 550,
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

/* Front-End Elements from DOM*/
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
ppa = document.getElementById("ppa")
inputSpecs = [latitude, longitude, sysCap, waterCost, ppa, edsSLR, regSLR, edsFreq, waterFreq, edsCleanFreq]

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
// constants
const year = 2018
const api = 'qcS1rONVybE6Gtw1heDE0dFatuaHBmoVozd1weZX'
const attributes = 'ghi,dhi,dni,wind_speed,air_temperature'
const leapYear = 'false'
const interval = '60'
const utc = 'false'
const name = 'Aditya+Wikara'
const reason = 'academic+research'
const affiliation = 'Boston+University'
const email = 'adwikara@bu.edu'
const mailingList = 'false'

const invEff = 0.96 //4 percent of losses due to inverter
const losses = 0.86 //14 percent of other losses
const waterCleanEff = 0.99 //99% restoration after water cleaning
const length = 365 // modelling duration
const gstc = 1 //1kW/m2

// global backend variables
let backend = true
let gpoaAnnualDaily = []
let annualEnergyEds = []
let annualEnergyReg = []
let edsProfit
let regProfit
let edsWaterVol
let regWaterVol
let edsWaterCost
let regWaterCost
let edsPR 
let regPR 
let edsPRDaily = []
let regPRDaily = []
let date = []
let ghi = []
let dhi = []
let dni = []
let wind = []
let temp = []

let results = "";

/* Back-End Functions */
// get data for irradiance table
function getTableData(latitude, longitude) {
    // get todays date
    let now = new Date();
    let start = new Date(now.getFullYear(), 0, 0);
    let diff = now - start;
    let oneDay = 1000 * 60 * 60 * 24;
    let day = Math.floor(diff / oneDay);

    // get the index for the daily irradiance data
    let dayEnd = day * 24
    let dayStart = dayEnd - 24

    // get the irradiance data from the API
    let rawData
    latitude = parseFloat(latitude.value)
    longitude = parseFloat(longitude.value)

    let url = `http://developer.nrel.gov/api/solar/nsrdb_psm3_download.csv?wkt=POINT(${longitude}%20${latitude})&names=${year}&leap_day=${leapYear}&interval=${interval}&utc=${utc}&full_name=${name}&email=${email}&affiliation=${affiliation}&mailing_list=${mailingList}&reason=${reason}&api_key=${api}&attributes=${attributes}`
    axios.get(url)
    .then((response) => {
        rawData = response.data
        rawData = rawData.split("\n")
        rawData.pop()
        rawData.splice(0,3)
    });

    // return a promise
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            let counter = 0
            let sum = 0
            
            //check if coordinates is correct, error check backend
            if (rawData == undefined) {
                errorCheckBackend()
                backend = false
                resolve()
            } else {
                // categorize the daily irradiance data
                for (i=dayStart; i < dayEnd; i++) {
                    data = rawData[i].split(',')
                    date.push(data[0] + "-" + ('0' + data[1]).slice(-2) + "-" + ('0' + data[2]).slice(-2) + " " + ('0' + data[3]).slice(-2) + ":" + "00")
                    ghi.push(data[5])
                    dhi.push(data[6])
                    dni.push(data[7])
                    wind.push(parseFloat(data[8]).toLocaleString())
                    temp.push(parseFloat(data[9]).toLocaleString())
                }
                const error = false;
                if(!error) {
                    resolve()
                } else {
                    reject('Error: Something went wrong')
                }
            }


        }, 9000);
    });

}

// create the table
function createTable(date, ghi, dhi, dni, wind, temp) {
    tableContents = `
        <table border="1" class="dataframe">
            <thead>
                <tr style="text-align: right;">
                <th></th>
                <th>GHI</th>
                <th>DHI</th>
                <th>DNI</th>
                <th>Wind Speed</th>
                <th>Temperature</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <th>${date[0]}</th>
                    <td>${ghi[0]}</td>
                    <td>${dhi[0]}</td>
                    <td>${dni[0]}</td>
                    <td>${wind[0]}</td>
                    <td>${temp[0]}</td>
                </tr>
                <tr>
                    <th>${date[1]}</th>
                    <td>${ghi[1]}</td>
                    <td>${dhi[1]}</td>
                    <td>${dni[1]}</td>
                    <td>${wind[1]}</td>
                    <td>${temp[1]}</td>
                </tr>
                <tr>
                    <th>${date[2]}</th>
                    <td>${ghi[2]}</td>
                    <td>${dhi[2]}</td>
                    <td>${dni[2]}</td>
                    <td>${wind[2]}</td>
                    <td>${temp[2]}</td>
                </tr>
                <tr>
                    <th>${date[3]}</th>
                    <td>${ghi[3]}</td>
                    <td>${dhi[3]}</td>
                    <td>${dni[3]}</td>
                    <td>${wind[3]}</td>
                    <td>${temp[3]}</td>
                </tr>
                <tr>
                    <th>${date[4]}</th>
                    <td>${ghi[4]}</td>
                    <td>${dhi[4]}</td>
                    <td>${dni[4]}</td>
                    <td>${wind[4]}</td>
                    <td>${temp[4]}</td>
                </tr>
                <tr>
                    <th>${date[5]}</th>
                    <td>${ghi[5]}</td>
                    <td>${dhi[5]}</td>
                    <td>${dni[5]}</td>
                    <td>${wind[5]}</td>
                    <td>${temp[5]}</td>
                </tr>
                <tr>
                    <th>${date[6]}</th>
                    <td>${ghi[6]}</td>
                    <td>${dhi[6]}</td>
                    <td>${dni[6]}</td>
                    <td>${wind[6]}</td>
                    <td>${temp[6]}</td>
                </tr>
                <tr>
                    <th>${date[7]}</th>
                    <td>${ghi[7]}</td>
                    <td>${dhi[7]}</td>
                    <td>${dni[7]}</td>
                    <td>${wind[7]}</td>
                    <td>${temp[7]}</td>
                </tr>
                <tr>
                    <th>${date[8]}</th>
                    <td>${ghi[8]}</td>
                    <td>${dhi[8]}</td>
                    <td>${dni[8]}</td>
                    <td>${wind[8]}</td>
                    <td>${temp[8]}</td>
                </tr>
                <tr>
                    <th>${date[9]}</th>
                    <td>${ghi[9]}</td>
                    <td>${dhi[9]}</td>
                    <td>${dni[9]}</td>
                    <td>${wind[9]}</td>
                    <td>${temp[9]}</td>
                </tr>
                <tr>
                    <th>${date[10]}</th>
                    <td>${ghi[10]}</td>
                    <td>${dhi[10]}</td>
                    <td>${dni[10]}</td>
                    <td>${wind[10]}</td>
                    <td>${temp[10]}</td>
                </tr>
                <tr>
                    <th>${date[11]}</th>
                    <td>${ghi[11]}</td>
                    <td>${dhi[11]}</td>
                    <td>${dni[11]}</td>
                    <td>${wind[11]}</td>
                    <td>${temp[11]}</td>
                </tr>
                <tr>
                    <th>${date[12]}</th>
                    <td>${ghi[12]}</td>
                    <td>${dhi[12]}</td>
                    <td>${dni[12]}</td>
                    <td>${wind[12]}</td>
                    <td>${temp[12]}</td>
                </tr>
                <tr>
                    <th>${date[13]}</th>
                    <td>${ghi[13]}</td>
                    <td>${dhi[13]}</td>
                    <td>${dni[13]}</td>
                    <td>${wind[13]}</td>
                    <td>${temp[13]}</td>
                </tr>
                <tr>
                    <th>${date[14]}</th>
                    <td>${ghi[14]}</td>
                    <td>${dhi[14]}</td>
                    <td>${dni[14]}</td>
                    <td>${wind[14]}</td>
                    <td>${temp[14]}</td>
                </tr>
                <tr>
                    <th>${date[15]}</th>
                    <td>${ghi[15]}</td>
                    <td>${dhi[15]}</td>
                    <td>${dni[15]}</td>
                    <td>${wind[15]}</td>
                    <td>${temp[15]}</td>
                </tr>
                <tr>
                    <th>${date[16]}</th>
                    <td>${ghi[16]}</td>
                    <td>${dhi[16]}</td>
                    <td>${dni[16]}</td>
                    <td>${wind[16]}</td>
                    <td>${temp[16]}</td>
                </tr>
                <tr>
                    <th>${date[17]}</th>
                    <td>${ghi[17]}</td>
                    <td>${dhi[17]}</td>
                    <td>${dni[17]}</td>
                    <td>${wind[17]}</td>
                    <td>${temp[17]}</td>
                </tr>
                <tr>
                    <th>${date[18]}</th>
                    <td>${ghi[18]}</td>
                    <td>${dhi[18]}</td>
                    <td>${dni[18]}</td>
                    <td>${wind[18]}</td>
                    <td>${temp[18]}</td>
                </tr>
                <tr>
                    <th>${date[19]}</th>
                    <td>${ghi[19]}</td>
                    <td>${dhi[19]}</td>
                    <td>${dni[19]}</td>
                    <td>${wind[19]}</td>
                    <td>${temp[19]}</td>
                </tr>
                <tr>
                    <th>${date[20]}</th>
                    <td>${ghi[20]}</td>
                    <td>${dhi[20]}</td>
                    <td>${dni[20]}</td>
                    <td>${wind[20]}</td>
                    <td>${temp[20]}</td>
                </tr>
                <tr>
                    <th>${date[21]}</th>
                    <td>${ghi[21]}</td>
                    <td>${dhi[21]}</td>
                    <td>${dni[21]}</td>
                    <td>${wind[21]}</td>
                    <td>${temp[21]}</td>
                </tr>
                <tr>
                    <th>${date[22]}</th>
                    <td>${ghi[22]}</td>
                    <td>${dhi[22]}</td>
                    <td>${dni[22]}</td>
                    <td>${wind[22]}</td>
                    <td>${temp[22]}</td>
                </tr>
                <tr>
                    <th>${date[23]}</th>
                    <td>${ghi[23]}</td>
                    <td>${dhi[23]}</td>
                    <td>${dni[23]}</td>
                    <td>${wind[23]}</td>
                    <td>${temp[23]}</td>
                </tr>
            </tbody>
        </table>
    `
    return tableContents
}

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

// Getting daily irradiance data in kW/m2, in an array
function getGpoaDaily(latitude,longitude) {
    let results
    let sample
    latitude = parseFloat(latitude.value)
    longitude = parseFloat(longitude.value)

    let url = `http://developer.nrel.gov/api/solar/nsrdb_psm3_download.csv?wkt=POINT(${longitude}%20${latitude})&names=${year}&leap_day=${leapYear}&interval=${interval}&utc=${utc}&full_name=${name}&email=${email}&affiliation=${affiliation}&mailing_list=${mailingList}&reason=${reason}&api_key=${api}&attributes=${attributes}`
    axios.get(url)
    .then((response) => {
        sample = response.data
        sample = sample.split("\n")
        sample.pop()
        sample.splice(0,3)
        results = response.data
        results = results.split("\n")
        results.pop()
        results.splice(0,3)
    });

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log(sample)
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
            annualEnergyReg.push(result*parseFloat(gpoaAnnualDaily[i])*sysCap*invEff*losses)
            edsCounter = 0
        } else {
            edsCounter = edsCounter + 1
            result = result * regSLR
            annualEnergyReg.push(result*parseFloat(gpoaAnnualDaily[i])*sysCap*invEff*losses)
        }
    }
}

function getArraySum(array) {
    sum = 0
    for (let i =0; i < array.length; i++) {
        if (isNaN(array[i])) {
            sum = sum + 0
        } else {
            sum = sum + array[i]
        }
    }
    return sum
}

function getEconData(ppa, edsSLR, regSLR) {
    // handle the inputs
    edsSLR = parseFloat(edsSLR.value)
    regSLR = parseFloat(regSLR.value)
    ppa = parseFloat(ppa.value)
    edsSLR = edsSLR/100
    regSLR = regSLR/100

    // constants
    const solarToElec = 0.18
    const lifetime = 25
    const avgSunHours = 5.83

    // calculate the profit
    edsProfit = (edsSLR * solarToElec * avgSunHours * ppa * 365 * lifetime).toFixed(3)
    regProfit = (regSLR * solarToElec * avgSunHours * ppa * 365 * lifetime).toFixed(3)
}

function getWaterData(sysCap, waterCost, waterFreq, edsCleanFreq) {
    // handle the inputs
    sysCap = parseFloat(sysCap.value)
    waterCost = parseFloat(waterCost.value)
    waterFreq = parseFloat(waterFreq.value)
    edsCleanFreq = parseFloat(edsCleanFreq.value)

    // costants
    washRate = 2 //litres per m2 wash
    sizeRate = 10 //10m2 per 1kWp

    // calculate the water data
    edsWaterVol = sysCap * sizeRate * washRate * (365/edsCleanFreq)
    regWaterVol = sysCap * sizeRate * washRate * (365/waterFreq)
    edsWaterCost = edsWaterVol * waterCost
    regWaterCost = regWaterVol * waterCost
}

function getPRData(sysCap) {
    // handle inputs
    sysCap = parseInt(sysCap.value)

    // constants
    let A = [];

    for (let i=0; i < gpoaAnnualDaily.length; i++) {
        A.push((gpoaAnnualDaily[i]*sysCap)/gstc)
    }

    // calculating the average PR for EDS and Reg plant
    edsEnergySum = getArraySum(annualEnergyEds)
    regEnergySum = getArraySum(annualEnergyReg)

    edsPR = (edsEnergySum/getArraySum(A))*100
    regPR = (regEnergySum/getArraySum(A))*100

    // calculating the daily PR for EDS and Reg plant
    for (let i=0; i < 365; i++) {
        edsPRDaily.push(100*(annualEnergyEds[i]/A[i]))
        regPRDaily.push(100*(annualEnergyReg[i]/A[i]))
    }

}

function plotPR(prTitle, prAvg, prDaily) {
    let days = []
    let prAvgArray = []
    for (i = 0; i < 365; i++) {
        prAvgArray.push(prAvg)
        days.push(i+1)
    }

    let plot1 = {
        x: days,
        y: prAvgArray,
        name: 'Avg PR',
        mode: 'lines',
        type: 'scatter'
    }

    let plot2 = {
        x: days,
        y: prDaily,
        name: 'Annual PR',
        mode: 'markers',
        marker: { size: 3 },
        type: 'scatter'
    }

    let layout = {
        width: 420,
        height: 420,
        title: prTitle,
        titlefont: { size: 13 },
        yaxis: {
            title: 'Performance Ratio [%]',
            range: [0, 100],
            titlefont: { size: 10 }
        },
        xaxis: {
            title: 'Number of Days',
            range: [0, 365],
            titlefont: { size: 10 }
        },
        legend: {
            x: 0.75,
            y: 0.02,
            yref: 'paper',
            font: {
              family: 'Arial, sans-serif',
              size: 10,
              color: 'grey',
            }
        }
    }
    return [[plot1, plot2], layout]
}

/* Front-End Functions */

// function when gpoa radio button is clicked
function gpoaClicked() {
    latitude.disabled = false
    longitude.disabled = false
    sysCap.disabled = true
    waterCost.disabled = true
    ppa.disabled = true
    edsSLR.disabled = true
    regSLR.disabled = true
    edsFreq.disabled = true
    waterFreq.disabled = true
    edsCleanFreq.disabled = true

    clearDisabledFields()
    state = "gpoa"
}

// function when energy radio button is clicked
function energyClicked() {
    latitude.disabled = false
    longitude.disabled = false
    sysCap.disabled = false
    waterCost.disabled = true
    ppa.disabled = true
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
    ppa.disabled = true
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
    ppa.disabled = true
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
    ppa.disabled = false
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
async function displayGPOA() {
    // check if input fields are empty
    if (errorCheckInputFields()) {
        // turn on wheel
        loadWheel[0].style.display = "block";

        // get the nsrdb data from the python script
        await getTableData(latitude, longitude)

        // turn off wheel
        loadWheel[0].style.display = "none";

        // error check backend first
        if (backend == true) {
            // create the element for the table
            let div = document.createElement('div');
            div.className = 'output-container';
            let closeBtn = createCloseBtn();
            let gpoaHeader = document.createElement("H3")
            gpoaHeader.appendChild(document.createTextNode("Today's GPOA Irradiance Projection"))
            let gpoaTable = document.createElement("div")

            // get the html for the table
            gpoaTable.innerHTML = createTable(date, ghi, dhi, dni, wind, temp)
            //gpoaTable.innerHTML = results

            // append the elements
            div.appendChild(closeBtn)
            div.appendChild(gpoaHeader)
            div.appendChild(gpoaTable)
            
            displayOutput.appendChild(div)
            
        } else {
            // don't add a new element
            backend = true
        }
        
    }
}

// function to display energy output
async function displayEnergy() {
    // check if input fields are empty
    if (errorCheckInputFields()) {
        // turn on the loading wheel
        loadWheel[0].style.display = "block";

        // get backend data
        await getEnergyData(latitude, longitude, sysCap, edsSLR, regSLR, waterFreq, edsCleanFreq)

        //turn of the loading wheel
        loadWheel[0].style.display = "none";

        // get the data to be displayed
        edsData = getArraySum(annualEnergyEds)
        regData = getArraySum(annualEnergyReg)
        energyGain = edsData - regData

        // turn off wheel
        loadWheel[0].style.display = "none";

        // create display box for the data, start with the div tag
        let div = document.createElement('div');
        div.className = 'output-container';
        
        // the close button
        let closeBtn = createCloseBtn();
        
        // the header of the display box
        let energyHeader = document.createElement("H3")
        energyHeader.appendChild(document.createTextNode("Annual Energy Generation Projection"))
        
        // the contents of the display box
        let edsHeader = document.createElement("H4")
        edsHeader.appendChild(document.createTextNode("EDS Power Plant:"))
        let edsContents = document.createElement("p");
        let edsEnergy = document.createTextNode(edsData.toLocaleString() + " kWh");
        edsContents.appendChild(edsEnergy); 
        let regHeader = document.createElement("H4")
        regHeader.appendChild(document.createTextNode("Regular Power Plant:")) 
        let regContents = document.createElement("p");
        let regEnergy = document.createTextNode(regData.toLocaleString() + " kWh");
        regContents.appendChild(regEnergy);
        let gainHeader = document.createElement("H4")
        gainHeader.appendChild(document.createTextNode("Energy Gain: "))
        let gainContents = document.createElement("p");
        let gain = document.createTextNode(energyGain.toLocaleString() + " kWh");
        gainContents.appendChild(gain);
        
        // append the elements into the div tag
        div.appendChild(closeBtn)
        div.appendChild(energyHeader)
        div.appendChild(edsHeader)
        div.appendChild(edsContents)
        div.appendChild(regHeader)
        div.appendChild(regContents)
        div.appendChild(gainHeader)
        div.appendChild(gainContents)

        // append the div tag to the main html doc
        displayOutput.appendChild(div)
        results = "";
       
    }
}

// function to display economic analysis output
function displayEcon() {
    // check if input fields are empty
    if (errorCheckInputFields()) {
        // turn on wheel
        loadWheel[0].style.display = "block";

        // backend data
        getEconData(ppa, edsSLR, regSLR)
        profitDiff = regProfit - edsProfit

        // turn off wheel
        loadWheel[0].style.display = "none";

        // create display box for the data, start with the div tag
        let div = document.createElement('div');
        div.className = 'output-container';

        // create closing button
        let closeBtn = createCloseBtn();

        // contents of the display boxs
        let econHeader = document.createElement("H3")
        econHeader.appendChild(document.createTextNode("Annual Losses Due To Soiling"))
        let edsHeader = document.createElement("H4")
        edsHeader.appendChild(document.createTextNode("EDS Power Plant:"))
        let edsContents = document.createElement("p");
        let edsEnergy = document.createTextNode("-$" + edsProfit.toLocaleString() + "/m2");
        edsContents.appendChild(edsEnergy); 
        let regHeader = document.createElement("H4")
        regHeader.appendChild(document.createTextNode("Regular Power Plant:")) 
        let regContents = document.createElement("p");
        let regEnergy = document.createTextNode("-$" + regProfit.toLocaleString() + "/m2");
        regContents.appendChild(regEnergy);
        let gainHeader = document.createElement("H4")
        gainHeader.appendChild(document.createTextNode("Cost Savings: "))
        let gainContents = document.createElement("p");
        let gain = document.createTextNode("$" + profitDiff.toLocaleString() + "/m2");
        gainContents.appendChild(gain);

        // append to div tag
        div.appendChild(closeBtn)
        div.appendChild(econHeader)
        div.appendChild(edsHeader)
        div.appendChild(edsContents)
        div.appendChild(regHeader)
        div.appendChild(regContents)
        div.appendChild(gainHeader)
        div.appendChild(gainContents)

        // append to the display box
        displayOutput.appendChild(div)
        results = "";
    }
}

// function to display economic analysis output
function displayWater() {
    // check if input fields are empty
    if (errorCheckInputFields()) {
        // turn on wheel
        loadWheel[0].style.display = "block";

        // get the nsrdb data from the python script
        getWaterData(sysCap, waterCost, waterFreq, edsCleanFreq)
        waterConserved = edsWaterVol - regWaterVol
        waterProfit = edsWaterCost - regWaterCost

        // turn off wheel
        loadWheel[0].style.display = "none";

        // create the tag for the display box
        let div = document.createElement('div');
        div.className = 'output-container';

        // create closing button
        let closeBtn = createCloseBtn();

        // create the contents of the display box
        let waterHeader = document.createElement("H3")
        waterHeader.appendChild(document.createTextNode("Annual Water Consumption and Costs"))
        let edsHeader = document.createElement("H4")
        edsHeader.appendChild(document.createTextNode("EDS Power Plant:"))
        let edsContents = document.createElement("p");
        edsContents.appendChild(document.createTextNode("Water Consumption: " + edsWaterVol.toLocaleString() + " liters"));
        edsContents.appendChild(document.createElement("br"));
        edsContents.appendChild(document.createTextNode("Water Cost: " + "$" + edsWaterCost.toLocaleString() + "/liters"));
        let regHeader = document.createElement("H4")
        regHeader.appendChild(document.createTextNode("Regular Power Plant:")) 
        let regContents = document.createElement("p");
        regContents.appendChild(document.createTextNode("Water Consumption: " + regWaterVol.toLocaleString() + " liters"));
        regContents.appendChild(document.createElement("br"));
        regContents.appendChild(document.createTextNode("Water Cost: " + "$" + regWaterCost.toLocaleString() + "/liters"));
        let gainHeader = document.createElement("H4")
        gainHeader.appendChild(document.createTextNode("Water Conservation and Cost Savings: "))
        let gainContents = document.createElement("p");
        gainContents.appendChild(document.createTextNode("Water Conserved: " + waterConserved.toLocaleString() + " liters"));
        gainContents.appendChild(document.createElement("br"));
        gainContents.appendChild(document.createTextNode("Water Cost Savings: " + "$" + waterProfit.toLocaleString() + "/liters"));

        // append elements to the tag
        div.appendChild(closeBtn)
        div.appendChild(waterHeader)
        div.appendChild(edsHeader)
        div.appendChild(edsContents)
        div.appendChild(regHeader)
        div.appendChild(regContents)
        div.appendChild(gainHeader)
        div.appendChild(gainContents)

        // append to the display box
        displayOutput.appendChild(div)
        results = "";
    }
}

// function to display energy output
async function displayPR() {
    // check if input fields are empty
    if (errorCheckInputFields()) {
        // turn on wheel
        loadWheel[0].style.display = "block";

        // get backend data
        // get the gpoa array, and energy sum data
        await getEnergyData(latitude, longitude, sysCap, edsSLR, regSLR, waterFreq, edsCleanFreq)
        getPRData(sysCap)
        prGain = edsPR - regPR

        // turn off wheel
        loadWheel[0].style.display = "none";

        // create div tag for the display box container
        let div = document.createElement('div');
        div.className = 'output-container';

        // create closing button for the display box
        let closeBtn = createCloseBtn();

        // add content elements to the display box
        let prHeader = document.createElement("H3")
        prHeader.appendChild(document.createTextNode("Annual Performance Ratio Projection"))
        let edsHeader = document.createElement("H4")
        edsHeader.appendChild(document.createTextNode("EDS Power Plant:"))
        let edsContents = document.createElement("p");
        edsContents.appendChild(document.createTextNode(edsPR.toLocaleString() + "%")); 
        let regHeader = document.createElement("H4")
        regHeader.appendChild(document.createTextNode("Regular Power Plant:")) 
        let regContents = document.createElement("p");
        regContents.appendChild(document.createTextNode(regPR.toLocaleString() + "%"));
        let gainHeader = document.createElement("H4")
        gainHeader.appendChild(document.createTextNode("PR Gain: "))
        let gainContents = document.createElement("p");
        gainContents.appendChild(document.createTextNode(prGain.toLocaleString() + "%"));
        
        // add element for plotting
        let edsPlot = document.createElement("div")
        edsPlot.id = "edsPlot"+outputCounter
        let regPlot = document.createElement("div")
        regPlot.id = "regPlot"+outputCounter

        // append elements to the div
        div.appendChild(closeBtn)
        div.appendChild(prHeader)
        div.appendChild(edsHeader)
        div.appendChild(edsContents)
        div.appendChild(regHeader)
        div.appendChild(regContents)
        div.appendChild(gainHeader)
        div.appendChild(gainContents)
        div.appendChild(edsPlot)
        div.appendChild(regPlot)

        // append div to the display box
        displayOutput.appendChild(div)
        results = "";
        
        // Add plot to the element after it is already inserted in the DOM
        edsPlotData = plotPR('Performance Ratio EDS Plant', edsPR, edsPRDaily)
        regPlotData = plotPR('Performance Ratio Regular Plant', regPR, regPRDaily)
        
        Plotly.newPlot(edsPlot.id, edsPlotData[0], edsPlotData[1]);
        Plotly.newPlot(regPlot.id, regPlotData[0], regPlotData[1]);
       
    }
}

/* Button Events */
// run the model button
resultBtn.addEventListener('click', function() {
    // reset backend variables first
    resetBackEnd()

    // run the backend
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


// refresh/clear button
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

// Function to reset global variables
function resetBackEnd() {
    gpoaAnnualDaily = []
    annualEnergyEds = []
    annualEnergyReg = []
    edsPRDaily = []
    regPRDaily = []
    date = []
    ghi = []
    dhi = []
    dni = []
    wind = []
    temp = []
}