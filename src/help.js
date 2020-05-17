
// get the image div tags from the html
gpoaImg = document.getElementById("gpoa-formula")
energyImg = document.getElementById("energy-formula")
prImg = document.getElementById("pr-formula")
waterImg = document.getElementById("water-formula")
econImg = document.getElementById("econ-formula")

// function when gpoa radio button is clicked
function gpoaClicked() {
    gpoaImg.style.display = "block"
    energyImg.style.display = "none"
    prImg.style.display = "none"
    waterImg.style.display = "none"
    econImg.style.display = "none"
}

// function when energy radio button is clicked
function energyClicked() {
    gpoaImg.style.display = "none"
    energyImg.style.display = "block"
    prImg.style.display = "none"
    waterImg.style.display = "none"
    econImg.style.display = "none"
}

// function when pr radio button is clicked
function prClicked() {
    gpoaImg.style.display = "none"
    energyImg.style.display = "none"
    prImg.style.display = "block"
    waterImg.style.display = "none"
    econImg.style.display = "none"
}


// function when water radio button is clicked
function waterClicked() {
    gpoaImg.style.display = "none"
    energyImg.style.display = "none"
    prImg.style.display = "none"
    waterImg.style.display = "block"
    econImg.style.display = "none"
}

// function when water radio button is clicked
function econClicked() {
    gpoaImg.style.display = "none"
    energyImg.style.display = "none"
    prImg.style.display = "none"
    waterImg.style.display = "none"
    econImg.style.display = "block"
}